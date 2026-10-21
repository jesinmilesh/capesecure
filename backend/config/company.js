/**
 * Cape Secure Solutions — Centralized Company Configuration
 * Source of truth for business metadata, contact details, branding, and defaults.
 * Loaded across PDF generation, Email templating, and Billing operations.
 */

const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'models', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'company_settings.json');

// Base defaults
const DEFAULT_CONFIG = {
  companyName: 'Cape Secure Solutions',
  tagline: 'Where Three Seas Meet, Security Begins',
  businessType: 'Digital Solutions & Web Development',
  location: 'Kanyakumari, Tamil Nadu, India',
  address: 'Cape Secure Solutions, Kanyakumari District, Tamil Nadu 629702, India',
  email: process.env.COMPANY_EMAIL || 'capesecuresolutions@gmail.com',
  website: process.env.COMPANY_WEBSITE || 'https://capesecure.vercel.app',
  phone: process.env.COMPANY_PHONE || '+91 93425 80133',
  whatsapp: process.env.COMPANY_WHATSAPP || '+91 93425 80133',
  logoRelativePath: 'assets/logo/cape-secure-logo.png',
  
  // Tax / GST configuration (Optional - only applied if explicitly enabled)
  tax: {
    enabled: false,
    name: 'GST',
    ratePercent: 18,
    gstin: process.env.COMPANY_GSTIN || '',
    pan: process.env.COMPANY_PAN || ''
  },
  
  // Payment instructions displayed on invoices (configured by admin)
  paymentInstructions: {
    upiId: process.env.COMPANY_UPI_ID || 'capesecuresolutions@upi',
    bankName: process.env.COMPANY_BANK_NAME || '',
    accountNumber: process.env.COMPANY_ACCOUNT_NUMBER || '',
    ifscCode: process.env.COMPANY_IFSC_CODE || '',
    accountHolder: process.env.COMPANY_ACCOUNT_HOLDER || 'Cape Secure Solutions',
    notes: 'Please quote the Invoice Number as reference in your payment transfer.'
  },

  // Document numbering prefixes
  prefixes: {
    enquiry: 'CSS-ENQ',
    order: 'CSS-ORD',
    quotation: 'CSS-QTN',
    invoice: 'CSS-INV'
  },

  // Standard terms & conditions
  terms: {
    quotation: [
      'This quotation is valid for 15 days from the date of issue.',
      'A 50% advance deposit is required to commence development work.',
      'Balance payment is due upon successful staging and prior to production domain cutover.',
      'Scope additions beyond this quotation will be billed at standard component rates.'
    ],
    invoice: [
      'Payment is due within 7 days of the invoice date unless otherwise agreed in writing.',
      'Hosting, domain registration, and SSL certificates are provisioned upon receipt of advance.',
      'Annual maintenance and renewal fees will be invoiced 30 days prior to cycle expiration.',
      'All intellectual property rights transfer to the client upon full payment settlement.'
    ]
  }
};

function getCompanyConfig() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch (err) {
    console.warn('[CONFIG] Failed to read company_settings.json, using defaults:', err.message);
  }
  return DEFAULT_CONFIG;
}

function updateCompanyConfig(updates) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = getCompanyConfig();
    const merged = { ...current, ...updates };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (err) {
    console.error('[CONFIG] Failed to update company_settings.json:', err);
    throw err;
  }
}

function getLogoAbsolutePath() {
  const rootDir = path.join(__dirname, '..', '..');
  const candidate = path.join(rootDir, 'public', 'assets', 'logo', 'cape-secure-logo.png');
  if (fs.existsSync(candidate)) return candidate;
  const fallbackJpg = path.join(rootDir, 'public', 'assets', 'logo', 'cape-secure-logo.jpg');
  if (fs.existsSync(fallbackJpg)) return fallbackJpg;
  return null;
}

module.exports = {
  getCompanyConfig,
  updateCompanyConfig,
  getLogoAbsolutePath,
  DEFAULT_CONFIG
};
