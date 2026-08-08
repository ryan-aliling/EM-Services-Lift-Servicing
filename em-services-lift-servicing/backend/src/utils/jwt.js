// Single place both authController (signing) and middleware/auth.js (verifying) import
// from, so the token payload shape only ever exists in one place.
const jwt = require('jsonwebtoken');

// 8h flat expiry, no refresh token / rotation - kept deliberately simple for this app's
// size. process.env.JWT_SECRET is guaranteed to be set - server.js fails fast at boot if
// it's missing, rather than falling back to a guessable default.
function signToken(user) {
  return jwt.sign(
    { userId: String(user._id), role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

// Throws (jwt.verify's own error) on a missing/invalid/expired token - callers catch it.
function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
