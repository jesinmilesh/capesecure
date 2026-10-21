/**
 * Cape Secure Solutions — Administrative Controller
 * Handles protected administrative workflows (/api/admin/*).
 * Strictly requires verified administrator authentication and authorization.
 */

const db = require('../models/db');
const emailService = require('../services/emailService');
const { generateDocumentPDF } = require('../services/pdfService');
const { getCompanyConfig, updateCompanyConfig } = require('../config/company');
const { addClient, broadcastEvent } = require('../services/realtimeService');
const { setSecurityHeaders } = require('../middleware/security');

function sendJson(res, statusCode, data) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// GET /api/admin/dashboard & /api/admin/metrics
function getDashboard(req, res) {
  const data = db.getDashboardMetrics();
  sendJson(res, 200, { success: true, ...data });
}

// -----------------------------------------------------------------------------
// ENQUIRIES CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/enquiries
function getEnquiries(req, res) {
  const enquiries = db.getAllEnquiries();
  sendJson(res, 200, { success: true, enquiries });
}

// GET /api/admin/enquiries/:id
function getEnquiryById(req, res, enquiryId) {
  const enquiry = db.getEnquiry(enquiryId);
  if (!enquiry) {
    return sendJson(res, 404, { success: false, message: `Enquiry ${enquiryId} not found.` });
  }
  sendJson(res, 200, { success: true, enquiry });
}

// PUT /api/admin/enquiries/:id/status
function updateEnquiryStatus(req, res, enquiryId, body, actor = 'admin') {
  const newStatus = body.status;
  if (!newStatus) {
    return sendJson(res, 400, { success: false, message: 'Status is required.' });
  }

  try {
    const updated = db.updateEnquiryStatus(enquiryId, newStatus, actor);

    broadcastEvent('enquiry:status_changed', {
      enquiryId: updated.enquiryId,
      status: updated.status,
      lastActionAt: updated.lastActionAt
    });

    sendJson(res, 200, {
      success: true,
      message: `Enquiry status updated to ${updated.status}.`,
      enquiry: updated
    });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// POST /api/admin/enquiries/:id/assign
function assignEnquiry(req, res, enquiryId, body, actor = 'admin') {
  const adminEmail = body.assignedAdmin || body.email;
  if (!adminEmail) {
    return sendJson(res, 400, { success: false, message: 'Admin email is required.' });
  }

  try {
    const updated = db.assignEnquiry(enquiryId, adminEmail, actor);
    broadcastEvent('enquiry:assigned', {
      enquiryId: updated.enquiryId,
      assignedAdmin: updated.assignedAdmin
    });
    sendJson(res, 200, {
      success: true,
      message: `Enquiry assigned to ${adminEmail}.`,
      enquiry: updated
    });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// POST /api/admin/enquiries/:id/notes
function addEnquiryNote(req, res, enquiryId, body, actor = 'admin') {
  const note = body.note || body.text;
  if (!note) {
    return sendJson(res, 400, { success: false, message: 'Note text is required.' });
  }

  try {
    const updated = db.addEnquiryNote(enquiryId, note, actor);
    sendJson(res, 200, {
      success: true,
      message: 'Internal note added successfully.',
      enquiry: updated
    });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// CUSTOMERS CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/customers
function getCustomers(req, res) {
  const customers = db.getCustomers();
  sendJson(res, 200, { success: true, customers });
}

// -----------------------------------------------------------------------------
// ORDERS & PROJECTS CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/orders
function getOrders(req, res) {
  const orders = db.getAllOrders();
  sendJson(res, 200, { success: true, orders });
}

// POST /api/admin/orders
function createOrder(req, res, body, actor = 'admin') {
  const order = db.createOrder(body);
  broadcastEvent('order:created', {
    orderId: order.orderId,
    customer: order.customer.name,
    total: order.pricing.total
  });
  sendJson(res, 201, { success: true, order });
}

// PUT /api/admin/orders/:id/status
function updateOrderStatus(req, res, orderId, body, actor = 'admin') {
  const newStatus = body.status;
  if (!newStatus) {
    return sendJson(res, 400, { success: false, message: 'Status is required.' });
  }

  const updated = db.updateOrderStatus(orderId, newStatus, body, actor);
  if (!updated) {
    return sendJson(res, 404, { success: false, message: 'Order not found.' });
  }

  // Handle milestone email alerts
  if (newStatus === 'development') {
    emailService.sendProjectKickoffEmail(updated).catch(e => console.warn('[KICKOFF EMAIL ERR]', e.message));
  } else if (newStatus === 'delivered') {
    emailService.sendProjectDeliveryEmail(updated).catch(e => console.warn('[DELIVERY EMAIL ERR]', e.message));
  }

  broadcastEvent('order:updated', {
    orderId: updated.orderId,
    status: updated.status
  });

  sendJson(res, 200, { success: true, order: updated });
}

// -----------------------------------------------------------------------------
// QUOTATIONS CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/quotations
function getQuotations(req, res) {
  const quotations = db.getAllQuotations();
  sendJson(res, 200, { success: true, quotations });
}

// POST /api/admin/quotations
async function createQuotation(req, res, body, actor = 'admin') {
  const orderOrEnquiryId = body.orderId || body.enquiryId;
  if (!orderOrEnquiryId) {
    return sendJson(res, 400, { success: false, message: 'orderId or enquiryId is required to generate quotation.' });
  }

  try {
    const quotation = db.createQuotation(orderOrEnquiryId, body, actor);

    // Send email with attached PDF
    if (body.sendEmail !== false && quotation.customer.email) {
      emailService.sendQuotationEmail(quotation).catch(e => console.warn('[QUOTATION EMAIL ERR]', e.message));
    }

    broadcastEvent('quotation:created', {
      quotationId: quotation.quotationId,
      orderId: quotation.orderId,
      enquiryId: quotation.enquiryId,
      total: quotation.pricing.total
    });

    sendJson(res, 201, { success: true, quotation });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// POST /api/admin/quotations/:id/send
async function sendQuotationEmail(req, res, quotationId) {
  const q = db.getQuotation(quotationId);
  if (!q) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });

  try {
    await emailService.sendQuotationEmail(q);
    sendJson(res, 200, { success: true, message: `Quotation #${quotationId} emailed successfully.` });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// INVOICES & PAYMENTS CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/invoices
function getInvoices(req, res) {
  const invoices = db.getAllInvoices();
  sendJson(res, 200, { success: true, invoices });
}

// POST /api/admin/invoices
async function createInvoice(req, res, body, actor = 'admin') {
  const refId = body.quotationId || body.orderId || body.enquiryId;
  if (!refId) {
    return sendJson(res, 400, { success: false, message: 'quotationId, orderId, or enquiryId is required to generate invoice.' });
  }

  try {
    const invoice = db.createInvoice(refId, body, actor);

    if (body.sendEmail !== false && invoice.customer.email) {
      emailService.sendInvoiceEmail(invoice).catch(e => console.warn('[INVOICE EMAIL ERR]', e.message));
    }

    broadcastEvent('invoice:created', {
      invoiceId: invoice.invoiceNumber || invoice.invoiceId,
      orderId: invoice.orderId,
      enquiryId: invoice.enquiryId,
      total: invoice.pricing.total
    });

    sendJson(res, 201, { success: true, invoice });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// POST /api/admin/invoices/:id/send
async function sendInvoiceEmail(req, res, invoiceId) {
  const inv = db.getInvoice(invoiceId);
  if (!inv) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });

  try {
    await emailService.sendInvoiceEmail(inv);
    sendJson(res, 200, { success: true, message: `Invoice #${invoiceId} emailed successfully.` });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
}

// POST /api/admin/invoices/:id/payments
async function recordPayment(req, res, invoiceId, body, actor = 'admin') {
  try {
    const { invoice, payment } = db.recordPayment(invoiceId, body, actor);

    if (invoice.customer.email) {
      emailService.sendPaymentConfirmationEmail(invoice, payment).catch(e => console.warn('[PAY ACK ERR]', e.message));
    }

    broadcastEvent('payment:recorded', {
      invoiceId: invoice.invoiceNumber || invoice.invoiceId,
      paymentId: payment.paymentId,
      amount: payment.amount,
      balance: invoice.pricing.balance
    });

    sendJson(res, 200, {
      success: true,
      message: 'Payment recorded successfully.',
      invoice,
      payment
    });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// AUDIT & EMAIL LOGS
// -----------------------------------------------------------------------------
// GET /api/admin/audit-logs
function getAuditLogs(req, res) {
  const logs = db.getAuditLogs(100);
  sendJson(res, 200, { success: true, logs, auditLogs: logs });
}

// GET /api/admin/email-logs
function getEmailLogs(req, res) {
  const logs = db.getEmailLogs(100);
  sendJson(res, 200, { success: true, logs });
}

// -----------------------------------------------------------------------------
// COMPANY SETTINGS CONTROLLER
// -----------------------------------------------------------------------------
// GET /api/admin/config
function getConfig(req, res) {
  const config = getCompanyConfig();
  sendJson(res, 200, { success: true, config });
}

// PUT /api/admin/config
function updateConfig(req, res, body, actor = 'admin') {
  try {
    const updated = updateCompanyConfig(body);
    db.recordAuditLog('CONFIG_UPDATED', 'COMPANY_SETTINGS', { updatedKeys: Object.keys(body) }, actor);
    sendJson(res, 200, { success: true, config: updated });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
}

// -----------------------------------------------------------------------------
// REAL-TIME EVENT STREAM (SSE)
// -----------------------------------------------------------------------------
// GET /api/admin/events & /api/admin/sse
function streamEvents(req, res, user) {
  addClient(req, res, user);
}

module.exports = {
  getDashboard,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  assignEnquiry,
  addEnquiryNote,
  getCustomers,
  getOrders,
  createOrder,
  updateOrderStatus,
  getQuotations,
  createQuotation,
  sendQuotationEmail,
  getInvoices,
  createInvoice,
  sendInvoiceEmail,
  recordPayment,
  getAuditLogs,
  getEmailLogs,
  getConfig,
  updateConfig,
  streamEvents
};
