const bcrypt = require('bcryptjs');
const User = require('../../models/users/User');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const { signToken } = require('../../utils/jwt');

const SALT_ROUNDS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Min 8 chars, at least one letter and one number.
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function assertValidCredentials(email, password) {
  if (!EMAIL_RE.test(email)) throw ApiError.badRequest('Enter a valid email address');
  if (!PASSWORD_RE.test(password)) {
    throw ApiError.badRequest('Password must be at least 8 characters and include a letter and a number');
  }
}

function toPublicUser(user) {
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/login (public)
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw ApiError.badRequest('email and password are required');

  const user = await User.findOne({ email: String(email).toLowerCase(), isDeleted: false });
  // Same generic message whether the email doesn't exist or the password is wrong - never
  // reveal which one was the problem.
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  const token = signToken(user);
  ok(res, { token, user: toPublicUser(user) }, 'Login successful');
});

// GET /api/auth/me (requireAuth) - req.user is already a fresh lookup from this same
// request's requireAuth call, so no extra DB round-trip needed.
const me = asyncHandler(async (req, res) => {
  ok(res, { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role });
});

// POST /api/auth/users (requireAuth) - who's allowed to create what depends on the
// caller's own role, so that's checked here rather than via requireRole on the route.
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (req.user.role === 'Staff') {
    throw ApiError.forbidden('Staff cannot create accounts');
  }
  if (role === 'Master') {
    throw ApiError.forbidden('Master accounts cannot be created through this endpoint');
  }
  if (!User.ROLES.includes(role)) {
    throw ApiError.badRequest(`role must be one of ${User.ROLES.join(', ')}`);
  }
  if (req.user.role === 'Admin' && role !== 'Staff') {
    throw ApiError.forbidden('Admin can only create Staff accounts');
  }

  if (!name || !email || !password) {
    throw ApiError.badRequest('name, email and password are required');
  }
  assertValidCredentials(email, password);

  const normalizedEmail = String(email).toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.badRequest('An account with that email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role,
    createdBy: req.user._id,
  });

  ok(res, toPublicUser(user), 'Account created', 201);
});

// GET /api/auth/users (requireAuth, requireRole('Master','Admin'))
const listUsers = asyncHandler(async (req, res) => {
  const filter = { isDeleted: false };
  // Admin only ever sees Staff accounts, never other Admins or Master.
  if (req.user.role === 'Admin') filter.role = 'Staff';

  const users = await User.find(filter, 'name email role createdBy createdAt').sort({ name: 1 });
  ok(res, users);
});

// PATCH /api/auth/users/:id/deactivate (requireAuth, requireRole('Master','Admin'))
const deactivateUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw ApiError.badRequest('Cannot deactivate your own account');
  }

  const target = await User.findOne({ _id: req.params.id, isDeleted: false });
  if (!target) throw ApiError.notFound('Account not found');

  if (req.user.role === 'Admin' && target.role !== 'Staff') {
    throw ApiError.forbidden('Admin can only deactivate Staff accounts');
  }

  target.isDeleted = true;
  await target.save();
  ok(res, { id: target._id }, 'Account deactivated');
});

// POST /api/auth/register (public) - self-service signup, always Staff role. Never lets the
// caller pick a role (unlike createUser) so this can't be used to self-provision Admin/Master.
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw ApiError.badRequest('name, email and password are required');
  assertValidCredentials(email, password);

  const normalizedEmail = String(email).toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) throw ApiError.badRequest('An account with that email already exists');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email: normalizedEmail, passwordHash, role: 'Staff' });

  ok(res, toPublicUser(user), 'Account created', 201);
});

module.exports = { login, me, register, createUser, listUsers, deactivateUser };
