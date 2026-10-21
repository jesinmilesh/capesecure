/**
 * CapeSecure - Contact Form Serverless Handler
 * Vercel Serverless Function: /api/contact
 * Mirrors /api/send-sms handler for standardized REST intake.
 */

const handler = require('./send-sms.js');

module.exports = handler;
