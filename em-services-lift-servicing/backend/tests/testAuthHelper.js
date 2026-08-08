// Shared helper for every test suite that mounts a router now gated by requireAuth/
// requireRole (backend/src/middleware/auth.js). Every test file that uses this must set
// process.env.JWT_SECRET (e.g. 'test-secret') at the very top, before requiring anything -
// the middleware reads it at request time, not at import time, but jwt.sign() below needs
// it too.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/users/User');

let counter = 0;

// Creates a real User document (not just a signed token) so requireAuth's per-request
// `User.findOne({_id, isDeleted:false})` lookup succeeds - a token for a user that doesn't
// exist in the DB is rejected the same as an invalid one.
async function createTestUser(role, overrides = {}) {
  counter += 1;
  const passwordHash = await bcrypt.hash('Passw0rd!', 10);
  return User.create({
    name: `Test ${role} ${counter}`,
    email: `${role.toLowerCase()}-${counter}@test.local`,
    passwordHash,
    role,
    ...overrides,
  });
}

// Signs a token with the same payload shape as src/utils/jwt.js's signToken - kept as a
// separate literal here (rather than requiring that module) so this helper has no
// dependency on the app's internals beyond the User model and the shared JWT_SECRET.
function authHeader(user) {
  const token = jwt.sign(
    { userId: String(user._id), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  return `Bearer ${token}`;
}

module.exports = { createTestUser, authHeader };
