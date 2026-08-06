const express = require('express');
const {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} = require('../../controllers/scheduling/schedulingController');

const router = express.Router();

router.get('/', listSchedules);
router.get('/:id', getSchedule);
router.post('/', createSchedule);
router.put('/:id', updateSchedule);
router.delete('/:id', deleteSchedule);

module.exports = router;