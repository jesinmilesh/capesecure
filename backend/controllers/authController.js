/**
 * Cape Secure Solutions — Authentication Controller
 * Handles administrative login, token issuance, verification, and logout.
 */

const auth = require('../middleware/auth');
const db = require('../models/db');
const { validateLoginInput } = require('../validators/authValidator');
const { setSecurityHeaders } = require('../middleware/security');

function sendJson(res, statusCode, data) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function login(req, res, body, clientIp) {
  const validation = validateLoginInput(body);
  if (!validation.valid) {
    return sendJson(res, 400, { success: false, message: validation.errors[0] });
  }

  const { email, password } = validation.data;
  const result = auth.authenticateAdmin(email, password, clientIp);

  if (!result.success) {
    db.recordAuditLog('ADMIN_LOGIN_FAILED', 'AUTH', { email, ip: clientIp, reason: result.message }, 'system');
    return sendJson(res, result.status || 401, { success: false, message: result.message });
  }

  db.recordAuditLog('ADMIN_LOGIN_SUCCESS', 'AUTH', { email, ip: clientIp }, result.user.email);

  return sendJson(res, 200, {
    success: true,
    token: result.token,
    user: result.user,
    message: 'Authentication successful.'
  });
}

function logout(req, res, clientIp) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (token) {
    auth.revokeSessionToken(token);
    db.recordAuditLog('ADMIN_LOGOUT', 'AUTH', { ip: clientIp }, 'admin');
  }

  return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
}

function me(req, res, user) {
  return sendJson(res, 200, { success: true, user });
}

function refresh(req, res, user) {
  const newToken = auth.generateSessionToken(user);
  return sendJson(res, 200, { success: true, token: newToken, user });
}

module.exports = {
  login,
  logout,
  me,
  refresh
};
