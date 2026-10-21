/**
 * Cape Secure Solutions — Server-Side ID & Token Generator
 * Produces guaranteed unique sequential identifiers:
 * - Orders:     CSS-ORD-YYYY-######
 * - Quotations: CSS-QTN-YYYY-######
 * - Invoices:   CSS-INV-YYYY-######
 */

const crypto = require('crypto');
const { getCompanyConfig } = require('../config/company');

function generateNextId(prefixKey, existingItems = []) {
  const config = getCompanyConfig();
  const year = new Date().getFullYear();
  const prefix = (config.prefixes && config.prefixes[prefixKey]) || `CSS-${prefixKey.toUpperCase()}`;

  const regex = new RegExp(`^${prefix}-${year}-(\\d{6})$`);
  let maxSeq = 0;

  for (const item of existingItems) {
    let id = '';
    if (prefixKey === 'enquiry') {
      id = item.enquiryId || '';
    } else if (prefixKey === 'order') {
      id = item.orderId || '';
    } else if (prefixKey === 'quotation') {
      id = item.quotationId || '';
    } else if (prefixKey === 'invoice') {
      id = item.invoiceId || item.invoiceNumber || '';
    }

    const match = id.match(regex);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(6, '0');
  return `${prefix}-${year}-${nextSeq}`;
}

function generateAccessToken() {
  return crypto.randomBytes(18).toString('hex');
}

function generateRequestId() {
  return 'req_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

module.exports = {
  generateNextId,
  generateAccessToken,
  generateRequestId
};
