# Cape Secure Solutions — Target Architecture

## 1. System Overview
Cape Secure Solutions operates on a decoupled multi-tier architecture designed for high security, data privacy, and maintainability:

```
┌─────────────────────────────────┐
│     PUBLIC CLIENT WEBSITE       │  URL: https://capesecure.vercel.app/
│     (Static HTML/CSS/JS)        │  Audience: Customers, Visitors, Local Businesses
└────────────────┬────────────────┘
                 │
                 │ HTTPS (Public Endpoints: /api/public/*)
                 ▼
┌─────────────────────────────────┐
│       BACKEND API SERVER        │  Directory: backend/
│       (Node.js REST Engine)     │  Responsibilities: Auth, Validation, Pricing, PDF, Email, SSE
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│       DATABASE DATA LAYER       │  Directory: backend/models/data/
│       (Thread-safe Atomic Data) │  Storage: Orders, Quotations, Invoices, Audit Logs, Users
└────────────────▲────────────────┘
                 │
                 │ HTTPS (Bearer Token + Strict CORS)
                 │
┌────────────────┴────────────────┐
│      ADMIN CONTROL CENTER       │  URL: https://admin.capesecure.vercel.app/
│     (Standalone Application)    │  Audience: Authorized Administrators Only
└─────────────────────────────────┘
```

## 2. Directory Responsibilities
- `backend/`: Authoritative backend engine (controllers, routes, services, middleware, models, PDF generation, Brevo transactional email, company configuration).
- `backend/models/`: Thread-safe persistence and aggregation layer. Never directly accessible from any browser.
- `public/`: Public client-facing website assets (HTML, CSS, JS, images, logos). Contains zero administrative routes or database credentials.
- `api/`: Vercel serverless integration endpoints for serverless environments.
- `tests/`: Automated architectural, separation, and end-to-end workflow verification tests.
- `scripts/`: Operational tools, syntax validators, and favicon generators.
- `docs/`: System documentation, API reference, security models, and deployment guides.
