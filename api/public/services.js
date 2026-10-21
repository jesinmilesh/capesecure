/**
 * Cape Secure Solutions — Public Services API
 * Vercel Serverless Function: /api/public/services
 */

const { CATALOG } = require('../../backend/services/pricingEngine.js');

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    success: true,
    services: CATALOG
  });
}
