const express = require('express');
const {
  listDefects,
  defectStats,
  getDefect,
  createDefect,
  updateDefect,
  deleteDefect,
} = require('../../controllers/defects/defectController');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Defects can be logged/edited freely by any authenticated role, including Staff, and are
// not restricted to lifts/schedules assigned to them - only delete is locked down, same
// posture as every other destructive action in this app.
const router = express.Router();

router.get('/', requireAuth, listDefects);
router.get('/stats', requireAuth, defectStats); // must come before /:id or "stats" gets treated as an id
router.get('/:id', requireAuth, getDefect);
router.post('/', requireAuth, createDefect);
router.put('/:id', requireAuth, updateDefect);
router.delete('/:id', requireAuth, requireRole('Admin', 'Master'), deleteDefect);

module.exports = router;
