/**
 * Cape Secure Solutions — Centralized Transactional Email Engine
 * 8 Professional Responsive Email Templates with PDF Attachment Support and Delivery Logging.
 * Dispatches via Brevo REST API with graceful local fallback logging.
 */

const { getCompanyConfig } = require('./companyConfig');
const { recordEmailLog } = require('./db');
const { generateDocumentPDF } = require('./pdfService');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const ADMIN_EMAIL = process.env.BREVO_ADMIN_EMAIL || 'capesecuresolutions@gmail.com';
const SENDER_NAME = process.env.BREVO_SENDER || 'Cape Secure Solutions';

// Base HTML Email Shell with Kanyakumari Theme Aesthetics
function wrapEmailTemplate(contentHtml, title = 'Cape Secure Solutions') {
  const config = getCompanyConfig();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #03111f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f0f6fc; }
    table { border-collapse: collapse; }
    .email-wrapper { width: 100%; background-color: #03111f; padding: 30px 10px; }
    .email-container { max-width: 600px; margin: 0 auto; background: #061a2e; border: 1px solid rgba(0, 217, 255, 0.25); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
    .email-header { background: linear-gradient(135deg, #031b2a 0%, #063b5c 100%); padding: 24px 30px; border-bottom: 2px solid #00b8c8; }
    .brand-title { color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
    .brand-title span.cape { color: #f6b73c; }
    .brand-title span.secure { color: #00d9ff; }
    .brand-tagline { color: #72ddf7; font-size: 11px; margin-top: 4px; display: block; }
    .email-body { padding: 32px 30px; font-size: 14.5px; line-height: 1.65; color: #d1e2f2; }
    .email-body h1, .email-body h2 { color: #ffffff; margin-top: 0; font-size: 20px; }
    .info-card { background: rgba(3, 27, 42, 0.7); border: 1px solid rgba(0, 184, 200, 0.2); border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #8aa7c2; font-size: 13px; }
    .info-value { color: #ffffff; font-weight: 600; font-size: 13.5px; }
    .btn-cta { display: inline-block; background: linear-gradient(135deg, #087e8b 0%, #00b8c8 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin: 18px 0; text-align: center; }
    .email-footer { background: #031221; padding: 24px 30px; text-align: center; font-size: 12px; color: #627d97; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .email-footer a { color: #00d9ff; text-decoration: none; }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="brand-title"><span class="cape">CAPE</span><span class="secure">SECURE</span> SOLUTIONS</h1>
        <span class="brand-tagline">Where Three Seas Meet, Security Begins &bull; Kanyakumari, Tamil Nadu</span>
      </div>
      <div class="email-body">
        ${contentHtml}
      </div>
      <div class="email-footer">
        <p style="margin: 0 0 8px 0;"><strong>${config.companyName}</strong> &bull; ${config.location}</p>
        <p style="margin: 0 0 8px 0;">Email: <a href="mailto:${config.email}">${config.email}</a> | WhatsApp: ${config.whatsapp}</p>
        <p style="margin: 0;"><a href="${config.website}">${config.website}</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Universal Brevo Dispatcher with local fallback.
 */
async function sendBrevoEmail({ toEmail, toName, subject, htmlContent, textContent, attachments = [], metadata = {} }) {
  const config = getCompanyConfig();
  const apiKey = process.env.BREVO_API_KEY || BREVO_API_KEY;

  if (apiKey && apiKey.startsWith('xkeysib-')) {
    try {
      const payload = {
        sender: { name: SENDER_NAME, email: config.email },
        to: [{ email: toEmail, name: toName || 'Client' }],
        subject,
        htmlContent,
        textContent: textContent || 'Please view this email in an HTML-compatible client.'
      };

      if (Array.isArray(attachments) && attachments.length > 0) {
        payload.attachment = attachments.map((att) => ({
          name: att.name,
          content: att.content // Base64 encoded string
        }));
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        recordEmailLog({
          ...metadata,
          recipient: toEmail,
          subject,
          status: 'sent',
          providerMessageId: resData.messageId
        });
        return { success: true, messageId: resData.messageId };
      } else {
        console.warn('[EMAIL] Brevo API rejected email:', resData);
        recordEmailLog({
          ...metadata,
          recipient: toEmail,
          subject,
          status: 'failed',
          error: JSON.stringify(resData)
        });
        return { success: false, error: resData };
      }
    } catch (err) {
      console.error('[EMAIL] Brevo dispatch exception:', err);
      recordEmailLog({
        ...metadata,
        recipient: toEmail,
        subject,
        status: 'failed',
        error: err.message
      });
      return { success: false, error: err.message };
    }
  } else {
    // Offline / Mock fallback for local developer testing
    console.log(`[EMAIL SIMULATED - ${metadata.emailType || 'GENERAL'}] To: ${toEmail} | Subject: "${subject}"`);
    recordEmailLog({
      ...metadata,
      recipient: toEmail,
      subject,
      status: 'sent',
      providerMessageId: 'simulated-' + Date.now()
    });
    return { success: true, simulated: true };
  }
}

// =============================================================================
// 1. EMAIL #1 — CUSTOMER ENQUIRY ACKNOWLEDGEMENT
// =============================================================================
async function sendCustomerAcknowledgement(order) {
  const config = getCompanyConfig();
  const customer = order.customer;
  const project = order.project;
  const subject = `Thank You for Contacting Cape Secure Solutions — Request Received [${order.orderId}]`;

  const html = wrapEmailTemplate(`
    <h2>Request Acknowledged</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>Thank you for contacting <strong>Cape Secure Solutions</strong>. We have successfully received your project inquiry.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Order Request ID:</span><span class="info-value" style="color: #00d9ff;">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Selected Package:</span><span class="info-value">${project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Service Type:</span><span class="info-value">${project.service}</span></div>
      ${customer.businessName ? `<div class="info-row"><span class="info-label">Business Name:</span><span class="info-value">${customer.businessName}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #f6b73c;">Requirements Under Review</span></div>
    </div>

    <p>Our team is currently reviewing your project details. We will prepare an itemized quotation and reach out within 24 hours.</p>
    <p>If you have any reference designs or urgent requirements to share, feel free to reply directly to this email or connect with us on WhatsApp at <strong>${config.whatsapp}</strong>.</p>
    
    <p style="margin-top: 24px;">Warm regards,<br><strong>Cape Secure Solutions Team</strong><br><em>Where Three Seas Meet, Security Begins</em></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    metadata: { orderId: order.orderId, emailType: 'ENQUIRY_ACKNOWLEDGEMENT' }
  });
}

// =============================================================================
// 2. EMAIL #2 — ADMIN NEW REQUEST NOTIFICATION
// =============================================================================
async function sendAdminNotification(order) {
  const customer = order.customer;
  const project = order.project;
  const pricing = order.pricing;
  const subject = `[New Request] ${order.orderId} — ${customer.name} (${customer.businessName || 'Direct'})`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #00d9ff;">New Customer Project Request</h2>
    <p>A new client request has been submitted on the Cape Secure Solutions portal.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Order ID:</span><span class="info-value" style="color: #f6b73c;">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Client Name:</span><span class="info-value">${customer.name}</span></div>
      <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${customer.email || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Phone / WhatsApp:</span><span class="info-value">${customer.phone || customer.whatsapp}</span></div>
      ${customer.businessName ? `<div class="info-row"><span class="info-label">Business:</span><span class="info-value">${customer.businessName}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Package:</span><span class="info-value">${project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Service:</span><span class="info-value">${project.service}</span></div>
      <div class="info-row"><span class="info-label">Estimated Value:</span><span class="info-value" style="color: #00d9ff;">₹${Number(pricing.total).toLocaleString('en-IN')}</span></div>
    </div>

    ${project.customRequirements ? `
      <p><strong>Client Notes / Requirements:</strong></p>
      <blockquote style="background: rgba(3, 27, 42, 0.8); border-left: 3px solid #00b8c8; padding: 12px; margin: 10px 0; color: #f0f6fc;">
        ${project.customRequirements}
      </blockquote>
    ` : ''}

    <a href="${getCompanyConfig().website}/admin/" class="btn-cta">Open Admin Dashboard</a>
  `, subject);

  return sendBrevoEmail({
    toEmail: ADMIN_EMAIL,
    toName: 'Cape Secure Admin',
    subject,
    htmlContent: html,
    metadata: { orderId: order.orderId, emailType: 'ADMIN_NOTIFICATION' }
  });
}

// =============================================================================
// 3. EMAIL #3 — QUOTATION EMAIL WITH PDF ATTACHMENT
// =============================================================================
async function sendQuotationEmail(quotation) {
  const config = getCompanyConfig();
  const customer = quotation.customer;
  const pricing = quotation.pricing;
  const subject = `Project Quotation ${quotation.quotationId} — Cape Secure Solutions`;

  // Generate Quotation PDF Buffer
  const pdfBuffer = await generateDocumentPDF('quotation', quotation);
  const pdfBase64 = pdfBuffer.toString('base64');

  const portalUrl = `${config.website}/portal/quote.html?id=${encodeURIComponent(quotation.quotationId)}&token=${encodeURIComponent(quotation.accessToken)}`;

  const html = wrapEmailTemplate(`
    <h2>Quotation Prepared for Your Project</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>Based on your requirements, we have prepared an itemized quotation for your project.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Quotation Number:</span><span class="info-value" style="color: #00d9ff;">${quotation.quotationId}</span></div>
      <div class="info-row"><span class="info-label">Project:</span><span class="info-value">${quotation.project.service}</span></div>
      <div class="info-row"><span class="info-label">Package Tier:</span><span class="info-value">${quotation.project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Total Quotation Value:</span><span class="info-value" style="color: #f6b73c; font-size: 15px;">₹${Number(pricing.total).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Valid Until:</span><span class="info-value">${quotation.validUntil}</span></div>
    </div>

    <p>Your official Quotation PDF is attached to this email. You can also view and approve it online via our secure client portal:</p>
    
    <a href="${portalUrl}" class="btn-cta">Review & Approve Quotation</a>

    <p>Upon approval, our system will issue your initial invoice and we will schedule your project kickoff.</p>
    <p>Regards,<br><strong>Cape Secure Solutions</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    attachments: [{
      name: `${quotation.quotationId}.pdf`,
      content: pdfBase64
    }],
    metadata: { orderId: quotation.orderId, quotationId: quotation.quotationId, emailType: 'QUOTATION_EMAIL' }
  });
}

// =============================================================================
// 4. EMAIL #4 — INVOICE EMAIL WITH PDF ATTACHMENT
// =============================================================================
async function sendInvoiceEmail(invoice) {
  const config = getCompanyConfig();
  const customer = invoice.customer;
  const pricing = invoice.pricing;
  const subject = `Invoice ${invoice.invoiceId} — Cape Secure Solutions`;

  // Generate Invoice PDF Buffer
  const pdfBuffer = await generateDocumentPDF('invoice', invoice);
  const pdfBase64 = pdfBuffer.toString('base64');

  const portalUrl = `${config.website}/portal/invoice.html?id=${encodeURIComponent(invoice.invoiceId)}&token=${encodeURIComponent(invoice.accessToken)}`;

  const html = wrapEmailTemplate(`
    <h2>Invoice Generated</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>Your invoice has been generated for your project with <strong>Cape Secure Solutions</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Invoice Number:</span><span class="info-value" style="color: #00d9ff;">${invoice.invoiceId}</span></div>
      <div class="info-row"><span class="info-label">Date of Issue:</span><span class="info-value">${invoice.invoiceDate}</span></div>
      <div class="info-row"><span class="info-label">Due Date:</span><span class="info-value">${invoice.dueDate}</span></div>
      <div class="info-row"><span class="info-label">Total Amount:</span><span class="info-value">₹${Number(pricing.total).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Amount Paid:</span><span class="info-value">₹${Number(pricing.amountPaid).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Balance Due:</span><span class="info-value" style="color: #f6b73c; font-size: 15px;">₹${Number(pricing.balance).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Payment Status:</span><span class="info-value" style="color: ${pricing.paymentStatus === 'PAID' ? '#00d9ff' : '#f6b73c'};">${pricing.paymentStatus}</span></div>
    </div>

    <p>Please find your official Tax Invoice attached as a PDF. You can also review status and settlement instructions on your client invoice portal:</p>

    <a href="${portalUrl}" class="btn-cta">View Invoice Portal</a>

    <p>Please quote <strong>${invoice.invoiceId}</strong> in your payment reference.</p>
    <p>Warm regards,<br><strong>Cape Secure Solutions</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    attachments: [{
      name: `${invoice.invoiceId}.pdf`,
      content: pdfBase64
    }],
    metadata: { orderId: invoice.orderId, invoiceId: invoice.invoiceId, emailType: 'INVOICE_EMAIL' }
  });
}

// =============================================================================
// 5. EMAIL #5 — PAYMENT CONFIRMATION
// =============================================================================
async function sendPaymentConfirmation(invoice, payment) {
  const config = getCompanyConfig();
  const customer = invoice.customer;
  const pricing = invoice.pricing;
  const subject = `Payment Received — ${invoice.invoiceId} — Cape Secure Solutions`;

  // Attach updated invoice
  const pdfBuffer = await generateDocumentPDF('invoice', invoice);
  const pdfBase64 = pdfBuffer.toString('base64');

  const html = wrapEmailTemplate(`
    <h2 style="color: #00d9ff;">Payment Confirmation</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>We have successfully received and recorded your payment. Thank you for your business!</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Invoice Ref:</span><span class="info-value">${invoice.invoiceId}</span></div>
      <div class="info-row"><span class="info-label">Amount Received:</span><span class="info-value" style="color: #00d9ff; font-size: 15px;">₹${Number(payment.amount).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Payment Method:</span><span class="info-value">${payment.method}</span></div>
      <div class="info-row"><span class="info-label">Transaction Reference:</span><span class="info-value">${payment.transactionId}</span></div>
      <div class="info-row"><span class="info-label">Remaining Balance:</span><span class="info-value" style="color: #f6b73c;">₹${Number(pricing.balance).toLocaleString('en-IN')}</span></div>
      <div class="info-row"><span class="info-label">Updated Status:</span><span class="info-value">${pricing.paymentStatus}</span></div>
    </div>

    <p>An updated invoice reflecting this payment is attached for your accounting records.</p>
    <p>Regards,<br><strong>Cape Secure Solutions</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    attachments: [{
      name: `${invoice.invoiceId}-RECEIPT.pdf`,
      content: pdfBase64
    }],
    metadata: { orderId: invoice.orderId, invoiceId: invoice.invoiceId, emailType: 'PAYMENT_CONFIRMATION' }
  });
}

// =============================================================================
// 6. EMAIL #6 — PROJECT KICKOFF
// =============================================================================
async function sendProjectKickoff(order) {
  const customer = order.customer;
  const project = order.project;
  const subject = `Project Started — ${project.service} | Cape Secure Solutions`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #00d9ff;">Project Officially Started!</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>Your digital solution project has officially entered the <strong>Development Stage</strong>.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Order Reference:</span><span class="info-value">${order.orderId}</span></div>
      <div class="info-row"><span class="info-label">Project Scope:</span><span class="info-value">${project.service}</span></div>
      <div class="info-row"><span class="info-label">Package:</span><span class="info-value">${project.package.toUpperCase()}</span></div>
      <div class="info-row"><span class="info-label">Current Stage:</span><span class="info-value" style="color: #00d9ff;">Frontend & Architecture Build</span></div>
    </div>

    <p><strong>Next Steps & Client Materials Checklist:</strong></p>
    <ul style="color: #d1e2f2; padding-left: 20px;">
      <li>High-resolution brand logo and typography preferences (if any)</li>
      <li>Key product/service descriptions and photography</li>
      <li>Preferred domain name for DNS pointing</li>
      <li>Direct WhatsApp and customer inquiry email addresses</li>
    </ul>

    <p>We will share a staging preview URL as soon as the initial layout is ready for your review.</p>
    <p>Regards,<br><strong>Cape Secure Solutions Engineering Team</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    metadata: { orderId: order.orderId, emailType: 'PROJECT_KICKOFF' }
  });
}

// =============================================================================
// 7. EMAIL #7 — PROJECT DELIVERY
// =============================================================================
async function sendProjectDelivery(order, deliveryInfo = {}) {
  const customer = order.customer;
  const project = order.project;
  const liveUrl = deliveryInfo.liveUrl || `https://${customer.businessName ? customer.businessName.toLowerCase().replace(/[^a-z0-9]/g, '') : 'client'}.com`;
  const subject = `Project Completed & Delivered — ${project.service} | Cape Secure Solutions`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #00d9ff;">Your Project is Live!</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>We are delighted to announce that your website / digital solution is fully developed, security-tested, and deployed live to production!</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Project:</span><span class="info-value">${project.service}</span></div>
      <div class="info-row"><span class="info-label">Live Website URL:</span><span class="info-value"><a href="${liveUrl}" style="color: #00d9ff;">${liveUrl}</a></span></div>
      <div class="info-row"><span class="info-label">SSL & Security:</span><span class="info-value" style="color: #00d9ff;">Active & Hardened</span></div>
      <div class="info-row"><span class="info-label">Status:</span><span class="info-value" style="color: #f6b73c;">Production Operational</span></div>
    </div>

    <p><strong>What was delivered:</strong></p>
    <ul style="color: #d1e2f2; padding-left: 20px;">
      <li>Fluid responsive design optimized across smartphones, tablets, and desktop displays</li>
      <li>Fast CDN delivery with automated asset optimization</li>
      <li>Sanitized inquiry forms connected directly to your email / WhatsApp</li>
      <li>Google Maps and local SEO metadata integration</li>
    </ul>

    <p>Thank you for partnering with Cape Secure Solutions. We wish your business tremendous growth and digital reach!</p>
    <p>Warm regards,<br><strong>Cape Secure Solutions</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    metadata: { orderId: order.orderId, emailType: 'PROJECT_DELIVERY' }
  });
}

// =============================================================================
// 8. EMAIL #8 — MAINTENANCE & RENEWAL REMINDER
// =============================================================================
async function sendRenewalReminder(order, renewalData = {}) {
  const config = getCompanyConfig();
  const customer = order.customer;
  const serviceName = renewalData.serviceName || 'Annual Cloud Hosting & Domain Care';
  const expiryDate = renewalData.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const renewalPrice = renewalData.price || '₹2,499';
  const subject = `Renewal Reminder — ${serviceName} — Cape Secure Solutions`;

  const html = wrapEmailTemplate(`
    <h2 style="color: #f6b73c;">Upcoming Service Renewal</h2>
    <p>Hello <strong>${customer.name}</strong>,</p>
    <p>This is a friendly reminder that your active digital infrastructure cycle with Cape Secure Solutions is approaching renewal.</p>

    <div class="info-card">
      <div class="info-row"><span class="info-label">Service:</span><span class="info-value">${serviceName}</span></div>
      <div class="info-row"><span class="info-label">Expiration Date:</span><span class="info-value" style="color: #f6b73c;">${expiryDate}</span></div>
      <div class="info-row"><span class="info-label">Renewal Cost:</span><span class="info-value">${renewalPrice}</span></div>
      <div class="info-row"><span class="info-label">Order Ref:</span><span class="info-value">${order.orderId}</span></div>
    </div>

    <p>Timely renewal ensures uninterrupted hosting uptime, active SSL security certificates, and domain registration protection.</p>
    <p>To proceed with renewal or update your plan, please connect with us via WhatsApp at <strong>${config.whatsapp}</strong> or reply to this email.</p>
    <p>Regards,<br><strong>Cape Secure Solutions Support</strong></p>
  `, subject);

  return sendBrevoEmail({
    toEmail: customer.email,
    toName: customer.name,
    subject,
    htmlContent: html,
    metadata: { orderId: order.orderId, emailType: 'RENEWAL_REMINDER' }
  });
}

module.exports = {
  sendCustomerAcknowledgement,
  sendAdminNotification,
  sendQuotationEmail,
  sendInvoiceEmail,
  sendPaymentConfirmation,
  sendProjectKickoff,
  sendProjectDelivery,
  sendRenewalReminder
};
