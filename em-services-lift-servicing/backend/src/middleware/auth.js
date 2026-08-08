// requireAuth / requireRole - the two pieces every write-protected route in this app
// chains onto, replacing the standing "re-add requireAuth / requireRole once a login
// system exists" TODOs that used to sit in each route file.
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/users/User');

// Verifies the Bearer token AND re-checks the user still exists / hasn't been deactivated
// on every single request (not just at login) - this is what makes deactivating an account
// (isDeleted: true) take effect on that user's very next call instead of waiting out the
// remaining lifetime of an already-issued 8h token.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or invalid Authorization header');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findOne({ _id: payload.userId, isDeleted: false }).catch(() => null);
  if (!user) throw ApiError.unauthorized('Account no longer exists or has been deactivated');

  req.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
  next();
});

// requireRole(...roles) - synchronous, no DB access needed (requireAuth already resolved
// req.user), so no asyncHandler wrapper: Express 4 forwards a synchronous throw inside
// middleware to the error handler the same way it does for any synchronous controller code
// already in this repo.
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(`This action requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
