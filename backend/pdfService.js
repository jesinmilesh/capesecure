/**
 * Cape Secure Solutions — Server-Side Vector PDF Generator
 * Generates professional, branded A4 Quotations and Tax Invoices using PDFKit.
 * Matches Cape Secure visual identity: Deep Ocean, Turquoise, Sunrise Gold.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getCompanyConfig, getLogoAbsolutePath } = require('./companyConfig');

// Palette
const COLORS = {
  deepOcean: '#031B2A',
  oceanBlue: '#063B5C',
  teal: '#087E8B',
  turquoise: '#00B8C8',
  sunriseGold: '#F6B73C',
  charcoal: '#1E293B',
  grayText: '#475569',
  lightGray: '#F1F5F9',
  borderGray: '#E2E8F0',
  white: '#FFFFFF',
  paidGreen: '#0D9488',
  pendingGold: '#D97706',
  partialBlue: '#0284C7'
};

/**
 * Generates an Invoice or Quotation PDF and returns a Promise resolving to a Buffer.
 * @param {'invoice'|'quotation'} docType
 * @param {Object} documentData
 * @returns {Promise<Buffer>}
 */
function generateDocumentPDF(docType, documentData) {
  return new Promise((resolve, reject) => {
    try {
      const config = getCompanyConfig();
      const isInvoice = docType === 'invoice';

      const docNumber = isInvoice ? documentData.invoiceId : documentData.quotationId;
      const docTitle = isInvoice 
        ? (config.tax && config.tax.enabled ? 'TAX INVOICE' : 'INVOICE')
        : 'PROJECT QUOTATION';

      const docDate = isInvoice ? documentData.invoiceDate : documentData.issueDate;
      const secondDateLabel = isInvoice ? 'Due Date:' : 'Valid Until:';
      const secondDate = isInvoice ? documentData.dueDate : documentData.validUntil;

      const customer = documentData.customer || {};
      const pricing = documentData.pricing || {};
      const items = pricing.items || [];

      // Create PDFKit document: A4 size (595.28 x 841.89 points), 40pt margins
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `${docTitle} - ${docNumber}`,
          Author: config.companyName,
          Subject: `${config.companyName} Billing Document`,
          Keywords: 'Invoice, Quotation, Web Development, Cybersecurity'
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = 595.28;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2; // 515.28

      // =======================================================================
      // 1. TOP BRAND HEADER & ACCENT BAR
      // =======================================================================
      // Gradient / 3-Seas Top Accent Strip
      doc.rect(margin, 25, contentWidth, 4).fill(COLORS.teal);
      doc.rect(margin, 25, contentWidth * 0.45, 4).fill(COLORS.turquoise);
      doc.rect(margin + contentWidth * 0.75, 25, contentWidth * 0.25, 4).fill(COLORS.sunriseGold);

      let curY = 40;

      // Logo & Company Info (Left Column)
      const logoPath = getLogoAbsolutePath();
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, margin, curY, { width: 44, height: 44 });
        } catch (e) {
          console.warn('[PDF] Could not draw logo image:', e.message);
        }
      }

      const textLeft = margin + 54;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.deepOcean)
         .text(config.companyName.toUpperCase(), textLeft, curY);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.teal)
         .text(config.businessType, textLeft, curY + 18);

      doc.font('Helvetica').fontSize(8).fillColor(COLORS.grayText)
         .text(`${config.location}  •  ${config.website}`, textLeft, curY + 30)
         .text(`Email: ${config.email}  |  Phone: ${config.phone}`, textLeft, curY + 41);

      // Document Type & Number (Right Column)
      doc.font('Helvetica-Bold').fontSize(18).fillColor(COLORS.deepOcean)
         .text(docTitle, margin, curY, { width: contentWidth, align: 'right' });

      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.teal)
         .text(docNumber, margin, curY + 22, { width: contentWidth, align: 'right' });

      // Payment status badge for invoice
      if (isInvoice) {
        const status = (documentData.status || pricing.paymentStatus || 'PENDING').toUpperCase();
        let badgeColor = COLORS.pendingGold;
        if (status === 'PAID') badgeColor = COLORS.paidGreen;
        else if (status === 'PARTIALLY PAID') badgeColor = COLORS.partialBlue;

        const badgeWidth = 90;
        const badgeX = pageWidth - margin - badgeWidth;
        const badgeY = curY + 38;

        doc.roundedRect(badgeX, badgeY, badgeWidth, 18, 3).fill(badgeColor);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white)
           .text(status, badgeX, badgeY + 4, { width: badgeWidth, align: 'center' });
      }

      curY = 105;

      // Thin separator
      doc.moveTo(margin, curY).lineTo(pageWidth - margin, curY).strokeColor(COLORS.borderGray).lineWidth(1).stroke();
      curY += 12;

      // =======================================================================
      // 2. METADATA & BILL TO
      // =======================================================================
      const colWidth = (contentWidth - 20) / 2;

      // Left Column: Bill To / Client
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.teal).text('BILL TO / CLIENT DETAILS', margin, curY);
      curY += 14;

      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.charcoal)
         .text(customer.name || 'Valued Client', margin, curY);
      curY += 13;

      if (customer.businessName) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.grayText)
           .text(customer.businessName, margin, curY);
        curY += 12;
      }

      doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.grayText);
      if (customer.email) {
        doc.text(`Email: ${customer.email}`, margin, curY);
        curY += 11;
      }
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, margin, curY);
        curY += 11;
      }
      if (customer.address || customer.city) {
        const locParts = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean);
        doc.text(`Address: ${locParts.join(', ')}`, margin, curY, { width: colWidth });
        curY += 11;
      }

      // Right Column: Document Details
      const rightX = margin + colWidth + 20;
      let rightY = 117;

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.teal).text('REFERENCE & DATES', rightX, rightY);
      rightY += 14;

      const drawMetaRow = (label, value) => {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.charcoal).text(label, rightX, rightY, { width: 90 });
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.grayText).text(value, rightX + 95, rightY);
        rightY += 13;
      };

      drawMetaRow('Date of Issue:', docDate);
      drawMetaRow(secondDateLabel, secondDate);
      if (documentData.orderId) drawMetaRow('Order ID:', documentData.orderId);
      if (isInvoice && documentData.quotationId) drawMetaRow('Quotation Ref:', documentData.quotationId);
      if (config.tax && config.tax.enabled && config.tax.gstin) {
        drawMetaRow('GSTIN:', config.tax.gstin);
      }

      curY = Math.max(curY, rightY) + 12;

      // =======================================================================
      // 3. PROJECT BRIEF BANNER
      // =======================================================================
      const project = documentData.project || {};
      const pkgName = project.package ? project.package.toUpperCase() : 'STANDARD';
      const svcName = project.service || 'Web Development & Digital Solution';

      doc.roundedRect(margin, curY, contentWidth, 26, 4).fill(COLORS.lightGray);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.teal)
         .text('PROJECT SCOPE: ', margin + 10, curY + 8, { continued: true })
         .font('Helvetica-Bold').fillColor(COLORS.deepOcean)
         .text(`${svcName} [${pkgName} TIER]`);

      curY += 36;

      // =======================================================================
      // 4. ITEMIZED SERVICE TABLE
      // =======================================================================
      const tableX = margin;
      const colDescW = 280;
      const colQtyW = 45;
      const colRateW = 95;
      const colTotalW = 95.28;

      // Table Header Bar
      doc.rect(tableX, curY, contentWidth, 22).fill(COLORS.deepOcean);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.white);
      doc.text('DESCRIPTION / DELIVERABLE', tableX + 8, curY + 6, { width: colDescW });
      doc.text('QTY', tableX + colDescW, curY + 6, { width: colQtyW, align: 'center' });
      doc.text('RATE (INR)', tableX + colDescW + colQtyW, curY + 6, { width: colRateW - 10, align: 'right' });
      doc.text('AMOUNT (INR)', tableX + colDescW + colQtyW + colRateW, curY + 6, { width: colTotalW - 8, align: 'right' });

      curY += 22;

      // Table Rows
      items.forEach((item, index) => {
        const isEven = index % 2 === 1;
        const rowHeight = 22;

        if (isEven) {
          doc.rect(tableX, curY, contentWidth, rowHeight).fill(COLORS.lightGray);
        }

        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.charcoal);
        doc.text(item.description, tableX + 8, curY + 6, { width: colDescW - 10 });
        doc.text(String(item.quantity), tableX + colDescW, curY + 6, { width: colQtyW, align: 'center' });
        doc.text(`₹${Number(item.rate).toLocaleString('en-IN')}`, tableX + colDescW + colQtyW, curY + 6, { width: colRateW - 10, align: 'right' });
        
        doc.font('Helvetica-Bold')
           .text(`₹${Number(item.total).toLocaleString('en-IN')}`, tableX + colDescW + colQtyW + colRateW, curY + 6, { width: colTotalW - 8, align: 'right' });

        // Bottom row border
        doc.moveTo(tableX, curY + rowHeight).lineTo(tableX + contentWidth, curY + rowHeight)
           .strokeColor(COLORS.borderGray).lineWidth(0.5).stroke();

        curY += rowHeight;
      });

      curY += 10;

      // =======================================================================
      // 5. SUMMARY & TOTALS BOX (Right Aligned)
      // =======================================================================
      const sumBoxWidth = 230;
      const sumBoxX = pageWidth - margin - sumBoxWidth;

      const drawSummaryRow = (label, valStr, isBold = false, isAccent = false) => {
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5)
           .fillColor(isAccent ? COLORS.teal : COLORS.charcoal)
           .text(label, sumBoxX, curY, { width: 120 });
        doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 9.5 : 8.5)
           .fillColor(isAccent ? COLORS.teal : COLORS.charcoal)
           .text(valStr, sumBoxX + 120, curY, { width: sumBoxWidth - 120, align: 'right' });
        curY += 15;
      };

      drawSummaryRow('Subtotal:', `₹${Number(pricing.subtotal || 0).toLocaleString('en-IN')}`);

      if (pricing.discount > 0) {
        drawSummaryRow('Discount:', `-₹${Number(pricing.discount).toLocaleString('en-IN')}`, false, true);
      }

      if (pricing.taxEnabled && pricing.taxAmount > 0) {
        drawSummaryRow('Taxable Amount:', `₹${Number(pricing.taxableAmount).toLocaleString('en-IN')}`);
        drawSummaryRow(`${pricing.taxName || 'GST'} (${pricing.taxRate}%):`, `₹${Number(pricing.taxAmount).toLocaleString('en-IN')}`);
      }

      // Grand Total Highlight
      doc.rect(sumBoxX - 6, curY, sumBoxWidth + 6, 24).fill(COLORS.deepOcean);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.white)
         .text('TOTAL AMOUNT:', sumBoxX, curY + 6, { width: 120 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.turquoise)
         .text(`₹${Number(pricing.total || 0).toLocaleString('en-IN')}`, sumBoxX + 120, curY + 6, { width: sumBoxWidth - 120, align: 'right' });

      curY += 30;

      // If Invoice: Show Amount Paid & Balance Due
      if (isInvoice) {
        drawSummaryRow('Amount Paid:', `₹${Number(pricing.amountPaid || 0).toLocaleString('en-IN')}`, true);
        
        const balanceColor = pricing.balance > 0 ? COLORS.charcoal : COLORS.paidGreen;
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(balanceColor)
           .text('BALANCE DUE:', sumBoxX, curY, { width: 120 });
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(balanceColor)
           .text(`₹${Number(pricing.balance || 0).toLocaleString('en-IN')}`, sumBoxX + 120, curY, { width: sumBoxWidth - 120, align: 'right' });
        curY += 20;
      }

      // =======================================================================
      // 6. PAYMENT INSTRUCTIONS (Left Column opposite to summary)
      // =======================================================================
      if (isInvoice && config.paymentInstructions && config.paymentInstructions.upiId) {
        const payY = curY - 75;
        const payWidth = colWidth + 20;
        doc.roundedRect(margin, payY, payWidth, 68, 4).fill(COLORS.lightGray);

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.teal)
           .text('PAYMENT DETAILS / SETTLEMENT:', margin + 10, payY + 8);

        doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.charcoal)
           .text(`UPI ID: `, margin + 10, payY + 22, { continued: true })
           .font('Helvetica').text(config.paymentInstructions.upiId);

        if (config.paymentInstructions.bankName && config.paymentInstructions.accountNumber) {
          doc.font('Helvetica-Bold')
             .text(`Bank: `, margin + 10, payY + 34, { continued: true })
             .font('Helvetica').text(`${config.paymentInstructions.bankName}  |  A/C: ${config.paymentInstructions.accountNumber}  |  IFSC: ${config.paymentInstructions.ifscCode}`);
        }

        doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(COLORS.grayText)
           .text(config.paymentInstructions.notes || 'Please include the invoice number as reference.', margin + 10, payY + 48, { width: payWidth - 20 });
      }

      // =======================================================================
      // 7. TERMS & CONDITIONS
      // =======================================================================
      curY = Math.max(curY, 660);

      doc.moveTo(margin, curY).lineTo(pageWidth - margin, curY).strokeColor(COLORS.borderGray).lineWidth(0.5).stroke();
      curY += 8;

      doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.teal).text('TERMS & CONDITIONS', margin, curY);
      curY += 12;

      const termsList = documentData.terms || (isInvoice ? config.terms.invoice : config.terms.quotation);
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.grayText);
      termsList.slice(0, 4).forEach((term, idx) => {
        doc.text(`${idx + 1}. ${term}`, margin, curY, { width: contentWidth });
        curY += 10;
      });

      // =======================================================================
      // 8. FOOTER
      // =======================================================================
      const footerY = 785;
      doc.rect(margin, footerY, contentWidth, 1).fill(COLORS.teal);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.deepOcean)
         .text('CAPE SECURE SOLUTIONS', margin, footerY + 6);

      doc.font('Helvetica').fontSize(7).fillColor(COLORS.grayText)
         .text('Where Three Seas Meet, Security Begins  •  Kanyakumari, Tamil Nadu, India  •  https://capesecure.vercel.app', margin, footerY + 16);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.teal)
         .text(`Page 1 of 1`, margin, footerY + 16, { width: contentWidth, align: 'right' });

      doc.end();
    } catch (err) {
      console.error('[PDF GENERATION ERROR]:', err);
      reject(err);
    }
  });
}

module.exports = {
  generateDocumentPDF
};
