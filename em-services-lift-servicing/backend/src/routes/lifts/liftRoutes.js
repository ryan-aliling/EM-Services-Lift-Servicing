const express = require('express');
const {
  listLifts,
  liftStats,
  getLift,
  createLift,
  updateLift,
  deleteLift,
} = require('../controllers/liftController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.get('/', listLifts);
router.get('/stats', liftStats);
router.get('/:id', getLift);
router.post('/', requireRole('Admin', 'Manager'), createLift);
router.put('/:id', requireRole('Admin', 'Manager'), updateLift);
router.delete('/:id', requireRole('Admin', 'Manager'), deleteLift);

module.exports = router;
