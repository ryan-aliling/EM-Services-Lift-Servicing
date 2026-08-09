const Lift = require('../../models/lifts/Lift');
const Schedule = require('../../models/scheduling/Schedule');
const Inspection = require('../../models/inspections/Inspection');
const Defect = require('../../models/defects/Defect');
const Rectification = require('../../models/rectifications/Rectification');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');

// Tier-1 audit log: a read-only activity feed built entirely from data every model
// already tracks (createdAt/updatedAt, isDeleted) rather than a new event-sourcing
// collection. No schema changes, no new entity in the ER diagram - this is a view over
// the five existing feature collections, merged and sorted by recency. See
// design/architecture.md for the fuller writeup of why this is intentionally the
// lightweight option.
const VALID_TYPES = ['Lift', 'Schedule', 'Inspection', 'Defect', 'Rectification'];
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 300;

// Heuristic, not a stored fact: none of these models record who made a change or a
// history of prior states, so "what happened" is inferred from timestamps alone.
// createdAt === updatedAt (down to the millisecond, which Mongoose sets identically on
// insert) means nothing has touched the document since it was created.
function deriveAction(doc) {
  if (doc.isDeleted) return 'Deleted';
  if (doc.createdAt.getTime() === doc.updatedAt.getTime()) return 'Created';
  return 'Updated';
}

// Every fetcher below deliberately does NOT filter isDeleted: false - unlike every other
// list endpoint in the app, a deletion is exactly the kind of event an audit log exists
// to surface, not hide.
async function fetchLiftActivity(limit) {
  const docs = await Lift.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: d._id,
    type: 'Lift',
    label: `${d.liftCode} — ${d.block}/${d.unit}`,
    status: d.status,
    action: deriveAction(d),
    timestamp: d.updatedAt,
  }));
}

async function fetchScheduleActivity(limit) {
  const docs = await Schedule.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: d._id,
    type: 'Schedule',
    label: `${d.liftCompany} spot-check — ${d.blockAddress}`,
    status: d.status,
    action: deriveAction(d),
    timestamp: d.updatedAt,
  }));
}

async function fetchInspectionActivity(limit) {
  const docs = await Inspection.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: d._id,
    type: 'Inspection',
    label: `${d.reportNo} — ${d.liftCode}`,
    status: d.overallStatus,
    action: deriveAction(d),
    timestamp: d.updatedAt,
  }));
}

async function fetchDefectActivity(limit) {
  const docs = await Defect.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: d._id,
    type: 'Defect',
    label: `${d.defectNo} — ${d.title}`,
    status: d.status,
    action: deriveAction(d),
    timestamp: d.updatedAt,
  }));
}

async function fetchRectificationActivity(limit) {
  const docs = await Rectification.find({})
    .sort({ updatedAt: -1 })
    .limit(limit)
    .populate('defectId', 'defectNo')
    .lean();
  return docs.map((d) => ({
    id: d._id,
    type: 'Rectification',
    // defectId can be null if the defect it closes out was hard-deleted before this
    // field existed, or the populate target no longer resolves for any other reason.
    label: `Rectification for ${d.defectId?.defectNo || 'a deleted defect'}`,
    status: d.status,
    action: deriveAction(d),
    timestamp: d.updatedAt,
  }));
}

const FETCHERS = {
  Lift: fetchLiftActivity,
  Schedule: fetchScheduleActivity,
  Inspection: fetchInspectionActivity,
  Defect: fetchDefectActivity,
  Rectification: fetchRectificationActivity,
};

const listAuditLog = asyncHandler(async (req, res) => {
  const { type, limit } = req.query;

  const requestedTypes = type ? type.split(',').map((t) => t.trim()).filter(Boolean) : VALID_TYPES;
  const invalidTypes = requestedTypes.filter((t) => !VALID_TYPES.includes(t));
  if (invalidTypes.length) {
    throw ApiError.badRequest(`Invalid type(s): ${invalidTypes.join(', ')}. Valid types: ${VALID_TYPES.join(', ')}`);
  }

  const overallLimit = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || DEFAULT_LIMIT));

  // Each fetcher only needs to return its own top `overallLimit` (sorted desc) for the
  // merge to be correct - the true top `overallLimit` across all types can never include
  // an item ranked beyond `overallLimit` within its own type.
  const results = await Promise.all(requestedTypes.map((t) => FETCHERS[t](overallLimit)));

  const merged = results
    .flat()
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, overallLimit);

  ok(res, merged);
});

module.exports = { listAuditLog };
