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
  const lift = await Lift.create(req.body);
  ok(res, lift, 'Lift created', 201);
});

const updateLift = asyncHandler(async (req, res) => {
  const lift = await Lift.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, lift, 'Lift updated');
});

const deleteLift = asyncHandler(async (req, res) => {
  const lift = await Lift.findByIdAndDelete(req.params.id);
  if (!lift) throw ApiError.notFound('Lift not found');
  ok(res, null, 'Lift deleted');
});

module.exports = { listLifts, liftStats, getLift, createLift, updateLift, deleteLift };
