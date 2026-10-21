/**
 * Cape Secure Solutions — Centralized Transactional Email Engine
 * 8 Professional Responsive Email Templates with PDF Attachment Support and Delivery Logging.
 * Dispatches via Brevo REST API with graceful local fallback logging.
 */

const { getCompanyConfig } = require('../config/company');
const { recordEmailLog } = require('../models/db');
const { generateDocumentPDF } = require('./pdfService');
const { wrapEmailTemplate } = require('../templates/email/emailTemplates');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const ADMIN_EMAIL = process.env.BREVO_ADMIN_EMAIL || 'capesecuresolutions@gmail.com';
const SENDER_NAME = process.env.BREVO_SENDER || 'Cape Secure Solutions';

/**
 * Universal Brevo REST API Sender
 */
async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, attachments = [] }) {
  const config = getCompanyConfig();
  const senderEmail = config.email || 'capesecuresolutions@gmail.com';

  const payload = {
    sender: { name: SENDER_NAME, email: senderEmail },
    to: [{ email: toEmail, name: toName || toEmail }],
    subject: subject,
    htmlContent: htmlContent
  };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map((att) => ({
      name: att.name,
      content: att.content // Base64 string
    }));
  }

  // If no API key configured, record to local audit log gracefully
  if (!BREVO_API_KEY) {
    recordEmailLog('EMAIL_DISPATCH_MOCK', toEmail, subject, 'SIMULATED', {
      note: 'BREVO_API_KEY not configured. Content rendered successfully in staging/simulation mode.'
    });
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(`Brevo HTTP ${res.status}: ${data.message || JSON.stringify(data)}`);
    }

    recordEmailLog('BREVO_TRANSACTIONAL', toEmail, subject, 'SENT', { messageId: data.messageId });
    return { success: true, messageId: data.messageId };
  } catch (err) {
    recordEmailLog('BREVO_TRANSACTIONAL', toEmail, subject, 'FAILED', { error: err.message });
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. Customer Order Acknowledgement
// -----------------------------------------------------------------------------
async function sendCustomerAcknowledgement(order) {
  const config = getCompanyConfig();
  const customer = order.customer;
  const project = order.project;
  const portalUrl = `${config.website}/portal/quote.html?orderId=${order.orderId}&token=${order.accessToken}`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #ffffff; margin-bottom: 8px;">We've Received Your Project Details!</h2>
    <p>Dear ${customer.name},</p>
    <p>Thank you for choosing <strong>Cape Secure Solutions</strong> for your digital web project. Our engineering team in Kanyakumari is currently reviewing your project scope and preparing an official quotation.</p>
    
    <div class="info-card">
      <div class="info-row"><span class="info-label">Order Reference:</span><span class="info-value">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Service Package:</span><span class="info-value">${project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Business Type:</span><span class="info-value">${customer.businessType || 'Digital Solution'}</span></div>
      <div class="info-row"><span class="info-label">Domain Requirement:</span><span class="info-value">${order.infrastructure.domain}</span></div>
      <div class="info-row"><span class="info-label">Cloud Hosting:</span><span class="info-value">${order.infrastructure.hosting}</span></div>
      <div class="info-row"><span class="info-label">Estimated Total:</span><span class="info-value" style="color: #00d9ff;">₹ ${Number(order.pricing.total).toLocaleString('en-IN')}</span></div>
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="btn-cta">Track Order & View Quotation</a>
    </div>

    <p style="font-size: 13px; color: #9bb7d4;">Need urgent assistance? Reply directly to this email or chat with us on WhatsApp at <strong>${config.whatsapp}</strong>.</p>
  `, 'Order Acknowledged - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Order Confirmation: ${order.orderId} - Cape Secure Solutions`,
    htmlContent: html
  });
}

// -----------------------------------------------------------------------------
// 2. Admin New Order Notification
// -----------------------------------------------------------------------------
async function sendAdminNotification(order) {
  const customer = order.customer;
  const project = order.project;
  const pricing = order.pricing;

  const html = wrapEmailTemplate(`
    <h2 style="color: #f6b73c; margin-bottom: 8px;">New Customer Enquiry / Order Placed</h2>
    <p>A new customer has submitted an onboarding request on <strong>Cape Secure Solutions</strong>:</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Order Reference:</span><span class="info-value">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Customer Name:</span><span class="info-value">${customer.name}</span></div>
      <div class="info-row"><span class="info-label">Business / Brand:</span><span class="info-value">${customer.businessName || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${customer.email}</span></div>
      <div class="info-row"><span class="info-label">Phone / WhatsApp:</span><span class="info-value">${customer.phone || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Selected Package:</span><span class="info-value">${project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Total Amount:</span><span class="info-value" style="color: #00d9ff;">₹ ${Number(pricing.total).toLocaleString('en-IN')}</span></div>
    </div>

    ${project.notes ? `<div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 6px; margin: 15px 0;"><strong>Client Notes:</strong><br><span style="color: #c0d8f0;">${project.notes}</span></div>` : ''}

    <p style="font-size: 13px; color: #8aa7c2;">Please access the Admin Dashboard to generate and dispatch the official Quotation PDF.</p>
  `, 'New Client Lead - Admin Alert');

  return sendBrevoEmail({
    toEmail: ADMIN_EMAIL,
    toName: 'Cape Secure Admin',
    subject: `[LEAD] ${order.orderId} - ${customer.name} (${customer.businessName || project.package})`,
    htmlContent: html
  });
}

// -----------------------------------------------------------------------------
// 3. Official Quotation Email with Vector PDF Attachment
// -----------------------------------------------------------------------------
async function sendQuotationEmail(quotation) {
  const config = getCompanyConfig();
  const customer = quotation.customer;
  const portalUrl = `${config.website}/portal/quote.html?quotationId=${quotation.quotationId}&token=${quotation.accessToken}`;

  // Generate PDF buffer
  const pdfBuffer = await generateDocumentPDF('quotation', quotation);
  const pdfBase64 = pdfBuffer.toString('base64');

  const html = wrapEmailTemplate(`
    <h2 style="color: #ffffff; margin-bottom: 8px;">Your Official Quotation is Ready</h2>
    <p>Dear ${customer.name},</p>
    <p>Thank you for considering <strong>Cape Secure Solutions</strong>. We have prepared an official project quotation tailored to your requirements.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Quotation ID:</span><span class="info-value">${quotation.quotationId}</span></div>
      <div class="info-row"><span class="info-label">Order Ref:</span><span class="info-value">${quotation.orderId}</span></div>
      <div class="info-row"><span class="info-label">Valid Until:</span><span class="info-value">${quotation.validUntil}</span></div>
      <div class="info-row"><span class="info-label">Total Investment:</span><span class="info-value" style="color: #f6b73c; font-size: 16px;">₹ ${Number(quotation.pricing.total).toLocaleString('en-IN')}</span></div>
    </div>

    <p>An official PDF quotation has been attached to this email. You can also view line items, download documents, and approve this quotation directly in your client portal:</p>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="btn-cta">Review & Approve Quotation Online</a>
    </div>

    <p style="font-size: 12.5px; color: #8aa7c2;">Upon approval, our team will proceed with architecture staging and issue payment instructions.</p>
  `, 'Project Quotation - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Quotation #${quotation.quotationId} from Cape Secure Solutions`,
    htmlContent: html,
    attachments: [
      {
        name: `${quotation.quotationId}.pdf`,
        content: pdfBase64
      }
    ]
  });
}

// -----------------------------------------------------------------------------
// 4. Quotation Approved Notification (To Admin)
// -----------------------------------------------------------------------------
async function sendQuotationApprovedNotification(quotation) {
  const customer = quotation.customer;
  const html = wrapEmailTemplate(`
    <h2 style="color: #00d9ff; margin-bottom: 8px;">Quotation Approved by Client!</h2>
    <p>Client <strong>${customer.name}</strong> has approved Quotation <strong>#${quotation.quotationId}</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Quotation ID:</span><span class="info-value">${quotation.quotationId}</span></div>
      <div class="info-row"><span class="info-label">Order ID:</span><span class="info-value">${quotation.orderId}</span></div>
      <div class="info-row"><span class="info-label">Client Name:</span><span class="info-value">${customer.name}</span></div>
      <div class="info-row"><span class="info-label">Total Approved:</span><span class="info-value" style="color: #00d9ff;">₹ ${Number(quotation.pricing.total).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Approved At:</span><span class="info-value">${new Date().toLocaleString('en-IN')}</span></div>
    </div>

    <p style="font-size: 13px; color: #8aa7c2;">Next Action: Issue an advance Tax Invoice from the Admin Console to initiate project development.</p>
  `, 'Quotation Approved');

  return sendBrevoEmail({
    toEmail: ADMIN_EMAIL,
    toName: 'Cape Secure Admin',
    subject: `[APPROVED] Quotation ${quotation.quotationId} - ${customer.name}`,
    htmlContent: html
  });
}

// -----------------------------------------------------------------------------
// 5. Official Invoice Email with Vector PDF Attachment
// -----------------------------------------------------------------------------
async function sendInvoiceEmail(invoice) {
  const config = getCompanyConfig();
  const customer = invoice.customer;
  const portalUrl = `${config.website}/portal/invoice.html?invoiceId=${invoice.invoiceNumber || invoice.invoiceId}&token=${invoice.accessToken}`;

  const pdfBuffer = await generateDocumentPDF('invoice', invoice);
  const pdfBase64 = pdfBuffer.toString('base64');

  const html = wrapEmailTemplate(`
    <h2 style="color: #ffffff; margin-bottom: 8px;">Invoice #${invoice.invoiceNumber || invoice.invoiceId}</h2>
    <p>Dear ${customer.name},</p>
    <p>Please find attached your official invoice from <strong>Cape Secure Solutions</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Invoice Number:</span><span class="info-value">${invoice.invoiceNumber || invoice.invoiceId}</span></div>
      <div class="info-row"><span class="info-label">Invoice Date:</span><span class="info-value">${invoice.invoiceDate}</span></div>
      <div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${invoice.dueDate}</span></div>
      <div class="info-row"><span class="info-label">Total Amount:</span><span class="info-value">₹ ${Number(invoice.pricing.total).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Balance Due:</span><span class="info-value" style="color: #f6b73c; font-size: 16px;">₹ ${Number(invoice.pricing.balance).toLocaleString('en-IN')}</span></div>
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="btn-cta">View Invoice & Payment Details</a>
    </div>

    <div style="background: rgba(3, 27, 42, 0.7); border: 1px solid rgba(0, 184, 200, 0.2); border-radius: 8px; padding: 14px 18px; margin: 15px 0;">
      <strong style="color: #00d9ff; font-size: 13px;">UPI Payment Reference:</strong><br>
      <span style="color: #ffffff; font-size: 13.5px;">UPI ID: <strong>${config.paymentInstructions.upiId}</strong></span><br>
      <span style="font-size: 12px; color: #8aa7c2;">Please mention Invoice #${invoice.invoiceNumber || invoice.invoiceId} in your transfer remarks.</span>
    </div>
  `, 'Invoice - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Invoice #${invoice.invoiceNumber || invoice.invoiceId} from Cape Secure Solutions`,
    htmlContent: html,
    attachments: [
      {
        name: `${invoice.invoiceNumber || invoice.invoiceId}.pdf`,
        content: pdfBase64
      }
    ]
  });
}

// -----------------------------------------------------------------------------
// 6. Payment Confirmation Email
// -----------------------------------------------------------------------------
async function sendPaymentConfirmationEmail(invoice, payment) {
  const config = getCompanyConfig();
  const customer = invoice.customer;
  const portalUrl = `${config.website}/portal/invoice.html?invoiceId=${invoice.invoiceNumber || invoice.invoiceId}&token=${invoice.accessToken}`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #00b8c8; margin-bottom: 8px;">Payment Received with Thanks!</h2>
    <p>Dear ${customer.name},</p>
    <p>We gratefully acknowledge receipt of your payment for Invoice <strong>#${invoice.invoiceNumber || invoice.invoiceId}</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Receipt / Payment ID:</span><span class="info-value">${payment.paymentId}</span></div>
      <div class="info-row"><span class="info-label">Amount Paid:</span><span class="info-value" style="color: #00d9ff; font-size: 15px;">₹ ${Number(payment.amount).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">${payment.method}</span></div>
      <div class="info-row"><span class="info-label">Transaction Ref:</span><span class="info-value">${payment.transactionRef}</span></div>
      <div class="info-row"><span class="info-label">Remaining Balance:</span><span class="info-value">₹ ${Number(invoice.pricing.balance).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #34d399;">${invoice.pricing.paymentStatus}</span></div>
    </div>

    <div style="text-align: center;">
      <a href="${portalUrl}" class="btn-cta">Download Updated Receipt</a>
    </div>
  `, 'Payment Confirmed - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Payment Receipt: ${payment.paymentId} - Cape Secure Solutions`,
    htmlContent: html
  });
}

// -----------------------------------------------------------------------------
// 7. Project Kickoff Notification
// -----------------------------------------------------------------------------
async function sendProjectKickoffEmail(order) {
  const customer = order.customer;
  const html = wrapEmailTemplate(`
    <h2 style="color: #ffffff; margin-bottom: 8px;">Project Development Commenced!</h2>
    <p>Dear ${customer.name},</p>
    <p>Great news! Your project architecture and staging workspace have officially commenced.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Project:</span><span class="info-value">${customer.businessName || customer.name}</span></div>
      <div class="info-row"><span class="info-label">Package:</span><span class="info-value">${order.project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Target Delivery:</span><span class="info-value">${order.deliveryDate || 'Within 5-7 business days'}</span></div>
      <div class="info-row"><span class="info-label">Lead Developer:</span><span class="info-value">Jesin Milesh (Founder, Cape Secure)</span></div>
    </div>

    <p style="font-size: 13.5px; color: #a5c3e0;">We will keep you informed of milestones as our three-seas security audits and component builds progress.</p>
  `, 'Project Kickoff - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Development Commenced: ${order.orderId} - Cape Secure Solutions`,
    htmlContent: html
  });
}

// -----------------------------------------------------------------------------
// 8. Project Delivery Notification
// -----------------------------------------------------------------------------
async function sendProjectDeliveryEmail(order) {
  const customer = order.customer;
  const html = wrapEmailTemplate(`
    <h2 style="color: #f6b73c; margin-bottom: 8px;">Your Website is Live & Delivered!</h2>
    <p>Dear ${customer.name},</p>
    <p>We are thrilled to announce that your digital solution has completed all security tests, mobile responsiveness verifications, and is now ready for production operation.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Project Ref:</span><span class="info-value">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #34d399;">DELIVERED / PRODUCTION READY</span></div>
      <div class="info-row"><span class="info-label">Delivery Date:</span><span class="info-value">${new Date().toLocaleDateString('en-IN')}</span></div>
    </div>

    <p>Thank you for partnering with <strong>Cape Secure Solutions</strong>. Please don't hesitate to reach out if you need additional feature modules or ongoing maintenance assistance.</p>
  `, 'Project Delivered - Cape Secure Solutions');

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject: `Delivery Complete: ${order.orderId} - Cape Secure Solutions`,
    htmlContent: html
  });
}

module.exports = {
  sendBrevoEmail,
  sendCustomerAcknowledgement,
  sendAdminNotification,
  sendQuotationEmail,
  sendQuotationApprovedNotification,
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendProjectKickoffEmail,
  sendProjectDeliveryEmail
};
