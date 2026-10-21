/**
 * Cape Secure Solutions — Admin Enquiries API
 * Vercel Serverless Function: /api/admin/enquiries
 */

const adminCtrl = require('../../backend/controllers/adminController');
const { getAuthUser } = require('../../backend/routes/authRoutes');
const { setCorsHeaders } = require('../../backend/middleware/security');
const auth = require('../../backend/middleware/auth');

export default async function handler(req, res) {
  setCorsHeaders(req, res, false);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const parsedUrl = new URL(req.url, `https://${req.headers.host || 'capesecure.vercel.app'}`);
  const authCheck = getAuthUser(req, parsedUrl);

  if (!authCheck.authorized) {
    return res.status(authCheck.status).json({ success: false, message: authCheck.error });
  }

  if (req.method === 'GET') {
    if (!auth.hasPermission(authCheck.user.role, 'VIEW_ENQUIRIES')) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
    }
    return adminCtrl.getEnquiries(req, res);
  }

  return res.status(405).json({ success: false, message: 'Method Not Allowed' });
}
