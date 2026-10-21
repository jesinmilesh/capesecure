/**
 * Cape Secure Solutions — Admin Dashboard & Metrics API
 * Vercel Serverless Function: /api/admin/dashboard
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

  return adminCtrl.getDashboard(req, res);
}
