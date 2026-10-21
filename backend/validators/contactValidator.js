/**
 * Cape Secure Solutions — Contact Form Validator
 */

const { sanitizeString } = require('../utils/formatters');

function validateContactSubmission(body = {}) {
  if (body.website_trap || body.hp_name) {
    return { isSpam: true, valid: false };
  }

  const name = sanitizeString(body.name || '', 100);
  const email = sanitizeString(body.email || '', 120).toLowerCase();
  const phone = sanitizeString(body.phone || body.whatsapp || '', 30);
  const message = sanitizeString(body.message || '', 2000);

  const errors = [];

  if (!name || name.length < 2) {
    errors.push('Name is required.');
  }

  if (!email && !phone) {
    errors.push('Please provide either an email or phone number.');
  }

  return {
    valid: errors.length === 0,
    isSpam: false,
    errors,
    data: { name, email, phone, message }
  };
}

module.exports = {
  validateContactSubmission
};
