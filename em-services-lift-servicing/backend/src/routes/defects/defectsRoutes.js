const express = require('express');
const {
  listDefects,
  defectStats,
  getDefect,
  createDefect,
  updateDefect,
  deleteDefect,
} = require('../../controllers/defects/defectController');

// TODO: re-add requireAuth / requireRole('Admin', 'Manager') on write routes once a
// login system exists and issues JWTs with a `role` claim (same TODO as liftRoutes.js).
const router = express.Router();

router.get('/', listDefects);
router.get('/stats', defectStats); // must come before /:id or "stats" gets treated as an id
router.get('/:id', getDefect);
router.post('/', createDefect);
router.put('/:id', updateDefect);
router.delete('/:id', deleteDefect);

module.exports = router;