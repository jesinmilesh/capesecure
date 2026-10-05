/**
 * CapeSecure — Local & Production Backend Server
 * Loads environment variables from backend/.env, serves public static assets,
 * and handles /api/send-sms Brevo transactional dispatches.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 1. Load backend/.env safely
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_ADMIN_EMAIL = process.env.BREVO_ADMIN_EMAIL || 'capesecuresolutions@gmail.com';
const BREVO_SENDER = process.env.BREVO_SENDER || 'CapeSecure';

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
  '.webp': 'image/webp'
};

// Determine static root: public folder or root
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, '..', 'public'))
  ? path.join(__dirname, '..', 'public')
  : path.join(__dirname, '..');

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // 2. Brevo API Handler (/api/send-sms)
  if (pathname === '/api/send-sms' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const { name = 'Client', email = '', phone = '', company = '', subject = 'Inquiry', message = '' } = data;

        console.log(`[INQUIRY RECEIVED] From: ${name} (${email || phone}) - Subject: ${subject}`);

        // If Brevo key is configured, dispatch email/notification
        if (BREVO_API_KEY && BREVO_API_KEY.startsWith('xkeysib-')) {
          try {
            const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json'
              },
              body: JSON.stringify({
                sender: { name: 'CapeSecure Leads', email: BREVO_ADMIN_EMAIL },
                to: [{ email: BREVO_ADMIN_EMAIL, name: 'Cape Secure Admin' }],
                subject: `[New Lead] ${subject} - ${name}`,
                htmlContent: `
                  <div style="font-family: Arial, sans-serif; background: #03111f; color: #f0f6fc; padding: 24px; border-radius: 8px;">
                    <h2 style="color: #00d9ff; margin-top: 0;">New Client Consultation Request</h2>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                    <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                    <p><strong>Company:</strong> ${company || 'Not provided'}</p>
                    <p><strong>Service:</strong> ${subject}</p>
                    <p><strong>Message:</strong></p>
                    <blockquote style="background: rgba(255,255,255,0.05); padding: 12px; border-left: 3px solid #00d9ff;">${message || 'No additional details provided.'}</blockquote>
                    <p style="color: #6c8ca5; font-size: 12px; margin-top: 20px;">Cape Secure &bull; Kanyakumari, Tamil Nadu, India</p>
                  </div>
                `
              })
            });
            const brevoData = await brevoRes.json();
            console.log('[BREVO DISPATCH SUCCESS]', brevoData);
          } catch (brevoErr) {
            console.warn('[BREVO DISPATCH ERROR]', brevoErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Consultation request recorded successfully.' }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload.' }));
      }
    });
    return;
  }

  // 3. Static File Serving
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // If not found in PUBLIC_DIR, check project root
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', reqPath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // 404 handler
      const notFoundPath = fs.existsSync(path.join(PUBLIC_DIR, '404.html'))
        ? path.join(PUBLIC_DIR, '404.html')
        : path.join(__dirname, '..', '404.html');

      fs.readFile(notFoundPath, (err404, data404) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data404 || '<h1>404 Not Found</h1>');
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[CAPE SECURE SERVER] Running at http://127.0.0.1:${PORT}/`);
  console.log(`[BACKEND ENV] Loaded from: ${envPath}`);
  console.log(`[PUBLIC DIR] Serving from: ${PUBLIC_DIR}`);
});
