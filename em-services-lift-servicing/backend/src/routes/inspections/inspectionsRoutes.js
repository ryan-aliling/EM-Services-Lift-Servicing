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
const { requireAuth, requireRole } = require('../../middleware/auth');

// Create/edit: any authenticated role, including Staff - but a Staff caller is restricted
// to a schedule assigned to them (or no schedule link at all), enforced inside
// createInspection/updateInspection themselves, not here (see inspectionController.js).
// notify-contractor and delete are formal/destructive EM-staff actions - Admin/Master only;
// Staff notifies contractors manually outside the app.
const router = express.Router();

router.get('/', requireAuth, listInspections);
router.get('/stats', requireAuth, inspectionStats);
router.get('/:id', requireAuth, getInspection);
router.post('/', requireAuth, createInspection);
router.put('/:id', requireAuth, updateInspection);
router.patch('/:id/notify-contractor', requireAuth, requireRole('Admin', 'Master'), notifyContractor);
router.delete('/:id', requireAuth, requireRole('Admin', 'Master'), deleteInspection);

module.exports = router;
