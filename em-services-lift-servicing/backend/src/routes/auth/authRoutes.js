const express = require('express');
const { login, me, register, createUser, listUsers, deactivateUser } = require('../../controllers/auth/authController');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', requireAuth, me);

// Account-creation eligibility (Master -> Admin/Staff, Admin -> Staff only) depends on the
// caller's own role, so it's checked inside createUser itself rather than via requireRole
// here - requireRole can only express "one of these roles", not "role X may only pass
// role Y in the body".
router.post('/users', requireAuth, createUser);
router.get('/users', requireAuth, requireRole('Master', 'Admin'), listUsers);
router.patch('/users/:id/deactivate', requireAuth, requireRole('Master', 'Admin'), deactivateUser);

module.exports = router;
