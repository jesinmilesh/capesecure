/**
 * Cape Secure Solutions — Production Database Access & Aggregation Layer
 * 
 * Manages atomic persistent storage for Enquiries, Orders, Quotations, Invoices, Customers,
 * Audit Logs, Email Logs, and User Authentication.
 * Enforces server-side ID uniqueness, controlled status state transitions, and zero-trust pricing calculations.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getCompanyConfig } = require('../config/company');
const { calculateOrderTotals } = require('../services/pricingEngine');
const { generateNextId, generateAccessToken } = require('../utils/idGenerator');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const ENQUIRIES_FILE = path.join(DATA_DIR, 'enquiries.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const QUOTES_FILE = path.join(DATA_DIR, 'quotations.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit_logs.json');
const EMAIL_LOGS_FILE = path.join(DATA_DIR, 'email_logs.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REVOKED_TOKENS_FILE = path.join(DATA_DIR, 'revoked_tokens.json');

// File I/O Helpers
function readJsonFile(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      return content ? JSON.parse(content) : defaultVal;
    }
  } catch (err) {
    console.warn(`[DB] Error reading ${path.basename(filePath)}:`, err.message);
  }
  return defaultVal;
}

function writeJsonFile(filePath, data) {
  try {
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[DB] Error writing ${path.basename(filePath)}:`, err.message);
    throw err;
  }
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
// CONTROLLED ENQUIRY STATUS WORKFLOW STATE MACHINE
// -----------------------------------------------------------------------------
const ALLOWED_STATUS_TRANSITIONS = {
  'NEW': ['REVIEWING', 'REJECTED', 'CANCELLED', 'ON_HOLD'],
  'REVIEWING': ['CONTACTED', 'QUOTATION_PREPARED', 'REJECTED', 'CANCELLED', 'ON_HOLD'],
  'CONTACTED': ['QUOTATION_PREPARED', 'REVIEWING', 'REJECTED', 'CANCELLED', 'ON_HOLD'],
  'QUOTATION_PREPARED': ['QUOTATION_SENT', 'REVIEWING', 'CANCELLED', 'ON_HOLD'],
  'QUOTATION_SENT': ['CUSTOMER_APPROVED', 'REJECTED', 'CANCELLED', 'ON_HOLD'],
  'CUSTOMER_APPROVED': ['PAYMENT_PENDING', 'PROJECT_STARTED', 'CANCELLED'],
  'PAYMENT_PENDING': ['PAYMENT_RECEIVED', 'CANCELLED', 'ON_HOLD'],
  'PAYMENT_RECEIVED': ['PROJECT_STARTED', 'IN_PROGRESS'],
  'PROJECT_STARTED': ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  'IN_PROGRESS': ['COMPLETED', 'ON_HOLD', 'CANCELLED'],
  'COMPLETED': ['CLOSED'],
  'ON_HOLD': ['NEW', 'REVIEWING', 'CONTACTED', 'QUOTATION_PREPARED', 'IN_PROGRESS', 'CANCELLED'],
  'REJECTED': ['REVIEWING'],
  'CANCELLED': ['NEW'],
  'CLOSED': []
};

// -----------------------------------------------------------------------------
// CUSTOMER ENQUIRIES
// -----------------------------------------------------------------------------
function createEnquiry(payload = {}) {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  const enquiryId = generateNextId('enquiry', enquiries);
  const _id = 'enq_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');

  const customerName = String(payload.name || payload.customerName || 'Client').trim();
  const businessName = String(payload.businessName || payload.company || '').trim();
  const businessType = String(payload.businessType || payload.category || 'Digital Solution').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = String(payload.phone || payload.whatsapp || '').trim();
  const whatsappNumber = String(payload.whatsappNumber || payload.whatsapp || phone).trim();

  const customerKey = (email || phone || customerName).toLowerCase();
  const customerId = 'CUST-' + Buffer.from(customerKey).toString('hex').slice(0, 8).toUpperCase();

  const selectedPackage = String(payload.selectedPackage || payload.plan || payload.package || 'starter').toLowerCase();
  
  const requirements = Array.isArray(payload.requirements)
    ? payload.requirements
    : typeof payload.requirements === 'string'
    ? payload.requirements.split(',').map((s) => s.trim())
    : [];

  const selectedServices = Array.isArray(payload.selectedServices)
    ? payload.selectedServices
    : Array.isArray(payload.addons)
    ? payload.addons
    : [];

  const domainRequired = Boolean(payload.domainRequired ?? payload.needDomain ?? false);
  const hostingRequired = Boolean(payload.hostingRequired ?? payload.needHosting ?? false);
  const maintenanceRequired = Boolean(payload.maintenanceRequired ?? payload.needMaintenance ?? false);
  const estimatedBudget = String(payload.estimatedBudget || payload.budget || 'standard').trim();
  const additionalRequirements = String(payload.additionalRequirements || payload.notes || payload.message || '').trim();

  const now = new Date().toISOString();

  // Create authoritative enquiry object matching required production schema
  const enquiry = {
    _id,
    enquiryId,
    customerId,
    businessName,
    businessType,
    customerName,
    email,
    phone,
    whatsappNumber,
    requirements,
    selectedPackage,
    selectedServices,
    domainRequired,
    hostingRequired,
    maintenanceRequired,
    estimatedBudget,
    additionalRequirements,
    status: 'NEW',
    priority: payload.priority || 'NORMAL',
    source: payload.source || 'public_website',
    createdAt: now,
    updatedAt: now,
    lastActionAt: now,
    assignedAdmin: null,
    internalNotes: [],
    quotationId: null,
    orderId: null
  };

  // Also create linked Order record for financial & pricing pipeline
  const order = createOrder({
    name: customerName,
    businessName,
    businessType,
    email,
    phone,
    whatsapp: whatsappNumber,
    plan: selectedPackage,
    requirements,
    needDomain: domainRequired,
    domain: payload.domain || (domainRequired ? 'Required' : 'Client Provided'),
    needHosting: hostingRequired,
    needMaintenance: maintenanceRequired,
    needSecurity: Boolean(payload.needSecurity),
    needEmail: Boolean(payload.needEmail),
    needSeo: Boolean(payload.needSeo),
    notes: additionalRequirements,
    enquiryId: enquiry.enquiryId
  });

  enquiry.orderId = order.orderId;
  enquiries.unshift(enquiry);
  writeJsonFile(ENQUIRIES_FILE, enquiries);

  recordAuditLog('ENQUIRY_CREATED', enquiryId, {
    customerName,
    businessName,
    selectedPackage,
    orderId: order.orderId
  }, 'public_user');

  return { enquiry, order };
}

function getEnquiry(enquiryId) {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  return enquiries.find((e) => e.enquiryId === enquiryId || e._id === enquiryId) || null;
}

function getAllEnquiries() {
  return readJsonFile(ENQUIRIES_FILE, []);
}

function updateEnquiryStatus(enquiryId, newStatus, actor = 'admin') {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  const idx = enquiries.findIndex((e) => e.enquiryId === enquiryId || e._id === enquiryId);
  if (idx === -1) {
    throw new Error(`Enquiry ${enquiryId} not found.`);
  }

  const enquiry = enquiries[idx];
  const currentStatus = (enquiry.status || 'NEW').toUpperCase();
  const targetStatus = String(newStatus).toUpperCase();

  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowed.join(', ') || 'None'}`);
  }

  enquiry.status = targetStatus;
  enquiry.updatedAt = new Date().toISOString();
  enquiry.lastActionAt = new Date().toISOString();

  writeJsonFile(ENQUIRIES_FILE, enquiries);
  recordAuditLog('ENQUIRY_STATUS_CHANGED', enquiry.enquiryId, {
    from: currentStatus,
    to: targetStatus
  }, actor);

  return enquiry;
}

function assignEnquiry(enquiryId, adminEmail, actor = 'admin') {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  const idx = enquiries.findIndex((e) => e.enquiryId === enquiryId || e._id === enquiryId);
  if (idx === -1) throw new Error(`Enquiry ${enquiryId} not found.`);

  enquiries[idx].assignedAdmin = String(adminEmail || '').trim().toLowerCase();
  enquiries[idx].updatedAt = new Date().toISOString();
  enquiries[idx].lastActionAt = new Date().toISOString();

  writeJsonFile(ENQUIRIES_FILE, enquiries);
  recordAuditLog('ENQUIRY_ASSIGNED', enquiries[idx].enquiryId, { assignedTo: adminEmail }, actor);
  return enquiries[idx];
}

function addEnquiryNote(enquiryId, noteText, actor = 'admin') {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  const idx = enquiries.findIndex((e) => e.enquiryId === enquiryId || e._id === enquiryId);
  if (idx === -1) throw new Error(`Enquiry ${enquiryId} not found.`);

  const cleanNote = String(noteText || '').trim();
  if (!cleanNote) throw new Error('Note text cannot be empty.');

  enquiries[idx].internalNotes = enquiries[idx].internalNotes || [];
  enquiries[idx].internalNotes.push({
    id: 'NOTE-' + Date.now().toString(36),
    author: actor,
    text: cleanNote,
    timestamp: new Date().toISOString()
  });

  enquiries[idx].updatedAt = new Date().toISOString();
  enquiries[idx].lastActionAt = new Date().toISOString();

  writeJsonFile(ENQUIRIES_FILE, enquiries);
  recordAuditLog('ENQUIRY_NOTE_ADDED', enquiries[idx].enquiryId, { author: actor }, actor);
  return enquiries[idx];
}

// -----------------------------------------------------------------------------
// ORDERS
// -----------------------------------------------------------------------------
function createOrder(customerPayload) {
  const orders = readJsonFile(ORDERS_FILE, []);
  const orderId = generateNextId('order', orders);
  const accessToken = generateAccessToken();
  const pricing = calculateOrderTotals(customerPayload);

  const order = {
    orderId,
    accessToken,
    enquiryId: customerPayload.enquiryId || null,
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
      package: String(customerPayload.plan || customerPayload.package || 'starter').toLowerCase(),
      requirements: Array.isArray(customerPayload.requirements)
        ? customerPayload.requirements
        : typeof customerPayload.requirements === 'string'
        ? customerPayload.requirements.split(',').map((s) => s.trim())
        : [],
      notes: String(customerPayload.notes || customerPayload.message || '').trim(),
      businessType: String(customerPayload.businessType || customerPayload.category || 'Standard').trim()
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
  recordAuditLog('ORDER_STATUS_CHANGED', orderId, { newStatus, ...details }, actor);
  return orders[idx];
}

// -----------------------------------------------------------------------------
// QUOTATIONS
// -----------------------------------------------------------------------------
function createQuotation(orderOrEnquiryId, quotationData = {}, actor = 'admin') {
  const orders = readJsonFile(ORDERS_FILE, []);
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);

  let order = orders.find((o) => o.orderId === orderOrEnquiryId || o.enquiryId === orderOrEnquiryId);
  let enquiry = enquiries.find((e) => e.enquiryId === orderOrEnquiryId || e.orderId === orderOrEnquiryId);

  if (!order && enquiry) {
    order = orders.find((o) => o.orderId === enquiry.orderId);
  }

  if (!order) throw new Error(`Referenced order or enquiry ${orderOrEnquiryId} not found.`);

  const quotations = readJsonFile(QUOTES_FILE, []);
  const quotationId = generateNextId('quotation', quotations);
  const accessToken = generateAccessToken();

  // Calculate pricing based on custom items or order defaults
  const customItems = quotationData.items || order.pricing.items;
  const discount = quotationData.discount !== undefined ? quotationData.discount : order.pricing.discount;
  const pricing = calculateOrderTotals({}, customItems, discount, 0);

  const issueDate = quotationData.issueDate || new Date().toISOString().split('T')[0];
  const validUntil = quotationData.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  const quotation = {
    quotationId,
    orderId: order.orderId,
    enquiryId: order.enquiryId || (enquiry ? enquiry.enquiryId : null),
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
  updateOrderStatus(order.orderId, 'quotation', { quotationId }, actor);

  // Update enquiry status if exists
  if (enquiry) {
    try {
      updateEnquiryStatus(enquiry.enquiryId, 'QUOTATION_PREPARED', actor);
    } catch (e) {}
  }

  recordAuditLog('QUOTATION_CREATED', quotationId, { orderId: order.orderId, total: pricing.total }, actor);
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
  updateOrderStatus(quotations[idx].orderId, 'approved', {}, actor);

  // Update linked enquiry if exists
  if (quotations[idx].enquiryId) {
    try {
      updateEnquiryStatus(quotations[idx].enquiryId, 'CUSTOMER_APPROVED', actor);
    } catch (e) {}
  }

  recordAuditLog('QUOTATION_APPROVED', quotationId, { approvedBy: actor }, actor);
  return quotations[idx];
}

// -----------------------------------------------------------------------------
// INVOICES
// -----------------------------------------------------------------------------
function createInvoice(quotationIdOrOrderId, invoiceData = {}, actor = 'admin') {
  const quotations = readJsonFile(QUOTES_FILE, []);
  const orders = readJsonFile(ORDERS_FILE, []);
  const invoices = readJsonFile(INVOICES_FILE, []);

  let quotation = quotations.find((q) => q.quotationId === quotationIdOrOrderId);
  let order = null;

  if (quotation) {
    order = orders.find((o) => o.orderId === quotation.orderId);
  } else {
    order = orders.find((o) => o.orderId === quotationIdOrOrderId || o.enquiryId === quotationIdOrOrderId);
  }

  if (!order) throw new Error(`Referenced order or quotation not found for ${quotationIdOrOrderId}.`);

  const invoiceId = generateNextId('invoice', invoices);
  const accessToken = generateAccessToken();

  const customItems = invoiceData.items || (quotation ? quotation.pricing.items : order.pricing.items);
  const discount = invoiceData.discount !== undefined ? invoiceData.discount : (quotation ? quotation.pricing.discount : order.pricing.discount);
  const pricing = calculateOrderTotals({}, customItems, discount, 0);

  const invoiceDate = invoiceData.invoiceDate || new Date().toISOString().split('T')[0];
  const dueDate = invoiceData.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const invoice = {
    invoiceId,
    invoiceNumber: invoiceId,
    orderId: order.orderId,
    quotationId: quotation ? quotation.quotationId : order.quotationId,
    enquiryId: order.enquiryId || null,
    accessToken,
    status: 'unpaid', // unpaid -> partiallyPaid -> paid -> cancelled
    invoiceDate,
    dueDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customer: order.customer,
    project: order.project,
    pricing,
    payments: [],
    notes: invoiceData.notes || 'Thank you for choosing Cape Secure Solutions. We appreciate your partnership.',
    terms: invoiceData.terms || getCompanyConfig().terms.invoice
  };

  invoices.unshift(invoice);
  writeJsonFile(INVOICES_FILE, invoices);

  // Update order linkage
  updateOrderStatus(order.orderId, 'invoiceGenerated', { invoiceId }, actor);

  // Update linked enquiry if exists
  if (order.enquiryId) {
    try {
      updateEnquiryStatus(order.enquiryId, 'PAYMENT_PENDING', actor);
    } catch (e) {}
  }

  recordAuditLog('INVOICE_GENERATED', invoiceId, { orderId: order.orderId, total: pricing.total }, actor);
  return invoice;
}

function getInvoice(invoiceId) {
  const invoices = readJsonFile(INVOICES_FILE, []);
  return invoices.find((i) => i.invoiceId === invoiceId || i.invoiceNumber === invoiceId) || null;
}

function getInvoiceByToken(invoiceId, token) {
  const inv = getInvoice(invoiceId);
  if (!inv || inv.accessToken !== token) return null;
  return inv;
}

function getAllInvoices() {
  return readJsonFile(INVOICES_FILE, []);
}

function recordPayment(invoiceId, paymentData, actor = 'admin') {
  const invoices = readJsonFile(INVOICES_FILE, []);
  const idx = invoices.findIndex((i) => i.invoiceId === invoiceId || i.invoiceNumber === invoiceId);
  if (idx === -1) throw new Error(`Invoice ${invoiceId} not found.`);

  const inv = invoices[idx];
  const amount = Math.max(0, parseFloat(paymentData.amount) || 0);
  if (amount <= 0) throw new Error('Payment amount must be greater than zero.');

  const paymentRecord = {
    paymentId: 'PAY-' + Date.now().toString(36).toUpperCase(),
    date: paymentData.date || new Date().toISOString(),
    amount,
    method: paymentData.method || 'UPI',
    transactionRef: paymentData.transactionRef || paymentData.ref || 'Direct',
    notes: paymentData.notes || '',
    recordedBy: actor
  };

  inv.payments = inv.payments || [];
  inv.payments.push(paymentRecord);

  const totalPaid = inv.payments.reduce((acc, p) => acc + p.amount, 0);
  inv.pricing.amountPaid = totalPaid;
  inv.pricing.balance = Math.max(0, inv.pricing.total - totalPaid);

  if (inv.pricing.balance <= 0) {
    inv.status = 'paid';
    inv.pricing.paymentStatus = 'PAID';
    updateOrderStatus(inv.orderId, 'paid', {}, actor);
    if (inv.enquiryId) {
      try { updateEnquiryStatus(inv.enquiryId, 'PAYMENT_RECEIVED', actor); } catch (e) {}
    }
  } else {
    inv.status = 'partiallyPaid';
    inv.pricing.paymentStatus = 'PARTIALLY PAID';
    updateOrderStatus(inv.orderId, 'paymentPending', {}, actor);
    if (inv.enquiryId) {
      try { updateEnquiryStatus(inv.enquiryId, 'PAYMENT_PENDING', actor); } catch (e) {}
    }
  }

  inv.updatedAt = new Date().toISOString();
  writeJsonFile(INVOICES_FILE, invoices);

  recordAuditLog('PAYMENT_RECORDED', invoiceId, {
    paymentId: paymentRecord.paymentId,
    amount,
    method: paymentRecord.method,
    balance: inv.pricing.balance
  }, actor);

  return { invoice: inv, payment: paymentRecord };
}

// -----------------------------------------------------------------------------
// CUSTOMERS (Consolidated from Enquiries, Orders & Invoices)
// -----------------------------------------------------------------------------
function getCustomers() {
  const enquiries = readJsonFile(ENQUIRIES_FILE, []);
  const orders = readJsonFile(ORDERS_FILE, []);
  const invoices = readJsonFile(INVOICES_FILE, []);
  const map = new Map();

  for (const enq of enquiries) {
    const key = (enq.email || enq.phone || enq.customerName || '').toLowerCase();
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        customerId: enq.customerId || 'CUST-' + Buffer.from(key).toString('hex').slice(0, 8).toUpperCase(),
        name: enq.customerName,
        businessName: enq.businessName,
        email: enq.email,
        phone: enq.phone,
        city: 'Kanyakumari',
        state: 'Tamil Nadu',
        totalEnquiries: 0,
        totalOrders: 0,
        totalSpent: 0,
        enquiries: [],
        orders: [],
        invoices: [],
        firstSeen: enq.createdAt,
        lastActive: enq.createdAt
      });
    }

    const c = map.get(key);
    c.totalEnquiries += 1;
    c.enquiries.push(enq.enquiryId);
    if (new Date(enq.createdAt) > new Date(c.lastActive)) c.lastActive = enq.createdAt;
  }

  for (const o of orders) {
    const key = (o.customer.email || o.customer.phone || o.customer.name || '').toLowerCase();
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        customerId: 'CUST-' + Buffer.from(key).toString('hex').slice(0, 8).toUpperCase(),
        name: o.customer.name,
        businessName: o.customer.businessName,
        email: o.customer.email,
        phone: o.customer.phone,
        city: o.customer.city,
        state: o.customer.state,
        totalEnquiries: 0,
        totalOrders: 0,
        totalSpent: 0,
        enquiries: [],
        orders: [],
        invoices: [],
        firstSeen: o.createdAt,
        lastActive: o.createdAt
      });
    }

    const c = map.get(key);
    c.totalOrders += 1;
    c.orders.push(o.orderId);
    if (new Date(o.createdAt) > new Date(c.lastActive)) c.lastActive = o.createdAt;
  }

  for (const inv of invoices) {
    const key = (inv.customer.email || inv.customer.phone || inv.customer.name || '').toLowerCase();
    if (map.has(key)) {
      const c = map.get(key);
      c.invoices.push(inv.invoiceId);
      const paid = (inv.payments || []).reduce((acc, p) => acc + p.amount, 0);
      c.totalSpent += paid;
    }
  }

  return Array.from(map.values());
}

// -----------------------------------------------------------------------------
// EMAIL LOGS
// -----------------------------------------------------------------------------
function recordEmailLog(template, recipient, subject, status, details = {}) {
  const logs = readJsonFile(EMAIL_LOGS_FILE, []);
  const entry = {
    id: 'EML-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toISOString(),
    template,
    recipient,
    subject,
    status,
    details
  };
  logs.unshift(entry);
  if (logs.length > 500) logs.pop();
  writeJsonFile(EMAIL_LOGS_FILE, logs);
  return entry;
}

function getEmailLogs(limit = 100) {
  const logs = readJsonFile(EMAIL_LOGS_FILE, []);
  return logs.slice(0, limit);
}

// -----------------------------------------------------------------------------
// USERS & REVOKED TOKENS
// -----------------------------------------------------------------------------
function getUsers() {
  return readJsonFile(USERS_FILE, []);
}

function getUserByEmail(email) {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === String(email).trim().toLowerCase()) || null;
}

function saveUser(user) {
  const users = getUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push({ ...user, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  writeJsonFile(USERS_FILE, users);
  return user;
}

function isTokenRevoked(token) {
  const tokens = readJsonFile(REVOKED_TOKENS_FILE, []);
  return tokens.includes(token);
}

function revokeToken(token) {
  const tokens = readJsonFile(REVOKED_TOKENS_FILE, []);
  if (!tokens.includes(token)) {
    tokens.push(token);
    if (tokens.length > 1000) tokens.shift();
    writeJsonFile(REVOKED_TOKENS_FILE, tokens);
  }
}

// -----------------------------------------------------------------------------
// DASHBOARD METRICS
// -----------------------------------------------------------------------------
function getDashboardMetrics() {
  const enquiries = getAllEnquiries();
  const orders = getAllOrders();
  const quotations = getAllQuotations();
  const invoices = getAllInvoices();
  const customers = getCustomers();

  let totalRevenue = 0;
  let pendingRevenue = 0;

  for (const inv of invoices) {
    const paid = (inv.payments || []).reduce((acc, p) => acc + p.amount, 0);
    totalRevenue += paid;
    pendingRevenue += Math.max(0, (inv.pricing.total || 0) - paid);
  }

  const activeProjects = orders.filter((o) =>
    ['development', 'testing', 'invoiceGenerated', 'paymentPending', 'approved'].includes(o.status)
  ).length;

  const newEnquiriesCount = enquiries.filter(e => e.status === 'NEW').length;
  const reviewingEnquiriesCount = enquiries.filter(e => e.status === 'REVIEWING').length;
  const quotationPendingCount = enquiries.filter(e => ['NEW', 'REVIEWING', 'CONTACTED'].includes(e.status)).length;
  const paymentPendingCount = invoices.filter(i => i.status !== 'paid').length;

  return {
    metrics: {
      totalEnquiries: enquiries.length,
      newEnquiries: newEnquiriesCount,
      reviewingEnquiries: reviewingEnquiriesCount,
      quotationPending: quotationPendingCount,
      paymentPending: paymentPendingCount,
      totalOrders: orders.length,
      activeProjects,
      totalQuotations: quotations.length,
      approvedQuotations: quotations.filter((q) => q.status === 'approved').length,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter((i) => i.status === 'paid').length,
      totalCustomers: customers.length,
      totalRevenue,
      pendingRevenue
    },
    recentEnquiries: enquiries.slice(0, 6),
    recentOrders: orders.slice(0, 5),
    recentInvoices: invoices.slice(0, 5),
    recentAudits: getAuditLogs(10)
  };
}

module.exports = {
  ALLOWED_STATUS_TRANSITIONS,
  createEnquiry,
  getEnquiry,
  getAllEnquiries,
  updateEnquiryStatus,
  assignEnquiry,
  addEnquiryNote,
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
  getCustomers,
  getDashboardMetrics,
  recordAuditLog,
  getAuditLogs,
  recordEmailLog,
  getEmailLogs,
  getUsers,
  getUserByEmail,
  saveUser,
  isTokenRevoked,
  revokeToken
};
