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

  // 2. Lead & Contact Ingestion Handler (/api/send-sms and /api/contact)
  if ((pathname === '/api/send-sms' || pathname === '/api/contact') && req.method === 'POST') {
    let body = '';
    const MAX_SIZE = 100 * 1024; // 100 KB max payload

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_SIZE) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Request payload too large.' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');

        // Anti-Spam Honeypot Verification
        if ((data.website_trap && String(data.website_trap).trim() !== '') || (data.hp_name && String(data.hp_name).trim() !== '')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, message: 'Your request has been submitted successfully.' }));
        }

        // Input Sanitization helper
        const sanitize = (str) => typeof str === 'string' ? str.replace(/<[^>]*>?/gm, '').trim() : '';

        const type = sanitize(data.type) || 'contact';
        const name = sanitize(data.name) || 'Client';
        const email = sanitize(data.email);
        const phone = sanitize(data.phone);
        const businessName = sanitize(data.businessName || data.company);
        const subject = sanitize(data.subject) || 'Website Inquiry';
        const budget = sanitize(data.budget);
        const requirements = Array.isArray(data.requirements) ? data.requirements.map(sanitize) : [];
        const message = sanitize(data.message);

        // Validation: Name and at least Phone or Email required
        if (!name || (!phone && !email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            success: false, 
            message: 'Please provide your name and a valid phone number or email address.' 
          }));
        }

        console.log(`[LEAD RECEIVED - ${type.toUpperCase()}] From: ${name} (${email || phone}) - Business: ${businessName || 'N/A'}`);

        // If Brevo key is configured, dispatch email/notification
        if (BREVO_API_KEY && BREVO_API_KEY.startsWith('xkeysib-')) {
          try {
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; background: #031B2A; color: #F5FAFC; padding: 24px; border-radius: 8px;">
                <h2 style="color: #00B8C8; margin-top: 0;">New ${type === 'quote' ? 'Quote Request' : 'Client Consultation'}</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email || 'Not provided'}</p>
                <p><strong>Phone / WhatsApp:</strong> ${phone || 'Not provided'}</p>
                ${businessName ? `<p><strong>Business Name:</strong> ${businessName}</p>` : ''}
                ${budget ? `<p><strong>Selected Budget:</strong> ${budget}</p>` : ''}
                ${requirements.length ? `<p><strong>Requirements:</strong> ${requirements.join(', ')}</p>` : ''}
                <p><strong>Service / Subject:</strong> ${subject}</p>
                <p><strong>Message / Brief:</strong></p>
                <blockquote style="background: rgba(255,255,255,0.06); padding: 12px; border-left: 3px solid #00B8C8;">${message || 'No additional details provided.'}</blockquote>
                <p style="color: #7899B5; font-size: 12px; margin-top: 20px;">Cape Secure Solutions &bull; Kanyakumari, Tamil Nadu, India</p>
              </div>
            `;

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
                htmlContent: emailHtml
              })
            });
            const brevoData = await brevoRes.json();
            console.log('[BREVO DISPATCH SUCCESS]', brevoData);
          } catch (brevoErr) {
            console.warn('[BREVO DISPATCH ERROR]', brevoErr.message);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Your request has been submitted successfully.' 
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          message: 'Unable to process your request at this moment.' 
        }));
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
