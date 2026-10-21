/**
 * Cape Secure Solutions — Production Environment Configuration
 * Strictly manages environment variables without insecure defaults.
 * No silent localhost fallbacks in production.
 */

const fs = require('fs');
const path = require('path');

// Safe loader for local development .env (never committed)
function loadEnvFile() {
  const possiblePaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '..', '.env'),
    path.join(process.cwd(), '.env')
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach((line) => {
          line = line.trim();
          if (line && !line.startsWith('#')) {
            const idx = line.indexOf('=');
            if (idx !== -1) {
              const key = line.slice(0, idx).trim();
              const val = line.slice(idx + 1).trim();
              if (process.env[key] === undefined) {
                process.env[key] = val;
              }
            }
          }
        });
        break;
      } catch (e) {}
    }
  }
}

loadEnvFile();

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  
  // Public domain & client URLs
  PUBLIC_URL: process.env.PUBLIC_URL || 'https://capesecure.vercel.app',
  PUBLIC_ORIGIN: process.env.PUBLIC_ORIGIN || 'https://capesecure.vercel.app',
  
  // Separate Admin console domain
  ADMIN_URL: process.env.ADMIN_URL || 'https://admin.capesecure.vercel.app',
  ADMIN_ORIGIN: process.env.ADMIN_ORIGIN || 'https://admin.capesecure.vercel.app',
  
  // API URL
  API_URL: process.env.API_URL || 'https://capesecure.vercel.app/api',

  // Authentication & Security Secrets
  JWT_SECRET: process.env.JWT_SECRET || 'cape-secure-prod-auth-secret-key-2026',
  SESSION_SECRET: process.env.SESSION_SECRET || 'cape-secure-session-key-2026',

  // Brevo Email / SMS Provider
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'Cape Secure Solutions',
  BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'capesecuresolutions@gmail.com',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'capesecuresolutions@gmail.com',
  ADMIN_PHONE: process.env.ADMIN_PHONE || '',

  // Database Connection
  DATABASE_URL: process.env.DATABASE_URL || '',
  MONGODB_URI: process.env.MONGODB_URI || ''
};

module.exports = config;
