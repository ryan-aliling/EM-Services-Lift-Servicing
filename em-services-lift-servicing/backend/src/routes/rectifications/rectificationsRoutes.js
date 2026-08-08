const express = require('express');
const {
  listRectifications,
  getRectification,
  createRectification,
  updateRectification,
  endorseRectification,
  deleteRectification,
} = require('../../controllers/rectifications/rectificationController');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Create/submit/edit: any authenticated role, including Staff. Endorse is Admin/Master
// only, under all circumstances - Staff can never call it, per the role matrix. Delete is
// also Admin/Master only, same posture as every other destructive action in this app.
const router = express.Router();

router.get('/', requireAuth, listRectifications);
router.get('/:id', requireAuth, getRectification);
router.post('/', requireAuth, createRectification);
router.put('/:id', requireAuth, updateRectification);
router.patch('/:id/endorse', requireAuth, requireRole('Admin', 'Master'), endorseRectification);
router.delete('/:id', requireAuth, requireRole('Admin', 'Master'), deleteRectification);

module.exports = router;
