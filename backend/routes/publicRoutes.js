/**
 * Cape Secure Solutions — Public API Route Dispatcher
 */

const publicCtrl = require('../controllers/publicController');

async function handlePublicRoutes(req, res, pathname, parsedUrl, body, clientIp) {
  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    publicCtrl.getHealth(req, res);
    return true;
  }

  // GET /api/public/services
  if (pathname === '/api/public/services' && req.method === 'GET') {
    publicCtrl.getServices(req, res);
    return true;
  }

  // GET /api/public/pricing
  if (pathname === '/api/public/pricing' && req.method === 'GET') {
    publicCtrl.getPricing(req, res);
    return true;
  }

  // GET /api/public/projects
  if (pathname === '/api/public/projects' && req.method === 'GET') {
    publicCtrl.getProjects(req, res);
    return true;
  }

  // POST /api/public/contact or /api/contact
  if ((pathname === '/api/public/contact' || pathname === '/api/contact') && req.method === 'POST') {
    await publicCtrl.submitContact(req, res, body, clientIp);
    return true;
  }

  // POST /api/public/quote or /api/orders/create or /api/send-sms
  if (
    (pathname === '/api/public/quote' || pathname === '/api/orders/create' || pathname === '/api/send-sms') &&
    req.method === 'POST'
  ) {
    await publicCtrl.submitQuote(req, res, body, clientIp);
    return true;
  }

  // GET /api/public/orders/:id
  const orderMatch = pathname.match(/^\/api\/public\/orders\/([A-Za-z0-9\-]+)$/);
  if (orderMatch && req.method === 'GET') {
    const token = parsedUrl.searchParams.get('token');
    publicCtrl.getOrderPortal(req, res, orderMatch[1], token);
    return true;
  }

  // GET /api/public/quotations/:id/pdf or /api/quotations/:id/pdf
  const quotePdfMatch = pathname.match(/^\/(?:api\/public\/quotations|api\/quotations)\/([A-Za-z0-9\-]+)\/pdf$/);
  if (quotePdfMatch && req.method === 'GET') {
    const token = parsedUrl.searchParams.get('token');
    await publicCtrl.getQuotationPdf(req, res, quotePdfMatch[1], token);
    return true;
  }

  // POST /api/public/quotations/:id/approve or /api/quotations/:id/approve
  const quoteApproveMatch = pathname.match(/^\/(?:api\/public\/quotations|api\/quotations)\/([A-Za-z0-9\-]+)\/approve$/);
  if (quoteApproveMatch && req.method === 'POST') {
    const token = parsedUrl.searchParams.get('token');
    await publicCtrl.approveQuotation(req, res, quoteApproveMatch[1], token);
    return true;
  }

  // GET /api/public/quotations/:id or /api/quotations/:id
  const quoteMatch = pathname.match(/^\/(?:api\/public\/quotations|api\/quotations)\/([A-Za-z0-9\-]+)$/);
  if (quoteMatch && req.method === 'GET') {
    const token = parsedUrl.searchParams.get('token');
    publicCtrl.getQuotationPortal(req, res, quoteMatch[1], token);
    return true;
  }

  // GET /api/public/invoices/:id/pdf or /api/invoices/:id/pdf
  const invPdfMatch = pathname.match(/^\/(?:api\/public\/invoices|api\/invoices)\/([A-Za-z0-9\-]+)\/pdf$/);
  if (invPdfMatch && req.method === 'GET') {
    const token = parsedUrl.searchParams.get('token');
    await publicCtrl.getInvoicePdf(req, res, invPdfMatch[1], token);
    return true;
  }

  // GET /api/public/invoices/:id or /api/invoices/:id
  const invMatch = pathname.match(/^\/(?:api\/public\/invoices|api\/invoices)\/([A-Za-z0-9\-]+)$/);
  if (invMatch && req.method === 'GET') {
    const token = parsedUrl.searchParams.get('token');
    publicCtrl.getInvoicePortal(req, res, invMatch[1], token);
    return true;
  }

  return false;
}

module.exports = {
  handlePublicRoutes
};
