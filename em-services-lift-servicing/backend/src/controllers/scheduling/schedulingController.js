const Schedule = require('../../models/scheduling/Schedule');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const { cascadeFromSchedule } = require('../../utils/cascadeDelete');

// Converted to the asyncHandler/ApiError pattern (from raw try/catch + res.status().json)
// as part of adding RBAC here - brings the error shape in line with every other controller
// ({success:false,message} instead of {error:'...'}), which the frontend's
// err.response?.data?.message reads already expect.

// GET /api/scheduling
// Supports optional ?status=Scheduled, ?date=2026-08-06 and ?liftId=<id> filters so the
// frontend can drive "what's due" views and lift-scoped views without extra endpoints.
// Staff callers are additionally scoped to only their own assigned schedules - Admin/Master
// see everything, unfiltered by this dimension.
const listSchedules = asyncHandler(async (req, res) => {
  const { status, date, liftId } = req.query;
  const filter = { isDeleted: false };

  if (status) {
    filter.status = status;
  }

  if (liftId) {
    filter.liftId = liftId;
  }

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    filter.scheduledDate = { $gte: start, $lt: end };
  }

  if (req.user.role === 'Staff') {
    filter.assignedStaffId = req.user._id;
  }

  const schedules = await Schedule.find(filter).sort({ scheduledDate: 1 });
  ok(res, schedules);
});

// GET /api/scheduling/:id
// A Staff user gets a 404 (not 403) for a schedule not assigned to them - same as
// "not found" rather than revealing that a schedule exists but isn't theirs. Without this,
// a Staff user could bypass the list-level scoping above by guessing/copying another
// schedule's id directly.
const getSchedule = asyncHandler(async (req, res) => {
  let schedule;
  try {
    schedule = await Schedule.findOne({ _id: req.params.id, isDeleted: false });
  } catch (err) {
    // Malformed id (fails to cast to an ObjectId) is a 400, distinct from a well-formed but
    // unknown id (404 below) - same distinction the original try/catch made.
    throw ApiError.badRequest('Invalid schedule id');
  }
  if (!schedule) throw ApiError.notFound('Schedule not found');

  if (req.user.role === 'Staff' && String(schedule.assignedStaffId) !== String(req.user._id)) {
    throw ApiError.notFound('Schedule not found');
  }

  ok(res, schedule);
});

// POST /api/scheduling
// Route-level requireRole('Admin','Master') already keeps Staff out entirely - no
// role-branching needed here.
const createSchedule = asyncHandler(async (req, res) => {
  const { townCouncil, liftCompany, blockAddress, scheduledDate, assignedInspector, assignedStaffId, notes, liftId } =
    req.body;

  if (!townCouncil || !liftCompany || !blockAddress || !scheduledDate) {
    throw ApiError.badRequest('townCouncil, liftCompany, blockAddress and scheduledDate are required');
  }

  const schedule = await Schedule.create({
    townCouncil,
    liftCompany,
    blockAddress,
    scheduledDate,
    assignedInspector,
    assignedStaffId: assignedStaffId || null,
    notes,
    liftId: liftId || null,
  });

  ok(res, schedule, 'Schedule created', 201);
});

// PUT /api/scheduling/:id
// Handles both field edits and status transitions (Scheduled -> Assigned -> ...) from the
// same endpoint so the frontend can PATCH-like update with a partial body.
// Admin/Master: full-field update, same as before. Staff: only allowed on their own
// assigned schedule, and only the `status` field may be present in the body - any other
// key is rejected outright.
const updateSchedule = asyncHandler(async (req, res) => {
  let existing;
  try {
    existing = await Schedule.findOne({ _id: req.params.id, isDeleted: false });
  } catch (err) {
    throw ApiError.badRequest('Invalid schedule id');
  }
  if (!existing) throw ApiError.notFound('Schedule not found');

  let updates;
  if (req.user.role === 'Staff') {
    if (String(existing.assignedStaffId) !== String(req.user._id)) {
      throw ApiError.notFound('Schedule not found');
    }

    const disallowedKeys = Object.keys(req.body).filter((key) => key !== 'status');
    if (disallowedKeys.length) {
      throw ApiError.forbidden(`Staff can only update the status field (rejected: ${disallowedKeys.join(', ')})`);
    }

    updates = { status: req.body.status };
  } else {
    updates = { ...req.body };
  }

  if (updates.status && !Schedule.STATUS_VALUES.includes(updates.status)) {
    throw ApiError.badRequest(`status must be one of ${Schedule.STATUS_VALUES.join(', ')}`);
  }

  const schedule = await Schedule.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, updates, {
    new: true,
    runValidators: true,
  });

  if (!schedule) throw ApiError.notFound('Schedule not found');

  ok(res, schedule);
});

// DELETE /api/scheduling/:id  (soft delete — keeps audit trail per data-integrity feedback)
// Cascades: soft-deleting a schedule also soft-deletes every inspection that followed up
// on it, and in turn every defect/rectification those inspections led to - a schedule is
// the root of the workflow chain, so removing it should remove what it produced instead
// of leaving orphaned downstream records behind (see utils/cascadeDelete.js).
// Route-level requireRole('Admin','Master') already keeps Staff out entirely.
const deleteSchedule = asyncHandler(async (req, res) => {
  let schedule;
  try {
    schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
  } catch (err) {
    throw ApiError.badRequest('Invalid schedule id');
  }

  if (!schedule) throw ApiError.notFound('Schedule not found');

  const cascaded = await cascadeFromSchedule(schedule._id);
  ok(res, { id: schedule._id, cascaded }, 'Schedule deleted');
});

module.exports = {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
