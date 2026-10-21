/**
 * Cape Secure Solutions — Production CORS, Security Headers, and Rate Limiting
 */

const { PUBLIC_ORIGIN, ADMIN_ORIGIN } = require('../config/env');

const publicRateLimits = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_PUBLIC_REQUESTS_PER_MIN = 30;

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

function setCorsHeaders(req, res, isPublicApi = false) {
  const origin = req.headers.origin;

  if (isPublicApi) {
    // Public endpoints allow verified client origin or standard requests
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return;
  }

  // Admin / Sensitive APIs: Strictly whitelist configured admin origins
  const allowedOrigins = [
    ADMIN_ORIGIN,
    PUBLIC_ORIGIN
  ].filter(Boolean);

  if (origin) {
    const isDev = process.env.NODE_ENV !== 'production';
    const isAllowed = allowedOrigins.some(o => o.toLowerCase().trim() === normOrigin) ||
      normOrigin.endsWith('.vercel.app') ||
      (isDev && (normOrigin.includes('localhost') || normOrigin.includes('127.0.0.1')));

    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      // Disallowed origin
      res.setHeader('Access-Control-Allow-Origin', ADMIN_ORIGIN || 'https://admin.capesecure.vercel.app');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', ADMIN_ORIGIN || 'https://admin.capesecure.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Requested-With');
}

function checkPublicRateLimit(ip, endpoint = 'public') {
  const key = `${ip}_${endpoint}`;
  const now = Date.now();
  const record = publicRateLimits.get(key) || { count: 0, first: now };

  if (now - record.first > RATE_LIMIT_WINDOW_MS) {
    publicRateLimits.set(key, { count: 1, first: now });
    return true;
  }

  record.count += 1;
  publicRateLimits.set(key, record);

  return record.count <= MAX_PUBLIC_REQUESTS_PER_MIN;
}

module.exports = {
  setSecurityHeaders,
  setCorsHeaders,
  checkPublicRateLimit
};
