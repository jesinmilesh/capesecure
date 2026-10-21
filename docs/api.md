# Cape Secure Solutions — REST API Specification

All API endpoints are namespaced to isolate public client traffic from privileged administrative operations.

---

## 1. Authentication Namespace (`/api/auth/*`)

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/auth/login` | POST | Authenticates admin using email and password; returns HMAC session token | None (Rate Limited) |
| `/api/auth/logout` | POST | Revokes active session token on server | Admin Token |
| `/api/auth/me` | GET | Validates token and returns admin profile | Admin Token |
| `/api/auth/refresh` | POST | Rotates and extends active session token | Admin Token |

---

## 2. Public Client Namespace (`/api/public/*`)

| Endpoint | Method | Description | Auth Required |
|---|---|---|---|
| `/api/public/services` | GET | Retrieves package catalog and add-on rates | None |
| `/api/public/pricing` | GET | Retrieves pricing structure | None |
| `/api/public/contact` | POST | Submits general contact inquiry | None (Honeypot + Rate Limit) |
| `/api/public/quote` | POST | Submits quote inquiry; server recalculates pricing and creates order | None (Honeypot + Rate Limit) |
| `/api/public/orders/:id` | GET | Retrieves customer order details | Valid `?token=<accessToken>` |
| `/api/public/quotations/:id` | GET | Customer reviews prepared quotation | Valid `?token=<accessToken>` |
| `/api/public/quotations/:id/pdf` | GET | Streams quotation vector PDF | Valid `?token=<accessToken>` |
| `/api/public/quotations/:id/approve` | POST | Customer formally approves quotation | Valid `?token=<accessToken>` |
| `/api/public/invoices/:id` | GET | Customer reviews tax invoice & UPI details | Valid `?token=<accessToken>` |
| `/api/public/invoices/:id/pdf` | GET | Streams invoice vector PDF | Valid `?token=<accessToken>` |

---

## 3. Administrative Namespace (`/api/admin/*`)
*Requires `Authorization: Bearer <token>` with `role === 'admin'`*

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/dashboard` | GET | Operations metrics (revenue, orders, balances) & audit feed |
| `/api/admin/customers` | GET | Consolidated customer profiles and order volume |
| `/api/admin/customers/:id` | GET | Detailed client dossier with order & billing history |
| `/api/admin/orders` | GET | All inbound customer orders |
| `/api/admin/orders/:id/status`| POST | Updates order milestone status |
| `/api/admin/orders/:id/kickoff` | POST | Dispatches kickoff email and marks development |
| `/api/admin/orders/:id/deliver` | POST | Dispatches delivery email and marks delivered |
| `/api/admin/orders/:id/renewal` | POST | Dispatches annual renewal email |
| `/api/admin/quotations` | GET / POST | Lists quotations or creates a new formal quotation |
| `/api/admin/quotations/:id/pdf` | GET | Generates quotation PDF for admin preview |
| `/api/admin/quotations/:id/send-email` | POST | Dispatches quotation email to client with PDF attachment |
| `/api/admin/invoices` | GET / POST | Lists invoices or issues a new tax invoice |
| `/api/admin/invoices/:id/pdf` | GET | Generates invoice PDF for admin preview |
| `/api/admin/invoices/:id/payment` | POST | Records payment; server recalculates balance |
| `/api/admin/invoices/:id/send-email` | POST | Dispatches tax invoice email to client |
| `/api/admin/projects` | GET | Active development lifecycle milestones |
| `/api/admin/emails` | GET | Transactional email dispatch history |
| `/api/admin/audit-logs` | GET | Immutable security audit trail |
| `/api/admin/settings` | GET / POST | Company settings, UPI ID, and bank wire configuration |
