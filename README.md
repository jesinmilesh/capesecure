# Cape Secure Solutions

> **"Where Three Seas Meet, Security Begins"**  
> *Professional Freelance Web Development & Digital Solutions • Kanyakumari, Tamil Nadu, India*

Cape Secure Solutions is an independent web development and digital solutions studio based at the meeting of the three oceans in Kanyakumari (Indian Ocean, Arabian Sea, and Bay of Bengal). We build high-performance, mobile-first business websites, booking engines, and secure web applications for local and global enterprises.

---

## 1. Project Architecture

The project is decoupled into three primary tiers:

```
Cape-Secure-Solutions/
│
├── vercel.json                 # Vercel deployment routing, caching & security headers
├── README.md                   # Comprehensive system documentation
├── package.json                # Project dependencies, scripts & metadata
├── package-lock.json           # Locked dependency tree
├── .gitignore                  # Git exclusion rules
│
├── backend/                    # Authoritative backend engine (Node.js REST API & Business Logic)
│   ├── config/                 # Centralized configuration (company.js, env.js, .env.example)
│   ├── controllers/            # Route controllers (public, auth, admin)
│   ├── middleware/             # Security middleware (auth.js, security.js, errorHandler.js)
│   ├── models/                 # Persistent data layer & atomic file store (db.js, data/*.json)
│   ├── routes/                 # Endpoint routing (publicRoutes, authRoutes, adminRoutes)
│   ├── services/               # Core business services
│   │   ├── pricingEngine.js    # Authoritative server-side price calculation
│   │   ├── pdfService.js       # Vector PDF engine for Quotations and Tax Invoices
│   │   ├── emailService.js     # Brevo transactional email engine with 8 templates
│   │   └── realtimeService.js  # Server-Sent Events (SSE) pub/sub for admin updates
│   ├── templates/              # Branded templates (email/emailTemplates.js, pdf/pdfStyles.js)
│   ├── utils/                  # Formatters, ID generators, structured logger
│   ├── validators/             # Input validation (quoteValidator, contactValidator, authValidator)
│   └── server.js               # Production HTTP application server
│
├── public/                     # Public customer-facing website (Static HTML/CSS/JS)
│   ├── index.html              # Homepage (Hero, Three Seas, Services, Portfolio, FAQ)
│   ├── services.html           # Detailed web development & digital solutions
│   ├── pricing.html            # Transparent starting packages (Starter, Business, Custom)
│   ├── work.html               # Live portfolio showcase & client case studies
│   ├── about.html              # Kanyakumari heritage & developer team profiles
│   ├── contact.html            # Direct inquiry form with anti-spam honeypot
│   ├── quote.html              # Interactive custom package & quote estimator
│   ├── portal/                 # Customer-facing secure token review portals
│   │   ├── quote.html          # Client quotation review and one-click approval
│   │   └── invoice.html        # Client invoice review, UPI copy, and payment instructions
│   ├── css/                    # Modular design system (style, responsive, animations, water)
│   ├── js/                     # Vanilla JS modules (navigation, quote, contact, dialog, etc.)
│   └── assets/                 # Brand logos, photography, trust badges, and project demos
│
├── api/                        # Vercel serverless integration endpoints
│   ├── health.js               # Production health check endpoint (/api/health)
│   ├── send-sms.js             # Brevo transactional notification dispatcher (/api/send-sms)
│   ├── contact.js              # Serverless contact submission handler (/api/contact)
│   ├── public/                 # Public serverless routes (/api/public/*)
│   ├── auth/                   # Authentication serverless routes (/api/auth/*)
│   └── admin/                  # Protected administrative serverless routes (/api/admin/*)
│
├── tests/                      # Automated test suites
│   ├── security_and_separation.test.js  # 25-point architectural & security test suite
│   └── workflow.test.js        # Full order -> quote -> invoice -> payment verification
│
├── scripts/                    # Development & maintenance tools
│   ├── validate.js             # Syntax and HTML asset integrity validator
│   └── generate-favicons.js    # Multi-resolution favicon generator
│
└── docs/                       # Architecture, security, API & deployment documentation
```

---

## 2. Security & Application Separation

- **Public Website (`https://capesecure.vercel.app`):** Contains zero administrative code, secrets, or internal controllers. Direct navigation to `/admin` returns HTTP 404.
- **Admin Console (`https://admin.capesecure.vercel.app`):** Hosted independently. Interacts exclusively with authenticated REST APIs (`/api/auth/*` and `/api/admin/*`).
- **Database Access:** Stored securely server-side under `backend/models/data/`. Zero client-side database connections.
- **Zero-Trust Pricing:** Total calculations for orders, quotations, and invoices are computed exclusively server-side via `backend/services/pricingEngine.js`.
- **PBKDF2 Password Hashing:** 100,000 rounds of SHA-512 with unique salts per user.
- **Session Tokens:** Cryptographically signed HMAC-SHA256 tokens with server-side revocation checks.
- **Strict CORS & Headers:** Dynamic whitelist of administrative origins. Enforces CSP, nosniff, and clickjacking prevention (`X-Frame-Options: SAMEORIGIN`).

---

## 3. API Reference

### Public Endpoints
- `GET /api/health` — System health check and status.
- `GET /api/public/services` — Public services and add-on catalog.
- `GET /api/public/pricing` — Starting packages and rates.
- `GET /api/public/projects` — Portfolio showcases.
- `POST /api/public/contact` — Contact inquiry submission.
- `POST /api/public/quote` — Project quote request (returns order reference).
- `GET /api/public/orders/:id?token=` — Customer order status portal.
- `GET /api/public/quotations/:id?token=` — Customer quotation review.
- `GET /api/public/quotations/:id/pdf?token=` — Stream vector quotation PDF.
- `POST /api/public/quotations/:id/approve?token=` — Customer quotation approval.
- `GET /api/public/invoices/:id?token=` — Customer invoice portal.
- `GET /api/public/invoices/:id/pdf?token=` — Stream vector tax invoice PDF.

### Authentication Endpoints
- `POST /api/auth/login` — Administrator login (returns session token).
- `POST /api/auth/logout` — Revokes session token.
- `GET /api/auth/me` — Inspects authenticated administrator profile.
- `POST /api/auth/refresh` — Refreshes session token.

### Administrative Endpoints (Bearer Token Required)
- `GET /api/admin/dashboard` — Aggregated revenue, order, and project metrics.
- `GET /api/admin/events` — Server-Sent Events (SSE) real-time event stream.
- `GET /api/admin/customers` — Consolidated customer profiles.
- `GET /api/admin/orders` — All client orders.
- `PUT /api/admin/orders/:id/status` — Updates project order status.
- `GET /api/admin/quotations` — All issued quotations.
- `POST /api/admin/quotations` — Generates quotation & dispatches vector PDF email.
- `GET /api/admin/invoices` — All tax invoices.
- `POST /api/admin/invoices` — Generates tax invoice & dispatches vector PDF email.
- `POST /api/admin/invoices/:id/payments` — Records payment & dispatches receipt email.
- `GET /api/admin/audit-logs` — Immutable security audit logs.
- `GET /api/admin/email-logs` — Transactional email delivery logs.
- `GET /api/admin/config` — Company settings & wire payment instructions.
- `PUT /api/admin/config` — Updates company business settings.

---

## 4. Development & Testing Commands

```bash
# Install dependencies
npm install

# Start local server (Port 3000)
npm start

# Run architectural & security test suite (25 test cases)
npm test

# Run end-to-end customer order-to-payment workflow test
npm run test:workflow

# Validate HTML asset references & JavaScript syntax
npm run validate
```

---

## 5. Production Deployment

- **Public Website:** Deploy `Cape Secure` to Vercel (serves `public/` and serverless `api/`).
- **Admin Website:** Deploy `admin-app/` (or `Cape Secure Admin`) to Vercel with `API_BASE_URL` pointing to the production domain.
- **Configure Environment Variables:** Add `BREVO_API_KEY`, `ADMIN_ORIGIN`, and secrets in Vercel project settings.