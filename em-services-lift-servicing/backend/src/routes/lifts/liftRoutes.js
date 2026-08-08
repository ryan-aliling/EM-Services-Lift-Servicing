const express = require('express');
const {
  listLifts,
  liftStats,
  getLift,
  createLift,
  updateLift,
  deleteLift,
  importLifts,
} = require('../../controllers/lifts/liftController');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Lift management (create/edit/delete/import) is Admin/Master only - the role matrix
// grants Staff no lift-management access at all.
const router = express.Router();

router.get('/', requireAuth, listLifts);
router.get('/stats', requireAuth, liftStats);
router.post('/import', requireAuth, requireRole('Admin', 'Master'), importLifts);
router.get('/:id', requireAuth, getLift);
router.post('/', requireAuth, requireRole('Admin', 'Master'), createLift);
router.put('/:id', requireAuth, requireRole('Admin', 'Master'), updateLift);
router.delete('/:id', requireAuth, requireRole('Admin', 'Master'), deleteLift);

module.exports = router;
