/**
 * Cape Secure Solutions — Admin API Routes
 * Protected endpoints for the separate administrative console.
 */

const adminCtrl = require('../controllers/adminController');
const { getAuthUser } = require('./authRoutes');
const auth = require('../middleware/auth');

async function handleAdminRoutes(req, res, pathname, parsedUrl, body, clientIp) {
  const isAdminPath = pathname.startsWith('/api/admin/') ||
    pathname === '/api/quotations/create' ||
    pathname === '/api/invoices/create' ||
    pathname.startsWith('/api/invoices/') ||
    (pathname === '/api/orders' && req.method === 'GET');

  if (!isAdminPath) return false;

  // Enforce authentication & authorization
  const authCheck = getAuthUser(req, parsedUrl);
  if (!authCheck.authorized) {
    res.writeHead(authCheck.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, message: authCheck.error }));
    return true;
  }

  const actor = authCheck.user.email;

  // GET /api/admin/dashboard & /api/admin/metrics
  if ((pathname === '/api/admin/dashboard' || pathname === '/api/admin/metrics') && req.method === 'GET') {
    adminCtrl.getDashboard(req, res);
    return true;
  }

  // GET /api/admin/events & /api/admin/sse
  if ((pathname === '/api/admin/events' || pathname === '/api/admin/sse') && req.method === 'GET') {
    adminCtrl.streamEvents(req, res, authCheck.user);
    return true;
  }

  // GET /api/admin/customers
  if (pathname === '/api/admin/customers' && req.method === 'GET') {
    if (!auth.hasPermission(authCheck.user.role, 'VIEW_CUSTOMERS')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.getCustomers(req, res);
    return true;
  }

  // GET /api/admin/enquiries
  if (pathname === '/api/admin/enquiries' && req.method === 'GET') {
    if (!auth.hasPermission(authCheck.user.role, 'VIEW_ENQUIRIES')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.getEnquiries(req, res);
    return true;
  }

  // GET /api/admin/enquiries/:id
  const enquiryGetMatch = pathname.match(/^\/api\/admin\/enquiries\/([A-Za-z0-9\-]+)$/);
  if (enquiryGetMatch && req.method === 'GET') {
    if (!auth.hasPermission(authCheck.user.role, 'VIEW_ENQUIRIES')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.getEnquiryById(req, res, enquiryGetMatch[1]);
    return true;
  }

  // PUT /api/admin/enquiries/:id/status
  const enquiryStatusMatch = pathname.match(/^\/api\/admin\/enquiries\/([A-Za-z0-9\-]+)\/status$/);
  if (enquiryStatusMatch && req.method === 'PUT') {
    if (!auth.hasPermission(authCheck.user.role, 'UPDATE_ENQUIRIES')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.updateEnquiryStatus(req, res, enquiryStatusMatch[1], body, actor);
    return true;
  }

  // POST /api/admin/enquiries/:id/assign
  const enquiryAssignMatch = pathname.match(/^\/api\/admin\/enquiries\/([A-Za-z0-9\-]+)\/assign$/);
  if (enquiryAssignMatch && req.method === 'POST') {
    if (!auth.hasPermission(authCheck.user.role, 'UPDATE_ENQUIRIES')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.assignEnquiry(req, res, enquiryAssignMatch[1], body, actor);
    return true;
  }

  // POST /api/admin/enquiries/:id/notes
  const enquiryNotesMatch = pathname.match(/^\/api\/admin\/enquiries\/([A-Za-z0-9\-]+)\/notes$/);
  if (enquiryNotesMatch && req.method === 'POST') {
    if (!auth.hasPermission(authCheck.user.role, 'UPDATE_ENQUIRIES')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Forbidden: Insufficient privileges.' }));
      return true;
    }
    adminCtrl.addEnquiryNote(req, res, enquiryNotesMatch[1], body, actor);
    return true;
  }

  // GET /api/admin/orders or /api/orders
  if ((pathname === '/api/admin/orders' || pathname === '/api/orders') && req.method === 'GET') {
    adminCtrl.getOrders(req, res);
    return true;
  }

  // POST /api/admin/orders
  if (pathname === '/api/admin/orders' && req.method === 'POST') {
    adminCtrl.createOrder(req, res, body, actor);
    return true;
  }

  // PUT /api/admin/orders/:id/status
  const orderStatusMatch = pathname.match(/^\/api\/admin\/orders\/([A-Za-z0-9\-]+)\/status$/);
  if (orderStatusMatch && req.method === 'PUT') {
    adminCtrl.updateOrderStatus(req, res, orderStatusMatch[1], body, actor);
    return true;
  }

  // GET /api/admin/quotations
  if (pathname === '/api/admin/quotations' && req.method === 'GET') {
    adminCtrl.getQuotations(req, res);
    return true;
  }

  // POST /api/admin/quotations or /api/quotations/create
  if ((pathname === '/api/admin/quotations' || pathname === '/api/quotations/create') && req.method === 'POST') {
    await adminCtrl.createQuotation(req, res, body, actor);
    return true;
  }

  // POST /api/admin/quotations/:id/send
  const quoteSendMatch = pathname.match(/^\/api\/admin\/quotations\/([A-Za-z0-9\-]+)\/send$/);
  if (quoteSendMatch && req.method === 'POST') {
    await adminCtrl.sendQuotationEmail(req, res, quoteSendMatch[1]);
    return true;
  }

  // GET /api/admin/invoices
  if (pathname === '/api/admin/invoices' && req.method === 'GET') {
    adminCtrl.getInvoices(req, res);
    return true;
  }

  // POST /api/admin/invoices or /api/invoices/create
  if ((pathname === '/api/admin/invoices' || pathname === '/api/invoices/create') && req.method === 'POST') {
    await adminCtrl.createInvoice(req, res, body, actor);
    return true;
  }

  // POST /api/admin/invoices/:id/send
  const invSendMatch = pathname.match(/^\/api\/admin\/invoices\/([A-Za-z0-9\-]+)\/send$/);
  if (invSendMatch && req.method === 'POST') {
    await adminCtrl.sendInvoiceEmail(req, res, invSendMatch[1]);
    return true;
  }

  // POST /api/admin/invoices/:id/payments or /api/invoices/:id/payment
  const invPayMatch = pathname.match(/^\/(?:api\/admin\/invoices|api\/invoices)\/([A-Za-z0-9\-]+)\/(?:payments|payment)$/);
  if (invPayMatch && req.method === 'POST') {
    await adminCtrl.recordPayment(req, res, invPayMatch[1], body, actor);
    return true;
  }

  // GET /api/admin/audit-logs
  if (pathname === '/api/admin/audit-logs' && req.method === 'GET') {
    adminCtrl.getAuditLogs(req, res);
    return true;
  }

  // GET /api/admin/email-logs
  if (pathname === '/api/admin/email-logs' && req.method === 'GET') {
    adminCtrl.getEmailLogs(req, res);
    return true;
  }

  // GET /api/admin/config
  if (pathname === '/api/admin/config' && req.method === 'GET') {
    adminCtrl.getConfig(req, res);
    return true;
  }

  // PUT /api/admin/config
  if (pathname === '/api/admin/config' && req.method === 'PUT') {
    adminCtrl.updateConfig(req, res, body, actor);
    return true;
  }

  return false;
}

module.exports = {
  handleAdminRoutes
};
