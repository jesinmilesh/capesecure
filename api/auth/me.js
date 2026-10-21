/**
 * Cape Secure Solutions — Admin Auth Verification Handler
 * Vercel Serverless Function: /api/auth/me
 */

const authCtrl = require('../../backend/controllers/authController');
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

  return authCtrl.me(req, res, authCheck.user);
}
