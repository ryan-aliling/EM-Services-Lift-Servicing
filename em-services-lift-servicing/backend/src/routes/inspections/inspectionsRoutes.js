const express = require('express');
const {
  listInspections,
  inspectionStats,
  getInspection,
  createInspection,
  updateInspection,
  notifyContractor,
  deleteInspection,
} = require('../../controllers/inspections/inspectionController');

// TODO: re-add requireAuth / requireRole('Admin', 'Manager') on write routes
// once a login system exists and issues JWTs with a `role` claim (see the
// matching TODO in backend/src/routes/lifts/liftRoutes.js).
const router = express.Router();

router.get('/', listInspections);
router.get('/stats', inspectionStats);
router.get('/:id', getInspection);
router.post('/', createInspection);
router.put('/:id', updateInspection);
router.patch('/:id/notify-contractor', notifyContractor);
router.delete('/:id', deleteInspection);

module.exports = router;
