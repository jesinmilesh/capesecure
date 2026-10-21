/**
 * CapeSecure — Full-Stack Production Backend Server
 * Serves static frontend assets, manages Orders, Quotations, Invoices,
 * server-side PDF generation, Brevo transactional emails, and Admin APIs.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

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
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY || 'cape-secure-admin-2026';

const { getCompanyConfig, updateCompanyConfig } = require('./companyConfig');
const db = require('./db');
const { generateDocumentPDF } = require('./pdfService');
const emailService = require('./emailService');

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
  '.pdf': 'application/pdf'
};

const PUBLIC_DIR = fs.existsSync(path.join(__dirname, '..', 'public'))
  ? path.join(__dirname, '..', 'public')
  : path.join(__dirname, '..');

// Helper: JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper: Parse JSON body with 100KB limit
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_SIZE = 100 * 1024;
    req.on('data', chunk => {
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
  });
}

// Helper: Verify Admin authorization
function isAdminAuthorized(req, parsedUrl) {
  const headerToken = req.headers['x-admin-token'] || req.headers['authorization'];
  const queryToken = parsedUrl.searchParams.get('token') || parsedUrl.searchParams.get('adminToken');
  const cleanHeader = headerToken ? headerToken.replace(/^Bearer\s+/i, '').trim() : '';

  return cleanHeader === ADMIN_SECRET || queryToken === ADMIN_SECRET;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // ===========================================================================
  // 2. REST API ROUTES
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // A. CUSTOMER ORDER & ENQUIRY SUBMISSION (/api/orders/create, /api/send-sms, /api/contact)
  // ---------------------------------------------------------------------------
  if (
    (pathname === '/api/orders/create' || pathname === '/api/send-sms' || pathname === '/api/contact') &&
    req.method === 'POST'
  ) {
    try {
      const data = await parseBody(req);

      // Anti-Spam Honeypot Verification
      if ((data.website_trap && String(data.website_trap).trim() !== '') || (data.hp_name && String(data.hp_name).trim() !== '')) {
        return sendJson(res, 200, {
          success: true,
          orderId: 'CSS-ORD-2026-000000',
          message: 'Your request has been submitted successfully.'
        });
      }

      const name = String(data.name || '').trim();
      const phone = String(data.phone || data.whatsapp || '').trim();
      const email = String(data.email || '').trim();

      if (!name || (!phone && !email)) {
        return sendJson(res, 400, {
          success: false,
          message: 'Please provide your name and a valid phone or email address.'
        });
      }

      // 1. Create order record in database
      const order = db.createOrder(data);

      // 2. Dispatch Email #1: Customer Enquiry Acknowledgement
      if (order.customer.email) {
        emailService.sendCustomerAcknowledgement(order).catch(e => console.warn('[EMAIL ACK ERR]', e.message));
      }

      // 3. Dispatch Email #2: Admin Notification
      emailService.sendAdminNotification(order).catch(e => console.warn('[EMAIL ADMIN ERR]', e.message));

      return sendJson(res, 200, {
        success: true,
        orderId: order.orderId,
        accessToken: order.accessToken,
        total: order.pricing.total,
        message: 'Your request has been submitted successfully.'
      });
    } catch (err) {
      console.error('[ORDER SUBMIT ERROR]', err);
      return sendJson(res, 500, { success: false, message: 'Failed to process project request.' });
    }
  }

  // ---------------------------------------------------------------------------
  // B. ORDERS RETRIEVAL
  // ---------------------------------------------------------------------------
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    return sendJson(res, 200, { success: true, orders: db.getAllOrders() });
  }

  const orderMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9\-]+)$/);
  if (orderMatch && req.method === 'GET') {
    const orderId = orderMatch[1];
    const order = db.getOrder(orderId);
    if (!order) return sendJson(res, 404, { success: false, message: 'Order not found.' });

    // Customer or admin token validation
    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && order.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized document access.' });
    }
    return sendJson(res, 200, { success: true, order });
  }

  // ---------------------------------------------------------------------------
  // C. QUOTATIONS API
  // ---------------------------------------------------------------------------
  if (pathname === '/api/quotations/create' && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    try {
      const data = await parseBody(req);
      const quotation = db.createQuotation(data.orderId, data, 'admin');

      // Auto-dispatch Quotation Email if requested
      if (data.sendEmail && quotation.customer.email) {
        await emailService.sendQuotationEmail(quotation);
      }

      return sendJson(res, 200, { success: true, quotation });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  if (pathname === '/api/quotations' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    return sendJson(res, 200, { success: true, quotations: db.getAllQuotations() });
  }

  const quotePdfMatch = pathname.match(/^\/api\/quotations\/([A-Za-z0-9\-]+)\/pdf$/);
  if (quotePdfMatch && req.method === 'GET') {
    const quotationId = quotePdfMatch[1];
    const quotation = db.getQuotation(quotationId);
    if (!quotation) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });

    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && quotation.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized document access.' });
    }

    try {
      const pdfBuffer = await generateDocumentPDF('quotation', quotation);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quotationId}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      return res.end(pdfBuffer);
    } catch (e) {
      console.error('[PDF ERROR]', e);
      return sendJson(res, 500, { success: false, message: 'Failed to generate quotation PDF.' });
    }
  }

  const quoteApproveMatch = pathname.match(/^\/api\/quotations\/([A-Za-z0-9\-]+)\/approve$/);
  if (quoteApproveMatch && req.method === 'POST') {
    const quotationId = quoteApproveMatch[1];
    const quotation = db.getQuotation(quotationId);
    if (!quotation) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });

    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && quotation.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized document access.' });
    }

    const result = db.approveQuotation(quotationId, isAdminAuthorized(req, parsedUrl) ? 'admin' : 'customer');
    if (result && result.invoice && quotation.customer.email) {
      // Auto-dispatch Invoice Email upon quotation approval
      emailService.sendInvoiceEmail(result.invoice).catch(e => console.warn('[EMAIL INV ERR]', e.message));
    }
    return sendJson(res, 200, { success: true, ...result });
  }

  const quoteEmailMatch = pathname.match(/^\/api\/quotations\/([A-Za-z0-9\-]+)\/send-email$/);
  if (quoteEmailMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    const quotation = db.getQuotation(quoteEmailMatch[1]);
    if (!quotation) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });
    const emailRes = await emailService.sendQuotationEmail(quotation);
    return sendJson(res, 200, { success: true, ...emailRes });
  }

  const quoteMatch = pathname.match(/^\/api\/quotations\/([A-Za-z0-9\-]+)$/);
  if (quoteMatch && req.method === 'GET') {
    const quotation = db.getQuotation(quoteMatch[1]);
    if (!quotation) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });

    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && quotation.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized access.' });
    }
    return sendJson(res, 200, { success: true, quotation });
  }

  // ---------------------------------------------------------------------------
  // D. INVOICES API
  // ---------------------------------------------------------------------------
  if (pathname === '/api/invoices/create' && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    try {
      const data = await parseBody(req);
      const invoice = db.createInvoice(data.orderId, data, 'admin');

      if (data.sendEmail && invoice.customer.email) {
        await emailService.sendInvoiceEmail(invoice);
      }
      return sendJson(res, 200, { success: true, invoice });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  if (pathname === '/api/invoices' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    return sendJson(res, 200, { success: true, invoices: db.getAllInvoices() });
  }

  const invPdfMatch = pathname.match(/^\/api\/invoices\/([A-Za-z0-9\-]+)\/pdf$/);
  if (invPdfMatch && req.method === 'GET') {
    const invoiceId = invPdfMatch[1];
    const invoice = db.getInvoice(invoiceId);
    if (!invoice) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });

    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && invoice.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized document access.' });
    }

    try {
      const pdfBuffer = await generateDocumentPDF('invoice', invoice);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoiceId}.pdf"`,
        'Content-Length': pdfBuffer.length
      });
      return res.end(pdfBuffer);
    } catch (e) {
      console.error('[PDF ERROR]', e);
      return sendJson(res, 500, { success: false, message: 'Failed to generate invoice PDF.' });
    }
  }

  const invPayMatch = pathname.match(/^\/api\/invoices\/([A-Za-z0-9\-]+)\/payment$/);
  if (invPayMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    try {
      const data = await parseBody(req);
      const result = db.recordPayment(invPayMatch[1], data, 'admin');

      if (data.sendReceipt && result.invoice.customer.email) {
        await emailService.sendPaymentConfirmation(result.invoice, result.payment);
      }
      return sendJson(res, 200, { success: true, ...result });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  const invEmailMatch = pathname.match(/^\/api\/invoices\/([A-Za-z0-9\-]+)\/send-email$/);
  if (invEmailMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    const invoice = db.getInvoice(invEmailMatch[1]);
    if (!invoice) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });
    const emailRes = await emailService.sendInvoiceEmail(invoice);
    return sendJson(res, 200, { success: true, ...emailRes });
  }

  const invMatch = pathname.match(/^\/api\/invoices\/([A-Za-z0-9\-]+)$/);
  if (invMatch && req.method === 'GET') {
    const invoice = db.getInvoice(invMatch[1]);
    if (!invoice) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });

    const token = parsedUrl.searchParams.get('token');
    if (!isAdminAuthorized(req, parsedUrl) && invoice.accessToken !== token) {
      return sendJson(res, 403, { success: false, message: 'Unauthorized access.' });
    }
    return sendJson(res, 200, { success: true, invoice });
  }

  // ---------------------------------------------------------------------------
  // E. PROJECT LIFECYCLE DISPATCHES (Kickoff, Deliver, Renewal)
  // ---------------------------------------------------------------------------
  const kickoffMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9\-]+)\/kickoff$/);
  if (kickoffMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    const orderId = kickoffMatch[1];
    const order = db.getOrder(orderId);
    if (!order) return sendJson(res, 404, { success: false, message: 'Order not found.' });

    db.updateOrderStatus(orderId, 'development', { kickoffDate: new Date().toISOString() });
    if (order.customer.email) {
      await emailService.sendProjectKickoff(order);
    }
    return sendJson(res, 200, { success: true, message: 'Project kickoff email dispatched.' });
  }

  const deliverMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9\-]+)\/deliver$/);
  if (deliverMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    const orderId = deliverMatch[1];
    const order = db.getOrder(orderId);
    if (!order) return sendJson(res, 404, { success: false, message: 'Order not found.' });

    const data = await parseBody(req);
    db.updateOrderStatus(orderId, 'delivered', { deliveryDate: new Date().toISOString() });
    if (order.customer.email) {
      await emailService.sendProjectDelivery(order, data);
    }
    return sendJson(res, 200, { success: true, message: 'Project delivery email dispatched.' });
  }

  const renewalMatch = pathname.match(/^\/api\/orders\/([A-Za-z0-9\-]+)\/renewal$/);
  if (renewalMatch && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    const orderId = renewalMatch[1];
    const order = db.getOrder(orderId);
    if (!order) return sendJson(res, 404, { success: false, message: 'Order not found.' });

    const data = await parseBody(req);
    if (order.customer.email) {
      await emailService.sendRenewalReminder(order, data);
    }
    return sendJson(res, 200, { success: true, message: 'Renewal reminder dispatched.' });
  }

  // ---------------------------------------------------------------------------
  // F. ADMIN DASHBOARD METRICS & LOGS
  // ---------------------------------------------------------------------------
  if (pathname === '/api/admin/metrics' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }

    const orders = db.getAllOrders();
    const quotations = db.getAllQuotations();
    const invoices = db.getAllInvoices();

    let totalRevenue = 0;
    let pendingBalance = 0;

    invoices.forEach(inv => {
      totalRevenue += (inv.pricing?.amountPaid || 0);
      pendingBalance += (inv.pricing?.balance || 0);
    });

    return sendJson(res, 200, {
      success: true,
      metrics: {
        totalOrders: orders.length,
        totalQuotations: quotations.length,
        totalInvoices: invoices.length,
        totalRevenue,
        pendingBalance,
        activeDevelopment: orders.filter(o => o.status === 'development' || o.status === 'paid').length
      }
    });
  }

  if (pathname === '/api/admin/logs' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    return sendJson(res, 200, {
      success: true,
      auditLogs: db.getAuditLogs(50),
      emailLogs: db.getEmailLogs(50)
    });
  }

  if (pathname === '/api/admin/settings' && req.method === 'GET') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    return sendJson(res, 200, { success: true, config: getCompanyConfig() });
  }

  if (pathname === '/api/admin/settings' && req.method === 'POST') {
    if (!isAdminAuthorized(req, parsedUrl)) {
      return sendJson(res, 401, { success: false, message: 'Admin authentication required.' });
    }
    try {
      const data = await parseBody(req);
      const updated = updateCompanyConfig(data);
      return sendJson(res, 200, { success: true, config: updated });
    } catch (err) {
      return sendJson(res, 400, { success: false, message: err.message });
    }
  }

  // ===========================================================================
  // 3. STATIC FILE SERVING
  // ===========================================================================
  let reqPath = decodeURI(pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  let filePath = path.join(PUBLIC_DIR, reqPath);

  // If directory, serve index.html inside
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Fallback to project root if not in public
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', reqPath);
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const notFoundPath = fs.existsSync(path.join(PUBLIC_DIR, '404.html'))
        ? path.join(PUBLIC_DIR, '404.html')
        : path.join(__dirname, '..', 'public', '404.html');

      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(notFoundPath).pipe(res);
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CAPE SECURE SERVER] Running at http://127.0.0.1:${PORT}/`);
  console.log(`[BACKEND ENV] Loaded from: ${envPath}`);
  console.log(`[PUBLIC DIR] Serving from: ${PUBLIC_DIR}`);
});
