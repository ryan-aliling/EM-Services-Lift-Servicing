const express = require('express');
const {
  listRectifications,
  getRectification,
  createRectification,
  updateRectification,
  endorseRectification,
  deleteRectification,
} = require('../../controllers/rectifications/rectificationController');

// TODO: re-add requireAuth / requireRole('Admin', 'Manager') on write routes, and restrict
// the endorse route to an EM-staff role specifically, once a login system exists (same TODO
// as liftRoutes.js / defectsRoutes.js).
const router = express.Router();

router.get('/', listRectifications);
router.get('/:id', getRectification);
router.post('/', createRectification);
router.put('/:id', updateRectification);
router.patch('/:id/endorse', endorseRectification); // must come before nothing else conflicting - :id/endorse is unambiguous
router.delete('/:id', deleteRectification);

module.exports = router;
