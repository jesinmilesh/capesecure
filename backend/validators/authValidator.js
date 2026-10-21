/**
 * Cape Secure Solutions — Auth Request Validator
 */

const { sanitizeString } = require('../utils/formatters');

function validateLoginInput(body = {}) {
  const email = sanitizeString(body.email || body.username || '', 120);
  const password = String(body.password || '');

  const errors = [];
  if (!email) errors.push('Email or username is required.');
  if (!password) errors.push('Password is required.');

  return {
    valid: errors.length === 0,
    errors,
    data: { email, password }
  };
}

module.exports = {
  validateLoginInput
};
