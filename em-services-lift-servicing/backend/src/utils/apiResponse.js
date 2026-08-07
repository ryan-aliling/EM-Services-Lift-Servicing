// Sends a consistent success envelope: { success, message, data }.
function ok(res, data, message = 'OK', statusCode = 200) {
  res.status(statusCode).json({ success: true, message, data });
}

module.exports = { ok };
