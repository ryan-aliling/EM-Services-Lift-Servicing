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

// TODO: re-add requireAuth / requireRole('Admin', 'Manager') on write routes
// once a login system exists and issues JWTs with a `role` claim.
const router = express.Router();

router.get('/', listLifts);
router.get('/stats', liftStats);
router.post('/import', importLifts);
router.get('/:id', getLift);
router.post('/', createLift);
router.put('/:id', updateLift);
router.delete('/:id', deleteLift);

module.exports = router;
