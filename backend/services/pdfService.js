/**
 * Cape Secure Solutions — Server-Side Vector PDF Generator
 * Generates professional, branded A4 Quotations and Tax Invoices using PDFKit.
 * Matches Cape Secure visual identity: Deep Ocean, Turquoise, Sunrise Gold.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { getCompanyConfig, getLogoAbsolutePath } = require('../config/company');
const { COLORS } = require('../templates/pdf/pdfStyles');

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

      const docNumber = isInvoice ? (documentData.invoiceNumber || documentData.invoiceId) : documentData.quotationId;
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
          Subject: `${docTitle} for ${customer.businessName || customer.name}`,
          Keywords: 'Cape Secure Solutions, Web Development, Invoice, Quotation, Kanyakumari'
        }
      });

      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const margin = 40;
      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - margin * 2; // 515.28

      // =========================================================================
      // 1. TOP ACCENT BAR & HEADER
      // =========================================================================
      // Ocean Blue Top Header Band
      doc.rect(0, 0, pageWidth, 90).fill(COLORS.deepOcean);

      // Gold Accent Strip
      doc.rect(0, 88, pageWidth, 3).fill(COLORS.sunriseGold);

      // Logo or Branded Emblem
      const logoPath = getLogoAbsolutePath();
      let hasLogo = false;
      if (logoPath && fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, margin, 18, { fit: [54, 54] });
          hasLogo = true;
        } catch (e) {
          hasLogo = false;
        }
      }

      const brandTextX = hasLogo ? margin + 65 : margin;

      // Company Brand Text inside Header
      doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.white).text(config.companyName, brandTextX, 24);
      doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.turquoise).text(config.tagline, brandTextX, 44);
      doc.fontSize(7.5).font('Helvetica').fillColor(COLORS.lightGray).text(`${config.location} • ${config.website}`, brandTextX, 58);

      // Document Type & Badge (Right Aligned in Top Band)
      doc.fontSize(16).font('Helvetica-Bold').fillColor(COLORS.sunriseGold).text(docTitle, margin, 24, {
        align: 'right',
        width: contentWidth
      });
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(COLORS.white).text(`# ${docNumber}`, margin, 46, {
        align: 'right',
        width: contentWidth
      });

      // Status Pill for Invoices
      if (isInvoice) {
        const pStatus = (pricing.paymentStatus || 'PENDING').toUpperCase();
        let pillColor = COLORS.pendingGold;
        if (pStatus === 'PAID') pillColor = COLORS.paidGreen;
        else if (pStatus.includes('PARTIAL')) pillColor = COLORS.partialBlue;

        const pillWidth = 72;
        const pillHeight = 15;
        const pillX = pageWidth - margin - pillWidth;
        const pillY = 64;

        doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 3).fill(pillColor);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.white).text(pStatus, pillX, pillY + 3.5, {
          width: pillWidth,
          align: 'center'
        });
      }

      // =========================================================================
      // 2. METADATA & PARTIES SECTION
      // =========================================================================
      let curY = 110;

      // Left Column: Bill To / Issued To
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.teal).text('ISSUED TO / CLIENT:', margin, curY);
      curY += 12;

      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(COLORS.deepOcean).text(customer.businessName || customer.name || 'Valued Client', margin, curY);
      curY += 14;

      if (customer.businessName && customer.name) {
        doc.fontSize(8.5).font('Helvetica').fillColor(COLORS.charcoal).text(`Attn: ${customer.name}`, margin, curY);
        curY += 11;
      }

      if (customer.email) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.grayText).text(`Email: ${customer.email}`, margin, curY);
        curY += 10;
      }
      if (customer.phone) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.grayText).text(`Phone: ${customer.phone}`, margin, curY);
        curY += 10;
      }
      if (customer.city || customer.state) {
        doc.fontSize(8).font('Helvetica').fillColor(COLORS.grayText).text(`${customer.city || ''}, ${customer.state || 'India'}${customer.pincode ? ' - ' + customer.pincode : ''}`, margin, curY);
        curY += 10;
      }

      // Right Column: Document Details
      const rightColX = margin + 300;
      let rightY = 110;

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.teal).text('DOCUMENT DETAILS:', rightColX, rightY);
      rightY += 12;

      // Date rows
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.charcoal).text('Date of Issue:', rightColX, rightY);
      doc.font('Helvetica').fillColor(COLORS.grayText).text(docDate || 'N/A', rightColX + 70, rightY);
      rightY += 12;

      doc.font('Helvetica-Bold').fillColor(COLORS.charcoal).text(secondDateLabel, rightColX, rightY);
      doc.font('Helvetica').fillColor(COLORS.grayText).text(secondDate || 'N/A', rightColX + 70, rightY);
      rightY += 12;

      if (documentData.orderId) {
        doc.font('Helvetica-Bold').fillColor(COLORS.charcoal).text('Order Ref:', rightColX, rightY);
        doc.font('Helvetica').fillColor(COLORS.grayText).text(documentData.orderId, rightColX + 70, rightY);
        rightY += 12;
      }

      if (isInvoice && documentData.quotationId) {
        doc.font('Helvetica-Bold').fillColor(COLORS.charcoal).text('Quotation Ref:', rightColX, rightY);
        doc.font('Helvetica').fillColor(COLORS.grayText).text(documentData.quotationId, rightColX + 70, rightY);
        rightY += 12;
      }

      if (config.tax && config.tax.enabled && config.tax.gstin) {
        doc.font('Helvetica-Bold').fillColor(COLORS.charcoal).text('GSTIN:', rightColX, rightY);
        doc.font('Helvetica').fillColor(COLORS.grayText).text(config.tax.gstin, rightColX + 70, rightY);
        rightY += 12;
      }

      curY = Math.max(curY, rightY) + 15;

      // Divider line
      doc.strokeColor(COLORS.borderGray).lineWidth(1).moveTo(margin, curY).lineTo(pageWidth - margin, curY).stroke();
      curY += 12;

      // =========================================================================
      // 3. TABLE OF LINE ITEMS
      // =========================================================================
      const colX = {
        idx: margin + 8,
        desc: margin + 35,
        qty: margin + 330,
        rate: margin + 380,
        total: margin + 450
      };

      // Table Header Background
      doc.rect(margin, curY, contentWidth, 22).fill(COLORS.lightGray);
      doc.rect(margin, curY, contentWidth, 22).stroke(COLORS.borderGray);

      // Table Header Text
      doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.deepOcean);
      doc.text('#', colX.idx, curY + 6);
      doc.text('DESCRIPTION & SPECIFICATIONS', colX.desc, curY + 6);
      doc.text('QTY', colX.qty, curY + 6, { width: 35, align: 'center' });
      doc.text('RATE (₹)', colX.rate, curY + 6, { width: 55, align: 'right' });
      doc.text('TOTAL (₹)', colX.total, curY + 6, { width: 60, align: 'right' });

      curY += 22;

      // Render items
      items.forEach((item, idx) => {
        const rowHeight = 24;
        const isEven = idx % 2 === 1;

        if (isEven) {
          doc.rect(margin, curY, contentWidth, rowHeight).fill('#FAFAFC');
        }

        doc.strokeColor(COLORS.borderGray).lineWidth(0.5)
          .moveTo(margin, curY + rowHeight)
          .lineTo(pageWidth - margin, curY + rowHeight)
          .stroke();

        doc.fontSize(8).font('Helvetica').fillColor(COLORS.grayText);
        doc.text(String(idx + 1), colX.idx, curY + 7);

        doc.font('Helvetica-Bold').fillColor(COLORS.charcoal);
        doc.text(item.description, colX.desc, curY + 7, { width: 285, ellipsis: true });

        doc.font('Helvetica').fillColor(COLORS.grayText);
        doc.text(String(item.quantity || 1), colX.qty, curY + 7, { width: 35, align: 'center' });
        doc.text(Number(item.rate).toLocaleString('en-IN'), colX.rate, curY + 7, { width: 55, align: 'right' });

        doc.font('Helvetica-Bold').fillColor(COLORS.deepOcean);
        doc.text(Number(item.total).toLocaleString('en-IN'), colX.total, curY + 7, { width: 60, align: 'right' });

        curY += rowHeight;
      });

      curY += 10;

      // =========================================================================
      // 4. FINANCIAL TOTALS SUMMARY (Right Aligned Box)
      // =========================================================================
      const totalsBoxWidth = 210;
      const totalsBoxX = pageWidth - margin - totalsBoxWidth;
      let totY = curY;

      function renderTotalRow(label, value, isBold = false, isHighlight = false, color = COLORS.charcoal) {
        if (isHighlight) {
          doc.rect(totalsBoxX - 8, totY - 3, totalsBoxWidth + 8, 22).fill(COLORS.deepOcean);
        }
        doc.fontSize(isBold ? 9 : 8).font(isBold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(isHighlight ? COLORS.white : color)
          .text(label, totalsBoxX, totY, { width: 100 });

        doc.text(value, totalsBoxX + 90, totY, {
          width: totalsBoxWidth - 90,
          align: 'right'
        });
        totY += isHighlight ? 25 : 15;
      }

      renderTotalRow('Subtotal:', `₹ ${Number(pricing.subtotal || 0).toLocaleString('en-IN')}`);

      if (pricing.discount > 0) {
        renderTotalRow('Discount:', `- ₹ ${Number(pricing.discount).toLocaleString('en-IN')}`, false, false, '#DC2626');
      }

      if (pricing.taxEnabled && pricing.taxAmount > 0) {
        renderTotalRow(`${pricing.taxName} (${pricing.taxRate}%):`, `₹ ${Number(pricing.taxAmount).toLocaleString('en-IN')}`);
      }

      renderTotalRow('Total Amount:', `₹ ${Number(pricing.total || 0).toLocaleString('en-IN')}`, true, true);

      if (isInvoice) {
        if (pricing.amountPaid > 0) {
          renderTotalRow('Amount Paid:', `₹ ${Number(pricing.amountPaid).toLocaleString('en-IN')}`, false, false, COLORS.paidGreen);
        }
        renderTotalRow('Balance Due:', `₹ ${Number(pricing.balance !== undefined ? pricing.balance : pricing.total).toLocaleString('en-IN')}`, true, false, COLORS.charcoal);
      }

      // =========================================================================
      // 5. PAYMENT INSTRUCTIONS / TERMS & CONDITIONS (Left Column)
      // =========================================================================
      const leftBoxWidth = 270;
      let leftY = curY;

      if (isInvoice && config.paymentInstructions) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.teal).text('PAYMENT INSTRUCTIONS & BANK DETAILS:', margin, leftY);
        leftY += 12;

        const payInst = config.paymentInstructions;
        doc.rect(margin, leftY, leftBoxWidth, 54).fill('#F8FAFC');
        doc.rect(margin, leftY, leftBoxWidth, 54).stroke(COLORS.borderGray);

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.deepOcean);
        doc.text(`UPI ID: `, margin + 8, leftY + 7, { continued: true })
           .font('Helvetica').fillColor(COLORS.charcoal).text(payInst.upiId || 'N/A');

        if (payInst.bankName) {
          doc.font('Helvetica-Bold').text(`Bank: `, margin + 8, leftY + 18, { continued: true })
             .font('Helvetica').text(`${payInst.bankName} | A/C: ${payInst.accountNumber || ''}`);
          doc.font('Helvetica-Bold').text(`IFSC: `, margin + 8, leftY + 29, { continued: true })
             .font('Helvetica').text(`${payInst.ifscCode || ''} | Holder: ${payInst.accountHolder || ''}`);
        }

        doc.fontSize(7).font('Helvetica-Oblique').fillColor(COLORS.grayText)
           .text(payInst.notes || 'Include Invoice # as payment reference.', margin + 8, leftY + 41, { width: leftBoxWidth - 16 });

        leftY += 62;
      }

      // Terms & Conditions Block
      const termsList = documentData.terms || (isInvoice ? config.terms.invoice : config.terms.quotation) || [];
      if (termsList.length > 0) {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.teal).text('TERMS & CONDITIONS:', margin, leftY);
        leftY += 10;

        doc.fontSize(6.5).font('Helvetica').fillColor(COLORS.grayText);
        termsList.slice(0, 4).forEach((t) => {
          doc.text(`• ${t}`, margin, leftY, { width: leftBoxWidth });
          leftY += doc.heightOfString(`• ${t}`, { width: leftBoxWidth }) + 3;
        });
      }

      curY = Math.max(leftY, totY) + 20;

      // =========================================================================
      // 6. AUTHORIZED SIGNATURE & FOOTER
      // =========================================================================
      const signY = Math.max(curY, 730);

      // Signatory line on the right
      doc.strokeColor(COLORS.borderGray).lineWidth(1)
         .moveTo(pageWidth - margin - 150, signY + 25)
         .lineTo(pageWidth - margin, signY + 25)
         .stroke();

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(COLORS.deepOcean)
         .text(`For ${config.companyName}`, pageWidth - margin - 150, signY + 30, { width: 150, align: 'center' });
      doc.fontSize(6.5).font('Helvetica').fillColor(COLORS.grayText)
         .text('Authorized Signatory', pageWidth - margin - 150, signY + 40, { width: 150, align: 'center' });

      // Bottom Running Footer Bar
      const footerY = doc.page.height - 30;
      doc.strokeColor(COLORS.borderGray).lineWidth(0.5).moveTo(margin, footerY - 5).lineTo(pageWidth - margin, footerY - 5).stroke();
      doc.fontSize(6.5).font('Helvetica').fillColor(COLORS.grayText)
         .text(`This is a computer-generated document from Cape Secure Solutions • Kanyakumari, Tamil Nadu • Support: ${config.email}`, margin, footerY, {
           align: 'center',
           width: contentWidth
         });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateDocumentPDF
};
