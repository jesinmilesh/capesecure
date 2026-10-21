/**
 * Cape Secure Solutions — Persistent JSON Data Store & Order Manager
 * Thread-safe file-backed storage for Orders, Quotations, Invoices, Audit Logs, and Email Logs.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getCompanyConfig } = require('./companyConfig');
const { calculateOrderTotals } = require('./pricingEngine');

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotations.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_logs.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.warn(`[DB] Error reading ${path.basename(filePath)}:`, err.message);
  }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`[DB] Error writing ${path.basename(filePath)}:`, err.message);
    throw err;
  }
}

// Generate unique sequential IDs (e.g., CSS-ORD-2026-000001)
function generateNextId(prefixKey) {
  const config = getCompanyConfig();
  const year = new Date().getFullYear();
  const prefix = (config.prefixes && config.prefixes[prefixKey]) || `CSS-${prefixKey.toUpperCase()}`;

  let list = [];
  if (prefixKey === 'order') list = readJsonFile(ORDERS_FILE, []);
  else if (prefixKey === 'quotation') list = readJsonFile(QUOTES_FILE, []);
  else if (prefixKey === 'invoice') list = readJsonFile(INVOICES_FILE, []);

  // Find max sequence in current year
  const regex = new RegExp(`^${prefix}-${year}-(\\d{6})$`);
  let maxSeq = 0;
  for (const item of list) {
    const id = item.orderId || item.quotationId || item.invoiceId || '';
    const match = id.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(6, '0');
  return `${prefix}-${year}-${nextSeq}`;
}

// Generate secure random access token for client portal links
function generateAccessToken() {
  return crypto.randomBytes(18).toString('hex');
}

// -----------------------------------------------------------------------------
// AUDIT LOGGING
// -----------------------------------------------------------------------------
function recordAuditLog(action, entityId, details = {}, actor = 'system') {
  const logs = readJsonFile(AUDIT_FILE, []);
  const entry = {
    id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    action,
    entityId,
    actor,
    details
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop(); // keep last 500 entries
  writeJsonFile(AUDIT_FILE, logs);
  return entry;
}

function getAuditLogs(limit = 100) {
  const logs = readJsonFile(AUDIT_FILE, []);
  return logs.slice(0, limit);
}

// -----------------------------------------------------------------------------
// ORDERS
// -----------------------------------------------------------------------------
function createOrder(customerPayload) {
  const orders = readJsonFile(ORDERS_FILE, []);
  const orderId = generateNextId('order');
  const accessToken = generateAccessToken();
  const pricing = calculateOrderTotals(customerPayload);

  const order = {
    orderId,
    accessToken,
    status: 'enquiry', // enquiry -> quotation -> approved -> invoiceGenerated -> paymentPending -> paid -> development -> testing -> delivered
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    customer: {
      name: String(customerPayload.name || 'Client').trim(),
      businessName: String(customerPayload.businessName || customerPayload.company || '').trim(),
      email: String(customerPayload.email || '').trim().toLowerCase(),
      phone: String(customerPayload.phone || '').trim(),
      whatsapp: String(customerPayload.whatsapp || customerPayload.phone || '').trim(),
      businessType: String(customerPayload.businessType || customerPayload.category || 'Standard').trim(),
      address: String(customerPayload.address || '').trim(),
      city: String(customerPayload.city || 'Kanyakumari').trim(),
      state: String(customerPayload.state || 'Tamil Nadu').trim(),
      country: String(customerPayload.country || 'India').trim(),
      pincode: String(customerPayload.pincode || '').trim()
    },

    project: {
      package: customerPayload.package || customerPayload.plan || 'starter',
      service: customerPayload.service || customerPayload.businessType || 'Website Development',
      requirements: Array.isArray(customerPayload.requirements) ? customerPayload.requirements : [],
      customRequirements: String(customerPayload.message || customerPayload.notes || '').trim(),
      referenceWebsites: String(customerPayload.referenceWebsites || '').trim(),
      targetLaunchDate: customerPayload.targetLaunchDate || null
    },

    infrastructure: {
      domain: customerPayload.domain || (customerPayload.needDomain ? 'Required' : 'Client Provided'),
      hosting: customerPayload.hosting || (customerPayload.needHosting ? 'Standard Cloud' : 'Client Provided'),
      maintenance: customerPayload.needMaintenance ? 'Active Care Plan' : 'Standard Delivery Warranty'
    },

    pricing,
    quotationId: null,
    invoiceId: null,
    kickoffDate: null,
    deliveryDate: null
  };

  orders.unshift(order);
  writeJsonFile(ORDERS_FILE, orders);
  recordAuditLog('ORDER_CREATED', orderId, { customer: order.customer.name, total: pricing.total });
  return order;
}

function getOrder(orderId) {
  const orders = readJsonFile(ORDERS_FILE, []);
  return orders.find((o) => o.orderId === orderId) || null;
}

function getOrderByToken(orderId, token) {
  const order = getOrder(orderId);
  if (!order || order.accessToken !== token) return null;
  return order;
}

function getAllOrders() {
  return readJsonFile(ORDERS_FILE, []);
}

function updateOrderStatus(orderId, newStatus, details = {}, actor = 'admin') {
  const orders = readJsonFile(ORDERS_FILE, []);
  const idx = orders.findIndex((o) => o.orderId === orderId);
  if (idx === -1) return null;

  orders[idx].status = newStatus;
  orders[idx].updatedAt = new Date().toISOString();
  if (details.kickoffDate) orders[idx].kickoffDate = details.kickoffDate;
  if (details.deliveryDate) orders[idx].deliveryDate = details.deliveryDate;
  if (details.quotationId) orders[idx].quotationId = details.quotationId;
  if (details.invoiceId) orders[idx].invoiceId = details.invoiceId;

  writeJsonFile(ORDERS_FILE, orders);
  recordAuditLog('ORDER_STATUS_UPDATED', orderId, { newStatus, ...details }, actor);
  return orders[idx];
}

// -----------------------------------------------------------------------------
// QUOTATIONS
// -----------------------------------------------------------------------------
function createQuotation(orderId, quotationData = {}, actor = 'admin') {
  const order = getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found.`);

  const quotations = readJsonFile(QUOTES_FILE, []);
  const quotationId = generateNextId('quotation');
  const accessToken = generateAccessToken();

  // Calculate pricing based on custom items or order defaults
  const customItems = quotationData.items || order.pricing.items;
  const discount = quotationData.discount !== undefined ? quotationData.discount : order.pricing.discount;
  const pricing = calculateOrderTotals({}, customItems, discount, 0);

  const issueDate = quotationData.issueDate || new Date().toISOString().split('T')[0];
  const validUntil = quotationData.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  const quotation = {
    quotationId,
    orderId,
    accessToken,
    status: 'sent', // sent -> approved -> rejected -> expired
    issueDate,
    validUntil,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: order.customer,
    project: order.project,
    pricing,
    notes: quotationData.notes || 'Based on your requirements, we have prepared this quotation for your digital solution.',
    terms: quotationData.terms || getCompanyConfig().terms.quotation,
    approvedAt: null
  };

  quotations.unshift(quotation);
  writeJsonFile(QUOTES_FILE, quotations);

  // Link quotation to order
  updateOrderStatus(orderId, 'quotation', { quotationId }, actor);
  recordAuditLog('QUOTATION_CREATED', quotationId, { orderId, total: pricing.total }, actor);
  return quotation;
}

function getQuotation(quotationId) {
  const quotations = readJsonFile(QUOTES_FILE, []);
  return quotations.find((q) => q.quotationId === quotationId) || null;
}

function getQuotationByToken(quotationId, token) {
  const q = getQuotation(quotationId);
  if (!q || q.accessToken !== token) return null;
  return q;
}

function getAllQuotations() {
  return readJsonFile(QUOTES_FILE, []);
}

function approveQuotation(quotationId, actor = 'customer') {
  const quotations = readJsonFile(QUOTES_FILE, []);
  const idx = quotations.findIndex((q) => q.quotationId === quotationId);
  if (idx === -1) return null;

  quotations[idx].status = 'approved';
  quotations[idx].approvedAt = new Date().toISOString();
  quotations[idx].updatedAt = new Date().toISOString();
  writeJsonFile(QUOTES_FILE, quotations);

  const orderId = quotations[idx].orderId;
  updateOrderStatus(orderId, 'approved', { quotationApproved: true }, actor);
  recordAuditLog('QUOTATION_APPROVED', quotationId, { orderId }, actor);

  // Auto-generate invoice upon approval if none exists
  let invoice = null;
  const existingInvoices = getAllInvoices().filter((i) => i.quotationId === quotationId);
  if (!existingInvoices.length) {
    invoice = createInvoice(orderId, { quotationId }, 'system');
  } else {
    invoice = existingInvoices[0];
  }

  return { quotation: quotations[idx], invoice };
}

// -----------------------------------------------------------------------------
// INVOICES
// -----------------------------------------------------------------------------
function createInvoice(orderId, invoiceData = {}, actor = 'admin') {
  const order = getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found.`);

  const invoices = readJsonFile(INVOICES_FILE, []);
  const invoiceId = generateNextId('invoice');
  const accessToken = generateAccessToken();

  let quotation = null;
  if (invoiceData.quotationId) {
    quotation = getQuotation(invoiceData.quotationId);
  }

  const customItems = invoiceData.items || (quotation ? quotation.pricing.items : order.pricing.items);
  const discount = invoiceData.discount !== undefined ? invoiceData.discount : (quotation ? quotation.pricing.discount : order.pricing.discount);
  const amountPaid = invoiceData.amountPaid !== undefined ? invoiceData.amountPaid : 0;

  const pricing = calculateOrderTotals({}, customItems, discount, amountPaid);

  const invoiceDate = invoiceData.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDate = invoiceData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const invoice = {
    invoiceId,
    orderId,
    quotationId: invoiceData.quotationId || order.quotationId || null,
    accessToken,
    status: pricing.paymentStatus, // PENDING, PARTIALLY PAID, PAID, CANCELLED
    invoiceDate,
    dueDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: order.customer,
    project: order.project,
    pricing,
    payments: [],
    notes: invoiceData.notes || 'Thank you for choosing Cape Secure Solutions. Where Three Seas Meet, Security Begins.',
    terms: invoiceData.terms || getCompanyConfig().terms.invoice
  };

  invoices.unshift(invoice);
  writeJsonFile(INVOICES_FILE, invoices);

  // Link to order
  updateOrderStatus(orderId, 'invoiceGenerated', { invoiceId }, actor);
  recordAuditLog('INVOICE_CREATED', invoiceId, { orderId, total: pricing.total }, actor);
  return invoice;
}

function getInvoice(invoiceId) {
  const invoices = readJsonFile(INVOICES_FILE, []);
  return invoices.find((i) => i.invoiceId === invoiceId) || null;
}

function getInvoiceByToken(invoiceId, token) {
  const inv = getInvoice(invoiceId);
  if (!inv || inv.accessToken !== token) return null;
  return inv;
}

function getAllInvoices() {
  return readJsonFile(INVOICES_FILE, []);
}

function recordPayment(invoiceId, paymentData = {}, actor = 'admin') {
  const invoices = readJsonFile(INVOICES_FILE, []);
  const idx = invoices.findIndex((i) => i.invoiceId === invoiceId);
  if (idx === -1) throw new Error(`Invoice ${invoiceId} not found.`);

  const inv = invoices[idx];
  const amount = Math.max(0, parseFloat(paymentData.amount) || 0);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const paymentRecord = {
    paymentId: 'PAY-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    amount,
    method: paymentData.method || 'UPI', // UPI, Bank Transfer, Gateway, Cash, Other
    transactionId: String(paymentData.transactionId || paymentData.reference || 'REF-' + Date.now()).trim(),
    paymentDate: paymentData.paymentDate || new Date().toISOString().split('T')[0],
    notes: String(paymentData.notes || '').trim(),
    recordedAt: new Date().toISOString(),
    recordedBy: actor
  };

  if (!Array.isArray(inv.payments)) inv.payments = [];
  inv.payments.push(paymentRecord);

  // Recalculate totals and balance
  const totalPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
  const recalculated = calculateOrderTotals({}, inv.pricing.items, inv.pricing.discount, totalPaid);
  inv.pricing = recalculated;
  inv.status = recalculated.paymentStatus;
  inv.updatedAt = new Date().toISOString();

  writeJsonFile(INVOICES_FILE, invoices);

  // Update related order status
  const orderNewStatus = recalculated.paymentStatus === 'PAID' ? 'paid' : 'partiallyPaid';
  updateOrderStatus(inv.orderId, orderNewStatus, { totalPaid, balance: recalculated.balance }, actor);

  recordAuditLog('PAYMENT_RECORDED', invoiceId, { amount, method: paymentRecord.method, balance: recalculated.balance }, actor);
  return { invoice: inv, payment: paymentRecord };
}

// -----------------------------------------------------------------------------
// EMAIL LOGGING
// -----------------------------------------------------------------------------
function recordEmailLog(logData) {
  const logs = readJsonFile(EMAIL_LOGS_FILE, []);
  const entry = {
    id: 'EML-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    orderId: logData.orderId || null,
    invoiceId: logData.invoiceId || null,
    quotationId: logData.quotationId || null,
    recipient: logData.recipient,
    emailType: logData.emailType,
    subject: logData.subject,
    status: logData.status || 'sent', // sent, failed, queued
    providerMessageId: logData.providerMessageId || null,
    error: logData.error || null
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  writeJsonFile(EMAIL_LOGS_FILE, logs);
  return entry;
}

function getEmailLogs(limit = 100) {
  return readJsonFile(EMAIL_LOGS_FILE, []).slice(0, limit);
}

module.exports = {
  createOrder,
  getOrder,
  getOrderByToken,
  getAllOrders,
  updateOrderStatus,
  createQuotation,
  getQuotation,
  getQuotationByToken,
  getAllQuotations,
  approveQuotation,
  createInvoice,
  getInvoice,
  getInvoiceByToken,
  getAllInvoices,
  recordPayment,
  recordAuditLog,
  getAuditLogs,
  recordEmailLog,
  getEmailLogs
};
