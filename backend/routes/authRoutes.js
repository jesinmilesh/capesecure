/**
 * Cape Secure Solutions — Authentication Routes
 */

const authCtrl = require('../controllers/authController');
const auth = require('../middleware/auth');

function getAuthUser(req, parsedUrl) {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
  let token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';

  if (!token) {
    token = parsedUrl.searchParams.get('adminToken') || parsedUrl.searchParams.get('token');
  }

  if (!token) {
    return { authorized: false, status: 401, error: 'Authorization header or token is missing.' };
  }

  const verified = auth.verifySessionToken(token);
  if (!verified.valid) {
    return { authorized: false, status: 401, error: verified.error || 'Invalid session token.' };
  }

  const normalizedRole = (verified.user.role || '').toUpperCase();
  if (!['ADMIN', 'SUPER_ADMIN', 'STAFF'].includes(normalizedRole)) {
    return { authorized: false, status: 403, error: 'Forbidden: Insufficient privileges.' };
  }

  return { authorized: true, user: verified.user, token };
}

async function handleAuthRoutes(req, res, pathname, parsedUrl, body, clientIp) {
  // POST /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    await authCtrl.login(req, res, body, clientIp);
    return true;
  }

  // POST /api/auth/logout
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    authCtrl.logout(req, res, clientIp);
    return true;
  }

  // GET /api/auth/me
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const check = getAuthUser(req, parsedUrl);
    if (!check.authorized) {
      res.writeHead(check.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: check.error }));
      return true;
    }
    authCtrl.me(req, res, check.user);
    return true;
  }

  // POST /api/auth/refresh
  if (pathname === '/api/auth/refresh' && req.method === 'POST') {
    const check = getAuthUser(req, parsedUrl);
    if (!check.authorized) {
      res.writeHead(check.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: check.error }));
      return true;
    }
    authCtrl.refresh(req, res, check.user);
    return true;
  }

  return false;
}

module.exports = {
  handleAuthRoutes,
  getAuthUser
};
