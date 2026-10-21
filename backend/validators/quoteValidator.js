/**
 * Cape Secure Solutions — Quote & Order Submission Validator
 */

const { sanitizeString } = require('../utils/formatters');

function validateQuoteSubmission(body = {}) {
  // 1. Anti-spam honeypot detection
  if (body.website_trap || body.hp_name) {
    return { isSpam: true, valid: false };
  }

  const name = sanitizeString(body.name || '', 100);
  const email = sanitizeString(body.email || '', 120).toLowerCase();
  const phone = sanitizeString(body.phone || body.whatsapp || '', 30);
  const businessName = sanitizeString(body.businessName || body.company || '', 150);
  const businessType = sanitizeString(body.businessType || body.category || 'Standard', 80);
  const notes = sanitizeString(body.notes || body.message || '', 2000);

  const errors = [];

  if (!name || name.length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  if (!email && !phone) {
    errors.push('Please provide a valid email address or phone number.');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address format.');
  }

  return {
    valid: errors.length === 0,
    isSpam: false,
    errors,
    data: {
      ...body,
      name,
      email,
      phone,
      businessName,
      businessType,
      notes
    }
  };
}

module.exports = {
  validateQuoteSubmission
};
