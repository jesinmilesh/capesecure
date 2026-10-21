/**
 * Cape Secure Solutions — Admin Invoices API
 * Vercel Serverless Function: /api/admin/invoices
 */

const adminCtrl = require('../../backend/controllers/adminController');
const { getAuthUser } = require('../../backend/routes/authRoutes');
const { setCorsHeaders } = require('../../backend/middleware/security');

export default async function handler(req, res) {
  setCorsHeaders(req, res, false);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'capesecure.vercel.app'}`);
  const authCheck = getAuthUser(req, parsedUrl);

  if (!authCheck.authorized) {
    return res.status(authCheck.status).json({ success: false, message: authCheck.error });
  }

  if (req.method === 'GET') {
    return adminCtrl.getInvoices(req, res);
  } else if (req.method === 'POST') {
    return adminCtrl.createInvoice(req, res, req.body || {}, authCheck.user.email);
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
