const Schedule = require('../../models/scheduling/Schedule');
const { ok } = require('../../utils/apiResponse');
const { cascadeFromSchedule } = require('../../utils/cascadeDelete');

// GET /api/scheduling
// Supports optional ?status=Scheduled, ?date=2026-08-06 and ?liftId=<id> filters so the
// frontend can drive "what's due" views and lift-scoped views without extra endpoints.
async function listSchedules(req, res) {
  try {
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

    const schedules = await Schedule.find(filter).sort({ scheduledDate: 1 });
    ok(res, schedules);
  } catch (err) {
    console.error('listSchedules error:', err);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
}

// GET /api/scheduling/:id
async function getSchedule(req, res) {
  try {
    const schedule = await Schedule.findOne({ _id: req.params.id, isDeleted: false });
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    ok(res, schedule);
  } catch (err) {
    console.error('getSchedule error:', err);
    res.status(400).json({ error: 'Invalid schedule id' });
  }
}

// POST /api/scheduling
async function createSchedule(req, res) {
  try {
    const { townCouncil, liftCompany, blockAddress, scheduledDate, assignedInspector, notes, liftId } = req.body;

    if (!townCouncil || !liftCompany || !blockAddress || !scheduledDate) {
      return res.status(400).json({
        error: 'townCouncil, liftCompany, blockAddress and scheduledDate are required',
      });
    }

    const schedule = await Schedule.create({
      townCouncil,
      liftCompany,
      blockAddress,
      scheduledDate,
      assignedInspector,
      notes,
      liftId: liftId || null,
    });

    ok(res, schedule, 'Schedule created', 201);
  } catch (err) {
    console.error('createSchedule error:', err);
    res.status(400).json({ error: 'Failed to create schedule' });
  }
}

// PUT /api/scheduling/:id
// Handles both field edits and status transitions (Scheduled -> Assigned -> ...)
// from the same endpoint so the frontend can PATCH-like update with a partial body.
async function updateSchedule(req, res) {
  try {
    const updates = { ...req.body };

    if (updates.status && !Schedule.STATUS_VALUES.includes(updates.status)) {
      return res.status(400).json({ error: `status must be one of ${Schedule.STATUS_VALUES.join(', ')}` });
    }

    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      updates,
      { new: true, runValidators: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    ok(res, schedule);
  } catch (err) {
    console.error('updateSchedule error:', err);
    res.status(400).json({ error: 'Failed to update schedule' });
  }
}

// DELETE /api/scheduling/:id  (soft delete — keeps audit trail per data-integrity feedback)
// Cascades: soft-deleting a schedule also soft-deletes every inspection that followed up
// on it, and in turn every defect/rectification those inspections led to - a schedule is
// the root of the workflow chain, so removing it should remove what it produced instead
// of leaving orphaned downstream records behind (see utils/cascadeDelete.js).
async function deleteSchedule(req, res) {
  try {
    const schedule = await Schedule.findOneAndUpdate(
      { _id: req.params.id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const cascaded = await cascadeFromSchedule(schedule._id);
    ok(res, { id: schedule._id, cascaded }, 'Schedule deleted');
  } catch (err) {
    console.error('deleteSchedule error:', err);
    res.status(400).json({ error: 'Failed to delete schedule' });
  }
}

module.exports = {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};