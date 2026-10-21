/**
 * Cape Secure Solutions — Admin Auth Logout Handler
 * Vercel Serverless Function: /api/auth/logout
 */

const authCtrl = require('../../backend/controllers/authController');
const { setCorsHeaders } = require('../../backend/middleware/security');

export default async function handler(req, res) {
  setCorsHeaders(req, res, false);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  return authCtrl.logout(req, res, clientIp);
}
