/**
 * Cape Secure Solutions — Production Authentication, RBAC & Brute-Force Security
 * 
 * Implements:
 * - PBKDF2 Password Hashing (100k rounds, sha512)
 * - HMAC-SHA256 Session Tokens
 * - Strict 3-Attempt Anti-Brute-Force Account Lockout (15 min cooldown)
 * - Anti-Enumeration Generic Error Responses ("Invalid credentials.")
 * - Role-Based Access Control (SUPER_ADMIN, ADMIN, STAFF) with Granular Permissions
 * - Server-Side Token Revocation on Logout
 */

const crypto = require('crypto');
const db = require('../models/db');
const { JWT_SECRET } = require('../config/env');

const MAX_FAILED_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 3;
const LOCKOUT_WINDOW_MS = (parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 15) * 60 * 1000;

// Rate limiting state for failed logins: key -> { count, firstAttempt, lockedUntil }
const failedAttempts = new Map();

// Role-Based Access Control Permissions Map
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: [
    'VIEW_CUSTOMERS', 'VIEW_ENQUIRIES', 'UPDATE_ENQUIRIES', 'CREATE_QUOTATIONS',
    'VIEW_PAYMENTS', 'CREATE_INVOICES', 'VIEW_PROJECTS', 'MANAGE_PROJECTS',
    'VIEW_AUDIT_LOGS', 'MANAGE_ADMINS'
  ],
  ADMIN: [
    'VIEW_CUSTOMERS', 'VIEW_ENQUIRIES', 'UPDATE_ENQUIRIES', 'CREATE_QUOTATIONS',
    'VIEW_PAYMENTS', 'CREATE_INVOICES', 'VIEW_PROJECTS', 'MANAGE_PROJECTS',
    'VIEW_AUDIT_LOGS'
  ],
  STAFF: [
    'VIEW_CUSTOMERS', 'VIEW_ENQUIRIES', 'UPDATE_ENQUIRIES', 'VIEW_PROJECTS'
  ]
};

function hasPermission(userRole, permission) {
  const normalizedRole = (userRole || 'ADMIN').toUpperCase();
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.ADMIN;
  return permissions.includes(permission);
}

function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  if (!password || !hash || !salt) return false;
  try {
    const result = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(result, 'hex'));
  } catch (e) {
    return false;
  }
}

function generateSessionToken(user, expiresInHours = 12) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + (expiresInHours * 3600);
  const jti = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(JSON.stringify({
    jti,
    userId: user.id || user.userId,
    email: user.email,
    role: (user.role || 'admin').toLowerCase(),
    name: user.name || 'Cape Secure Administrator',
    exp
  })).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token missing.' };
  }

  if (db.isTokenRevoked(token)) {
    return { valid: false, error: 'Token has been revoked.' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed token structure.' };
  }

  const [header, payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  if (signature.length !== expectedSig.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false, error: 'Invalid token signature.' };
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (data.exp && data.exp < now) {
      return { valid: false, error: 'Session token expired.' };
    }
    return { valid: true, user: data };
  } catch (err) {
    return { valid: false, error: 'Invalid token payload.' };
  }
}

function revokeSessionToken(token) {
  if (token) {
    db.revokeToken(token);
  }
}

function checkRateLimit(identifier) {
  const now = Date.now();
  const record = failedAttempts.get(identifier);
  if (!record) return { allowed: true };

  // Check if active lockout period has expired
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, remainingSec, locked: true };
    } else {
      // Cooldown expired: reset
      failedAttempts.delete(identifier);
      return { allowed: true };
    }
  }

  // Check if window has expired
  if (now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(identifier);
    return { allowed: true };
  }

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    const remainingSec = Math.ceil(LOCKOUT_WINDOW_MS / 1000);
    return { allowed: false, remainingSec, locked: true };
  }

  return { allowed: true };
}

function recordFailedAttempt(identifier) {
  const now = Date.now();
  const record = failedAttempts.get(identifier) || { count: 0, firstAttempt: now };
  record.count += 1;
  record.lastFailedAttempt = now;

  // Lock account after 3 consecutive failed attempts
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_WINDOW_MS;
  }

  failedAttempts.set(identifier, record);
}

function clearFailedAttempts(identifier) {
  failedAttempts.delete(identifier);
}

function authenticateAdmin(email, password, ip = '127.0.0.1') {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rateLimitKey = `${cleanEmail}_${ip}`;

  // 1. Check Brute-Force Rate Limiting & Account Lockout
  const rateCheck = checkRateLimit(rateLimitKey);
  if (!rateCheck.allowed) {
    return {
      success: false,
      status: 429,
      message: `Too many failed login attempts. Account temporarily locked for 15 minutes. Please try again in ${rateCheck.remainingSec} seconds.`
    };
  }

  // 2. Fetch User Record
  const user = db.getUserByEmail(cleanEmail);
  if (!user) {
    recordFailedAttempt(rateLimitKey);
    // Generic response prevents username enumeration
    return { success: false, status: 401, message: 'Invalid credentials.' };
  }

  // 3. Verify Password
  const hash = user.passwordHash || user.hash;
  if (!hash || !user.salt) {
    recordFailedAttempt(rateLimitKey);
    return { success: false, status: 401, message: 'Invalid credentials.' };
  }

  const isValid = verifyPassword(password, hash, user.salt);
  if (!isValid) {
    recordFailedAttempt(rateLimitKey);
    return { success: false, status: 401, message: 'Invalid credentials.' };
  }

  // 4. Role Authorization Check
  const role = (user.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin' && role !== 'staff') {
    return { success: false, status: 403, message: 'Forbidden: Insufficient privileges.' };
  }

  // 5. Successful login: reset failed attempts counter
  clearFailedAttempts(rateLimitKey);

  const token = generateSessionToken(user);
  return {
    success: true,
    token,
    user: {
      id: user.id || user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    }
  };
}

function ensureDefaultAdmin() {
  const users = db.getUsers();
  if (users.length === 0) {
    const defaultEmail = 'admin@capesecure.com';
    const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || 'CapeSecure@2026!';
    const { hash, salt } = hashPassword(defaultPassword);

    db.saveUser({
      id: 'USR-ADMIN-0001',
      email: defaultEmail,
      name: 'Cape Secure Administrator',
      role: 'admin',
      passwordHash: hash,
      hash: hash,
      salt: salt,
      createdAt: new Date().toISOString()
    });
  }
}

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  hashPassword,
  verifyPassword,
  generateSessionToken,
  verifySessionToken,
  revokeSessionToken,
  authenticateAdmin,
  ensureDefaultAdmin,
  clearFailedAttempts
};
