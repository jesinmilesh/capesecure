/**
 * Cape Secure Solutions — Unified Serverless API Handler
 * Consolidates all /api/* routes into a SINGLE serverless function to stay within
 * Vercel's Hobby (Free) tier limit of 12 serverless functions.
 */

const { URL } = require('url');
const { handlePublicRoutes } = require('../backend/routes/publicRoutes');
const { handleAuthRoutes } = require('../backend/routes/authRoutes');
const { handleAdminRoutes } = require('../backend/routes/adminRoutes');
const { setCorsHeaders, setSecurityHeaders } = require('../backend/middleware/security');
const auth = require('../backend/middleware/auth');

// Initialize default admin user if not present
auth.ensureDefaultAdmin();

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body) {
      if (typeof req.body === 'string') {
        try {
          return resolve(JSON.parse(req.body));
        } catch (e) {
          return resolve({});
        }
      }
      return resolve(req.body);
    }
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  const host = req.headers.host || 'capesecure.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const parsedUrl = new URL(req.url, `${proto}://${host}`);
  const pathname = parsedUrl.pathname;
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  const isPublicApi = pathname.startsWith('/api/public/') ||
    pathname === '/api/orders/create' ||
    pathname === '/api/send-sms' ||
    pathname === '/api/contact' ||
    pathname === '/api/health';

  // 1. Set CORS headers
  setCorsHeaders(req, res, isPublicApi);

  // 2. Preflight OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    // 3. Parse Body
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await parseBody(req);
    }

    // 4. Dispatch Public Routes
    if (await handlePublicRoutes(req, res, pathname, parsedUrl, body, clientIp)) return;

    // 5. Dispatch Auth Routes
    if (await handleAuthRoutes(req, res, pathname, parsedUrl, body, clientIp)) return;

    // 6. Dispatch Admin Routes
    if (await handleAdminRoutes(req, res, pathname, parsedUrl, body, clientIp)) return;

    // 7. Endpoint Not Found
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: `Endpoint '${pathname}' not found.` }));
  } catch (err) {
    console.error(`[API ERROR] ${req.method} ${pathname}:`, err);
    setSecurityHeaders(res);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, message: 'Internal server error.' }));
  }
};
