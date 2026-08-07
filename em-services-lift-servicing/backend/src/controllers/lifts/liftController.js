const Lift = require('../../models/lifts/Lift');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

const REQUIRED_FIELDS = ['liftCode', 'block', 'unit', 'type', 'capacity'];

function assertRequiredFields(body) {
  const missing = REQUIRED_FIELDS.filter((field) => body[field] === undefined || body[field] === '');
  if (missing.length) throw ApiError.badRequest(`Missing required field(s): ${missing.join(', ')}`);
}

const listLifts = asyncHandler(async (req, res) => {
  const { status, type, q } = req.query;
  const filter = {};
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
    Lift.countDocuments(),
    Lift.countDocuments({ status: 'Active' }),
    Lift.countDocuments({ status: 'Maintenance' }),
    Lift.countDocuments({ status: 'Out of Service' }),
    Lift.countDocuments({ status: 'Decommissioned' }),
  ]);
  ok(res, { total, active, maintenance, outOfService, decommissioned });
});

const getLift = asyncHandler(async (req, res) => {
  const lift = await Lift.findById(req.params.id);
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, lift);
});

const createLift = asyncHandler(async (req, res) => {
  assertRequiredFields(req.body);
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
  const lift = await Lift.findByIdAndDelete(req.params.id);
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
