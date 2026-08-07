const Inspection = require('../../models/inspections/Inspection');
const Lift = require('../../models/lifts/Lift');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

const REQUIRED_FIELDS = ['liftId', 'inspectionDate', 'inspectorName'];

function assertRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
}

// Inspection dates can't be in the future - the inspection has to have already happened
// for a report to exist about it.
function assertNotFutureDate(dateStr) {
  if (!dateStr) return;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (new Date(dateStr).getTime() > endOfToday.getTime()) {
    throw ApiError.badRequest('Inspection date cannot be in the future');
  }
}

// Report numbers are derived from the current max in the collection rather than a
// never-decreasing counter, so deleting e.g. INSP-0005 and creating a new report
// reissues INSP-0005 instead of jumping to INSP-0006.
async function nextReportNo() {
  const docs = await Inspection.find({}, 'reportNo').lean();
  const nums = docs
    .map((d) => parseInt(String(d.reportNo).split('-')[1], 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `INSP-${String(max + 1).padStart(4, '0')}`;
}

function deriveCompliance(defects = []) {
  return defects.length ? 'Defect Found' : 'Pass';
}

// Looks up the lift and returns the fields to snapshot onto the inspection - throws if the
// id doesn't resolve to a real lift, so a report can never be created against a lift that
// doesn't exist.
async function resolveLiftSnapshot(liftId) {
  const lift = await Lift.findById(liftId).catch(() => null);
  if (!lift) throw ApiError.badRequest('Selected lift not found');
  return { liftCode: lift.liftCode, block: lift.block };
}

const listInspections = asyncHandler(async (req, res) => {
  const { status, q } = req.query;
  const filter = {};

  // status can be a single value or a comma-separated list (multi-select filter)
  if (status) {
    const statuses = Array.isArray(status) ? status : String(status).split(',').filter(Boolean);
    if (statuses.length) filter.overallStatus = { $in: statuses };
  }

  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ reportNo: regex }, { liftCode: regex }, { block: regex }, { contractor: regex }, { inspectorName: regex }];
  }

  const inspections = await Inspection.find(filter).sort({ inspectionDate: -1 });
  ok(res, inspections);
});

const inspectionStats = asyncHandler(async (req, res) => {
  const [total, draft, submitted, underReview, closed, withDefects, criticalOpen] = await Promise.all([
    Inspection.countDocuments(),
    Inspection.countDocuments({ overallStatus: 'Draft' }),
    Inspection.countDocuments({ overallStatus: 'Submitted' }),
    Inspection.countDocuments({ overallStatus: 'Under Review' }),
    Inspection.countDocuments({ overallStatus: 'Closed' }),
    Inspection.countDocuments({ 'defects.0': { $exists: true } }),
    Inspection.countDocuments({ defects: { $elemMatch: { severity: 'Critical', status: { $ne: 'Verified' } } } }),
  ]);
  ok(res, { total, draft, submitted: submitted + underReview, closed, withDefects, criticalOpen });
});

const getInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw ApiError.notFound('Inspection report not found');
  ok(res, inspection);
});

const createInspection = asyncHandler(async (req, res) => {
  assertRequiredFields(req.body);
  assertNotFutureDate(req.body.inspectionDate);

  const reportNo = await nextReportNo();
  const { liftCode, block } = await resolveLiftSnapshot(req.body.liftId);
  const defects = req.body.defects || [];

  const inspection = await Inspection.create({
    ...req.body,
    reportNo,
    liftCode,
    block,
    scheduleId: req.body.scheduleId || null,
    compliance: req.body.compliance || deriveCompliance(defects),
    overallStatus: req.body.overallStatus || 'Draft',
  });

  ok(res, inspection, 'Inspection report created', 201);
});

const updateInspection = asyncHandler(async (req, res) => {
  const existing = await Inspection.findById(req.params.id);
  if (!existing) throw ApiError.notFound('Inspection report not found');

  // Once a report leaves Draft it's locked for audit purposes - this mirrors the
  // "can't edit after submitting" rule enforced client-side too, so it can't be
  // bypassed by calling the API directly.
  if (existing.overallStatus !== 'Draft') {
    throw ApiError.badRequest('Only draft reports can be edited. This report has already been submitted.');
  }

  if (req.body.inspectionDate) assertNotFutureDate(req.body.inspectionDate);

  const update = { ...req.body };
  if (update.defects) update.compliance = update.compliance || deriveCompliance(update.defects);

  // Re-snapshot liftCode/block if the inspector picked a different lift while still editing
  // a draft - the snapshot should always reflect whichever lift is actually selected.
  if (update.liftId && String(update.liftId) !== String(existing.liftId)) {
    const { liftCode, block } = await resolveLiftSnapshot(update.liftId);
    update.liftCode = liftCode;
    update.block = block;
  }

  const inspection = await Inspection.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  ok(res, inspection, 'Inspection report updated');
});

const notifyContractor = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw ApiError.notFound('Inspection report not found');

  if (inspection.defects.length === 0) {
    throw ApiError.badRequest('No defects logged on this report to notify the contractor about');
  }

  inspection.contractorNotifiedAt = new Date();
  inspection.defects = inspection.defects.map((d) => (d.status === 'Open' ? { ...d.toObject(), status: 'Acknowledged' } : d));
  inspection.overallStatus = 'Under Review';
  await inspection.save();

  ok(res, inspection, `Contractor notified for ${inspection.reportNo}`);
});

const deleteInspection = asyncHandler(async (req, res) => {
  const inspection = await Inspection.findById(req.params.id);
  if (!inspection) throw ApiError.notFound('Inspection report not found');

  if (inspection.overallStatus !== 'Draft') {
    throw ApiError.badRequest('Only draft reports can be deleted. Submitted reports are kept for audit purposes.');
  }

  await Inspection.findByIdAndDelete(req.params.id);
  ok(res, null, `${inspection.reportNo} deleted`);
});

module.exports = {
  listInspections,
  inspectionStats,
  getInspection,
  createInspection,
  updateInspection,
  notifyContractor,
  deleteInspection,
};
