const Defect = require('../../models/defects/Defect');
const Lift = require('../../models/lifts/Lift');
const Inspection = require('../../models/inspections/Inspection');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const { cascadeFromDefects } = require('../../utils/cascadeDelete');

const REQUIRED_FIELDS = ['title', 'location', 'severity'];

// A defect can move forward through its normal lifecycle, or be reopened from Closed
// if the fix turns out not to have actually worked. It can't skip steps (e.g. Open
// straight to Resolved) - status changes go through PUT like any other field, but this
// map is checked whenever `status` is present in the request body.
const VALID_TRANSITIONS = {
  Open: ['In Progress', 'Closed'],
  'In Progress': ['Resolved', 'Open'],
  Resolved: ['Closed', 'In Progress'],
  Closed: ['Open'],
};

function assertRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
}

// Defect numbers are derived from the current max in the collection rather than a
// never-decreasing counter, so deleting e.g. DEF-0005 and creating a new defect
// reissues DEF-0005 instead of jumping to DEF-0006 (same approach as inspections'
// reportNo - see nextReportNo in inspectionController.js).
async function nextDefectNo() {
  const docs = await Defect.find({ isDeleted: false }, 'defectNo').lean();
  const nums = docs
    .map((d) => parseInt(String(d.defectNo).split('-')[1], 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `DEF-${String(max + 1).padStart(4, '0')}`;
}

// liftId is optional on a defect, but if one is supplied it has to resolve to a real
// lift - same rule the inspections module enforces (resolveLiftSnapshot).
async function resolveLiftSnapshot(liftId) {
  if (!liftId) return { liftCode: '' };
  const lift = await Lift.findOne({ _id: liftId, isDeleted: false }).catch(() => null);
  if (!lift) throw ApiError.badRequest('Selected lift not found');
  return { liftCode: lift.liftCode };
}

// inspectionId is optional (a defect can be logged independently of any report - e.g. a
// tenant complaint), but if one is supplied it has to resolve to a real, non-deleted
// Inspection, and that inspection's own liftId has to match the defect's liftId when both
// are given - so "this defect came from that report" can't silently point at the wrong
// lift. This is what makes the Defects step actually derive from the Inspections step
// instead of the two only coincidentally sharing terminology.
async function assertInspectionMatchesLift(inspectionId, liftId) {
  if (!inspectionId) return;
  const inspection = await Inspection.findOne({ _id: inspectionId, isDeleted: false }).catch(() => null);
  if (!inspection) throw ApiError.badRequest('Selected inspection report not found');
  if (liftId && String(inspection.liftId) !== String(liftId)) {
    throw ApiError.badRequest('Selected inspection report is for a different lift');
  }
  return inspection;
}

const listDefects = asyncHandler(async (req, res) => {
  const { status, severity, q, liftId } = req.query;
  const filter = { isDeleted: false };

  // status/severity can each be a single value or a comma-separated list, matching the
  // multi-select filter convention used by GET /api/inspections.
  if (status) {
    const statuses = Array.isArray(status) ? status : String(status).split(',').filter(Boolean);
    if (statuses.length) filter.status = { $in: statuses };
  }
  if (severity) {
    const severities = Array.isArray(severity) ? severity : String(severity).split(',').filter(Boolean);
    if (severities.length) filter.severity = { $in: severities };
  }
  if (liftId) {
    filter.liftId = liftId;
  }
  if (q) {
    const regex = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ defectNo: regex }, { title: regex }, { location: regex }, { liftCode: regex }];
  }

  const defects = await Defect.find(filter).sort({ reportedDate: -1 });
  ok(res, defects);
});

const defectStats = asyncHandler(async (req, res) => {
  const base = { isDeleted: false };
  const [total, open, inProgress, resolved, closed, criticalOpen] = await Promise.all([
    Defect.countDocuments(base),
    Defect.countDocuments({ ...base, status: 'Open' }),
    Defect.countDocuments({ ...base, status: 'In Progress' }),
    Defect.countDocuments({ ...base, status: 'Resolved' }),
    Defect.countDocuments({ ...base, status: 'Closed' }),
    Defect.countDocuments({ ...base, severity: 'Critical', status: { $ne: 'Closed' } }),
  ]);
  ok(res, { total, open, inProgress, resolved, closed, criticalOpen });
});

const getDefect = asyncHandler(async (req, res) => {
  const defect = await Defect.findOne({ _id: req.params.id, isDeleted: false });
  if (!defect) throw ApiError.notFound('Defect not found');
  ok(res, defect);
});

const createDefect = asyncHandler(async (req, res) => {
  assertRequiredFields(req.body);

  const defectNo = await nextDefectNo();
  const inspection = await assertInspectionMatchesLift(req.body.inspectionId, req.body.liftId);
  // When a defect is raised from a specific inspection report, default its lift to that
  // report's lift instead of requiring the caller to pass it twice.
  const liftId = req.body.liftId || inspection?.liftId || null;
  const { liftCode } = await resolveLiftSnapshot(liftId);

  const defect = await Defect.create({
    ...req.body,
    defectNo,
    liftId,
    liftCode,
    inspectionId: req.body.inspectionId || null,
    status: 'Open',
    resolvedDate: null,
  });
  ok(res, defect, 'Defect logged', 201);
});

// Full edit: any field (title, description, location, lift link, severity, reportedBy)
// can be corrected at any time - this is deliberately NOT locked by status the way
// inspection reports lock after Submitted, since the point is letting staff fix a
// wrong initial entry regardless of how far the defect has already progressed.
// A `status` change specifically still has to go through the transition map above.
const updateDefect = asyncHandler(async (req, res) => {
  const existing = await Defect.findOne({ _id: req.params.id, isDeleted: false });
  if (!existing) throw ApiError.notFound('Defect not found');

  const { status, liftId, title, location, severity, description, reportedBy } = req.body;

  if (status !== undefined && status !== existing.status) {
    const allowedNext = VALID_TRANSITIONS[existing.status] || [];
    if (!allowedNext.includes(status)) {
      throw ApiError.badRequest(
        `Cannot change status from "${existing.status}" to "${status}". Allowed next step(s): ${allowedNext.join(', ') || 'none'}`
      );
    }
    existing.status = status;
    if (status === 'Resolved' && !existing.resolvedDate) {
      existing.resolvedDate = new Date();
    }
  }

  if (liftId !== undefined) {
    const { liftCode } = await resolveLiftSnapshot(liftId);
    existing.liftId = liftId || null;
    existing.liftCode = liftCode;
  }
  if (title !== undefined) {
    if (!title.trim()) throw ApiError.badRequest('Title cannot be empty');
    existing.title = title;
  }
  if (location !== undefined) {
    if (!location.trim()) throw ApiError.badRequest('Location cannot be empty');
    existing.location = location;
  }
  if (severity !== undefined) existing.severity = severity;
  if (description !== undefined) existing.description = description;
  if (reportedBy !== undefined) existing.reportedBy = reportedBy;

  await existing.save();
  ok(res, existing, 'Defect updated');
});

// Soft delete (previously a hard delete) - so it can cascade without destroying the audit
// trail. Cascades to any Rectification against this defect (see utils/cascadeDelete.js).
const deleteDefect = asyncHandler(async (req, res) => {
  const defect = await Defect.findOne({ _id: req.params.id, isDeleted: false });
  if (!defect) throw ApiError.notFound('Defect not found');

  defect.isDeleted = true;
  await defect.save();
  const cascaded = await cascadeFromDefects([defect._id]);

  ok(res, { cascaded }, 'Defect deleted');
});

module.exports = {
  listDefects,
  defectStats,
  getDefect,
  createDefect,
  updateDefect,
  deleteDefect,
  VALID_TRANSITIONS,
};