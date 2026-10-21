/**
 * Cape Secure Solutions — Production Application Server
 * 
 * Clean Target Architecture:
 * - Public Website (capesecure.vercel.app): Interacts ONLY with /api/public/*
 * - Admin Website (admin.capesecure.vercel.app): Interacts ONLY with /api/auth/* and /api/admin/*
 * - Authenticated Backend API: Business logic, validation, PDF, transactional email, SSE
 * - Database: Persistent atomic file storage / MongoDB Atlas, NEVER exposed directly to browser
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const envConfig = require('./config/env');
const auth = require('./middleware/auth');
const { setCorsHeaders, setSecurityHeaders } = require('./middleware/security');
const { handleError } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const { handlePublicRoutes } = require('./routes/publicRoutes');
const { handleAuthRoutes } = require('./routes/authRoutes');
const { handleAdminRoutes } = require('./routes/adminRoutes');

// Ensure default admin user is initialized in database
auth.ensureDefaultAdmin();

const PORT = envConfig.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

// Helper: Parse incoming JSON body with 100KB limit
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_SIZE = 100 * 1024;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        req.destroy();
        reject(new Error('PAYLOAD_TOO_LARGE'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'capesecure.vercel.app'}`);
  const pathname = parsedUrl.pathname;

  const isPublicApi = pathname.startsWith('/api/public/') ||
    pathname === '/api/orders/create' ||
    pathname === '/api/send-sms' ||
    pathname === '/api/contact' ||
    pathname === '/api/health';

  // Apply CORS
  setCorsHeaders(req, res, isPublicApi);

  // Preflight handler
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Intercept completion for structured logging
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    if (pathname.startsWith('/api/')) {
      logger.request(req, res.statusCode, durationMs, { ip: clientIp });
    }
  });

  try {
    // Parse body for POST / PUT / PATCH
    let body = {};
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      body = await parseBody(req);
    }

    // 1. Check Public Routes
    const handledPublic = await handlePublicRoutes(req, res, pathname, parsedUrl, body, clientIp);
    if (handledPublic) return;

    // 2. Check Auth Routes
    const handledAuth = await handleAuthRoutes(req, res, pathname, parsedUrl, body, clientIp);
    if (handledAuth) return;

    // 3. Check Admin Routes
    const handledAdmin = await handleAdminRoutes(req, res, pathname, parsedUrl, body, clientIp);
    if (handledAdmin) return;

    // 4. API 404 for unhandled API endpoints
    if (pathname.startsWith('/api/')) {
      setSecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, message: `API endpoint '${pathname}' not found.` }));
    }

    // 5. Admin directory in public app is forbidden (separation requirement)
    if (pathname === '/admin' || pathname === '/admin/' || pathname.startsWith('/admin/')) {
      setSecurityHeaders(res);
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 Not Found - Cape Secure Solutions</title></head>
        <body style="background:#03111f;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
          <h1 style="color:#00d9ff;">404 - Not Found</h1>
          <p style="color:#8aa7c2;">The requested page does not exist on this domain.</p>
          <a href="/" style="color:#f6b73c;text-decoration:none;">Return to Homepage</a>
        </body>
        </html>
      `);
    }

    // 6. Serve Public Static Assets
    let safePath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '\\') safePath = '/index.html';

    let filePath = path.join(PUBLIC_DIR, safePath);

    // If directory requested, append index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // If extension omitted, try .html
    if (!fs.existsSync(filePath) && !path.extname(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      setSecurityHeaders(res);
      if (ext === '.html') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.woff2'].includes(ext)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }

      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // 7. Fallback 404
    setSecurityHeaders(res);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html>
      <head><title>404 Not Found - Cape Secure Solutions</title></head>
      <body style="background:#03111f;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
        <h1 style="color:#00d9ff;">404 - Page Not Found</h1>
        <p style="color:#8aa7c2;">The page you are looking for does not exist.</p>
        <a href="/" style="color:#f6b73c;text-decoration:none;">&larr; Return to Cape Secure Home</a>
      </body>
      </html>
    `);

  } catch (err) {
    handleError(err, req, res);
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[CAPE SECURE SERVER] Running on port ${PORT}`);
    console.log(`[PUBLIC DIR] Serving from: ${PUBLIC_DIR}`);
  });
}

module.exports = { server, parseBody };
