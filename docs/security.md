# Cape Secure Solutions — Security Architecture

## 1. Zero-Trust Access Control
- **Public Isolation**: The public website (`capesecure.vercel.app`) contains zero administrative code, credentials, or dashboard files. Direct access to `/admin` returns HTTP 404.
- **Admin Authentication**: Administrative endpoints (`/api/admin/*`) require cryptographically signed session tokens (HMAC-SHA256).
- **Password Security**: Passwords hashed using PBKDF2 with 100,000 iterations of SHA-512 and unique per-user salts.
- **Anti-Brute Force**: 5 failed login attempts locks IP/account for 15 minutes.
- **Revocation List**: Logout invalidates the token server-side immediately (`backend/models/data/revoked_tokens.json`).

## 2. Server-Side Financial Authority
- **Zero-Trust Pricing**: Pricing calculations for orders, quotations, and invoices are performed 100% server-side via `backend/services/pricingEngine.js`. Frontend inputs only supply item identifiers and quantities.
- **Sequential Document Identifiers**: Sequential IDs (`CSS-ORD-YYYY-######`, `CSS-QTN-YYYY-######`, `CSS-INV-YYYY-######`) are allocated server-side using collision-safe counters.

## 3. Network & Transport Security
- **Strict CORS Policy**: Whitelists only approved production origins. Disallows wildcard (`*`) for administrative and authenticated routes.
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN` (prevents clickjacking)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
