const Lift = require('../../models/lifts/Lift');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

const REQUIRED_FIELDS = ['liftCode', 'block', 'unit', 'type', 'capacity'];

function assertRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
}

// Both dates are optional, so this only fires once both are actually known - either
// straight from the request, or (on update) the existing document's stored value for
// whichever one this request didn't touch.
function assertServiceDateOrder(installDate, lastServiced) {
  if (!installDate || !lastServiced) return;
  if (new Date(lastServiced) < new Date(installDate)) {
    throw ApiError.badRequest('Last serviced date cannot be before the install date');
  }
}

const listLifts = asyncHandler(async (req, res) => {
  const { status, type, q } = req.query;
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ liftCode: regex }, { block: regex }, { unit: regex }, { manufacturer: regex }];
  }

  const lifts = await Lift.find(filter).sort({ createdAt: -1 });
  ok(res, lifts);
});

const liftStats = asyncHandler(async (req, res) => {
  const [total, active, maintenance, outOfService, decommissioned] = await Promise.all([
    Lift.countDocuments({ isDeleted: false }),
    Lift.countDocuments({ isDeleted: false, status: 'Active' }),
    Lift.countDocuments({ isDeleted: false, status: 'Maintenance' }),
    Lift.countDocuments({ isDeleted: false, status: 'Out of Service' }),
    Lift.countDocuments({ isDeleted: false, status: 'Decommissioned' }),
  ]);
  ok(res, { total, active, maintenance, outOfService, decommissioned });
});

const getLift = asyncHandler(async (req, res) => {
  const lift = await Lift.findOne({ _id: req.params.id, isDeleted: false });
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, lift);
});

const createLift = asyncHandler(async (req, res) => {
  assertRequiredFields(req.body);
  assertServiceDateOrder(req.body.installDate, req.body.lastServiced);
  let lift;
  try {
    lift = await Lift.create(req.body);
  } catch (err) {
    if (err.code === 11000) throw ApiError.badRequest(`Lift code "${req.body.liftCode}" already exists`);
    throw err;
  }
  ok(res, lift, 'Lift created', 201);
});

const updateLift = asyncHandler(async (req, res) => {
  // Need the existing document whenever only one of the two dates is being changed -
  // otherwise there's nothing to compare a lone updated field against.
  if ('installDate' in req.body || 'lastServiced' in req.body) {
    const existing = await Lift.findOne({ _id: req.params.id, isDeleted: false }, 'installDate lastServiced');
    if (existing) {
      const effectiveInstall = 'installDate' in req.body ? req.body.installDate : existing.installDate;
      const effectiveServiced = 'lastServiced' in req.body ? req.body.lastServiced : existing.lastServiced;
      assertServiceDateOrder(effectiveInstall, effectiveServiced);
    }
  }

  let lift;
  try {
    lift = await Lift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
  } catch (err) {
    if (err.code === 11000) throw ApiError.badRequest(`Lift code "${req.body.liftCode}" already exists`);
    throw err;
  }
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, lift, 'Lift updated');
});

const deleteLift = asyncHandler(async (req, res) => {
  // Soft delete - matches every other model in the app, so the audit trail (and any
  // Schedule/Inspection/Defect that snapshot this lift's liftCode/block) survives the
  // delete. The isDeleted: false in the query means deleting an already-deleted lift
  // correctly 404s instead of silently "succeeding" again.
  const lift = await Lift.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true }
  );
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, null, 'Lift deleted');
});

// Bulk-creates lifts from CSV rows already parsed into plain objects on the frontend
// (see frontend/src/utils/csvImport.js). Rows are created one at a time — rather than
// Lift.insertMany — so a bad row (missing field, duplicate liftCode) doesn't abort the
// whole batch and we can report exactly which row failed and why.
const importLifts = asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest('No rows to import');
  }

  const failed = [];
  let created = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      assertRequiredFields(row);
      assertServiceDateOrder(row.installDate, row.lastServiced);
      await Lift.create(row);
      created += 1;
    } catch (err) {
      const message = err.code === 11000 ? `Lift code "${row.liftCode}" already exists` : err.message;
      // +2: row 0 is the first data row, and the CSV header itself takes line 1.
      failed.push({ row: i + 2, liftCode: row.liftCode || '', message });
    }
  }

  ok(res, { created, failed }, `Imported ${created} of ${rows.length} lift(s)`);
});

module.exports = { listLifts, liftStats, getLift, createLift, updateLift, deleteLift, importLifts };
