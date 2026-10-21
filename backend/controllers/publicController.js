/**
 * Cape Secure Solutions — Public Client Controller
 * Handles customer-facing requests (/api/public/*).
 * Never exposes raw database credentials or internal administrative data.
 */

const db = require('../models/db');
const { getPricingTiers } = require('../services/pricingEngine');
const { generateDocumentPDF } = require('../services/pdfService');
const emailService = require('../services/emailService');
const { broadcastEvent } = require('../services/realtimeService');
const { validateQuoteSubmission } = require('../validators/quoteValidator');
const { validateContactSubmission } = require('../validators/contactValidator');
const { checkPublicRateLimit, setSecurityHeaders } = require('../middleware/security');

function sendJson(res, statusCode, data) {
  setSecurityHeaders(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// GET /api/health
function getHealth(req, res) {
  sendJson(res, 200, {
    status: 'ok',
    database: 'connected',
    service: 'Cape Secure Solutions API',
    timestamp: new Date().toISOString()
  });
}

// GET /api/public/services
function getServices(req, res) {
  const tiers = getPricingTiers();
  sendJson(res, 200, { success: true, services: tiers });
}

// GET /api/public/pricing
function getPricing(req, res) {
  const tiers = getPricingTiers();
  sendJson(res, 200, { success: true, pricing: tiers });
}

// GET /api/public/projects
function getProjects(req, res) {
  const showcase = [
    {
      id: 'kanyakumari-tourism',
      title: 'Kanyakumari Tourism & Coastal Travel Guide',
      category: 'Travel & Hospitality',
      description: 'Modern bilingual web portal featuring ferry schedules, sunrise/sunset countdowns, and booking integrations.',
      image: 'assets/images/portfolio/tourism-portal.webp'
    },
    {
      id: 'apex-dental-clinic',
      title: 'Apex Healthcare Clinic & Appointment System',
      category: 'Healthcare & Medical',
      description: 'HIPAA-compliant patient booking portal with instant WhatsApp confirmations and doctor availability management.',
      image: 'assets/images/portfolio/healthcare-clinic.webp'
    },
    {
      id: 'spice-haven-restaurant',
      title: 'Spice Haven Restaurant & Table Reservation',
      category: 'Food & Dining',
      description: 'Interactive digital menu, automated table reservations, and UPI payment ordering.',
      image: 'assets/images/portfolio/restaurant-menu.webp'
    }
  ];
  sendJson(res, 200, { success: true, projects: showcase });
}

// POST /api/public/contact
async function submitContact(req, res, body, clientIp) {
  if (!checkPublicRateLimit(clientIp, 'contact')) {
    return sendJson(res, 429, { success: false, message: 'Too many requests. Please try again later.' });
  }

  const validation = validateContactSubmission(body);
  if (validation.isSpam) {
    return sendJson(res, 200, { success: true, message: 'Message sent successfully.' });
  }

  if (!validation.valid) {
    return sendJson(res, 400, { success: false, message: validation.errors[0] || 'Invalid input.' });
  }

  const { name, email, phone, message } = validation.data;

  const order = db.createOrder({
    name,
    email,
    phone,
    notes: message,
    businessType: 'General Contact Enquiry',
    package: 'starter'
  });

  if (email) {
    emailService.sendCustomerAcknowledgement(order).catch(e => console.warn('[CONTACT ACK ERR]', e.message));
  }
  emailService.sendAdminNotification(order).catch(e => console.warn('[CONTACT ADMIN ERR]', e.message));

  broadcastEvent('order:created', {
    orderId: order.orderId,
    customer: order.customer.name,
    businessType: order.customer.businessType,
    total: order.pricing.total,
    type: 'contact_enquiry'
  });

  sendJson(res, 200, {
    success: true,
    orderId: order.orderId,
    message: 'Thank you! Your message has been received. Our team will contact you shortly.'
  });
}

// POST /api/public/quote
async function submitQuote(req, res, body, clientIp) {
  if (!checkPublicRateLimit(clientIp, 'quote')) {
    return sendJson(res, 429, { success: false, message: 'Too many requests. Please try again later.' });
  }

  const validation = validateQuoteSubmission(body);
  if (validation.isSpam) {
    return sendJson(res, 200, {
      success: true,
      orderId: 'CSS-ORD-2026-000000',
      message: 'Your project quotation request has been submitted.'
    });
  }

  if (!validation.valid) {
    return sendJson(res, 400, { success: false, message: validation.errors[0] || 'Please complete all required fields.' });
  }

  // Authoritative server-side pricing & enquiry creation
  const { enquiry, order } = db.createEnquiry(validation.data);

  if (enquiry.email) {
    emailService.sendCustomerAcknowledgement(order).catch(e => console.warn('[EMAIL ACK ERR]', e.message));
  }
  emailService.sendAdminNotification(order).catch(e => console.warn('[EMAIL ADMIN ERR]', e.message));

  broadcastEvent('enquiry:created', {
    enquiryId: enquiry.enquiryId,
    orderId: order.orderId,
    customer: enquiry.customerName,
    businessName: enquiry.businessName,
    package: enquiry.selectedPackage,
    status: enquiry.status,
    total: order.pricing.total
  });

  const requestId = 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

  sendJson(res, 200, {
    success: true,
    enquiryId: enquiry.enquiryId,
    orderId: order.orderId,
    accessToken: order.accessToken,
    total: order.pricing.total,
    requestId,
    message: 'Your project request has been submitted successfully.'
  });
}

// GET /api/public/orders/:id
function getOrderPortal(req, res, orderId, token) {
  const order = db.getOrder(orderId);
  if (!order) return sendJson(res, 404, { success: false, message: 'Order not found.' });
  if (order.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized document access.' });
  }

  sendJson(res, 200, {
    success: true,
    order: {
      orderId: order.orderId,
      status: order.status,
      createdAt: order.createdAt,
      customer: { name: order.customer.name, businessName: order.customer.businessName },
      project: order.project,
      infrastructure: order.infrastructure,
      pricing: order.pricing,
      quotationId: order.quotationId,
      invoiceId: order.invoiceId
    }
  });
}

// GET /api/public/quotations/:id
function getQuotationPortal(req, res, quotationId, token) {
  const q = db.getQuotation(quotationId);
  if (!q) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });
  if (q.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized quotation access.' });
  }

  sendJson(res, 200, { success: true, quotation: q });
}

// GET /api/public/quotations/:id/pdf
async function getQuotationPdf(req, res, quotationId, token) {
  const q = db.getQuotation(quotationId);
  if (!q) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });
  if (q.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized quotation access.' });
  }

  try {
    const pdfBuffer = await generateDocumentPDF('quotation', q);
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${q.quotationId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (err) {
    sendJson(res, 500, { success: false, message: 'Failed to generate quotation PDF.' });
  }
}

// POST /api/public/quotations/:id/approve
async function approveQuotation(req, res, quotationId, token) {
  const q = db.getQuotation(quotationId);
  if (!q) return sendJson(res, 404, { success: false, message: 'Quotation not found.' });
  if (q.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized quotation action.' });
  }

  const updated = db.approveQuotation(quotationId, 'customer');
  emailService.sendQuotationApprovedNotification(updated).catch(e => console.warn('[APPROVED NOTIF ERR]', e.message));

  broadcastEvent('quotation:approved', {
    quotationId: updated.quotationId,
    orderId: updated.orderId,
    total: updated.pricing.total
  });

  sendJson(res, 200, {
    success: true,
    message: 'Quotation approved successfully. Our team will contact you with next steps.',
    quotation: updated
  });
}

// GET /api/public/invoices/:id
function getInvoicePortal(req, res, invoiceId, token) {
  const inv = db.getInvoice(invoiceId);
  if (!inv) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });
  if (inv.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized invoice access.' });
  }

  sendJson(res, 200, { success: true, invoice: inv });
}

// GET /api/public/invoices/:id/pdf
async function getInvoicePdf(req, res, invoiceId, token) {
  const inv = db.getInvoice(invoiceId);
  if (!inv) return sendJson(res, 404, { success: false, message: 'Invoice not found.' });
  if (inv.accessToken !== token) {
    return sendJson(res, 403, { success: false, message: 'Unauthorized invoice access.' });
  }

  try {
    const pdfBuffer = await generateDocumentPDF('invoice', inv);
    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${inv.invoiceNumber || inv.invoiceId}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.end(pdfBuffer);
  } catch (err) {
    sendJson(res, 500, { success: false, message: 'Failed to generate invoice PDF.' });
  }
}

module.exports = {
  getHealth,
  getServices,
  getPricing,
  getProjects,
  submitContact,
  submitQuote,
  getOrderPortal,
  getQuotationPortal,
  getQuotationPdf,
  approveQuotation,
  getInvoicePortal,
  getInvoicePdf
};
