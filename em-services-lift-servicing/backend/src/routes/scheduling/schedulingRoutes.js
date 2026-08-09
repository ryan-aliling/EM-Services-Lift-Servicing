const express = require('express');
const {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  importSchedules,
} = require('../../controllers/scheduling/schedulingController');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();

// Reads: any authenticated role. listSchedules/getSchedule scope to the caller's own
// assigned schedules internally when the caller is Staff (see schedulingController.js).
router.get('/', requireAuth, listSchedules);
router.get('/:id', requireAuth, getSchedule);

// Create/import/delete: Admin/Master only - Staff cannot create, reassign or remove schedules.
router.post('/import', requireAuth, requireRole('Admin', 'Master'), importSchedules);
router.post('/', requireAuth, requireRole('Admin', 'Master'), createSchedule);

// Update: any authenticated role reaches the controller, but a Staff caller is restricted
// to changing only the `status` field on their own assigned schedule (enforced in
// updateSchedule itself, not here - see schedulingController.js).
router.put('/:id', requireAuth, updateSchedule);

router.delete('/:id', requireAuth, requireRole('Admin', 'Master'), deleteSchedule);

module.exports = router;
