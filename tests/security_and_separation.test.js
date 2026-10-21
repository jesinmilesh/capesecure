/**
 * Cape Secure Solutions — Architectural & Security Verification Suite
 * 
 * Tests:
 * 1. Public Website Serving (Zero admin UI, 404 on /admin)
 * 2. Public API Endpoints (Services, Pricing, Quote submission)
 * 3. Unauthorized Admin API Protection (401 on missing or invalid token)
 * 4. Customer Token Portal Access Control (403 on missing token, 200 on valid token)
 * 5. Admin Authentication & Session Issuance (PBKDF2 login)
 * 6. Authorized Admin API Operations (Dashboard, Customers, Orders, Invoices)
 * 7. Token Revocation on Logout (401 after logout)
 * 8. Security Headers & Strict CORS Verification
 */

const http = require('http');

const SERVER_URL = 'http://127.0.0.1:3000';

function request(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const req = http.request(url, {
      method,
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('CAPE SECURE — ARCHITECTURAL & SECURITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} -> ${detail}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Public Website Pages Load
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Public Website Pages ---');
    const pubHome = await request('GET', '/index.html');
    assert(pubHome.status === 200 && pubHome.body.includes('Cape Secure Solutions'), 'Public Home page loads');

    const pubServices = await request('GET', '/services.html');
    assert(pubServices.status === 200, 'Public Services page loads');

    const pubPricing = await request('GET', '/pricing.html');
    assert(pubPricing.status === 200, 'Public Pricing page loads');

    const pubQuote = await request('GET', '/quote.html');
    assert(pubQuote.status === 200, 'Public Quote page loads');

    // -------------------------------------------------------------------------
    // TEST 2: Admin Dashboard Completely Removed From Public Site
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Admin Removal From Public Website ---');
    const adminIndex = await request('GET', '/admin/');
    assert(adminIndex.status === 404, 'Direct /admin/ route returns 404 Not Found', `Got ${adminIndex.status}`);

    const adminHtml = await request('GET', '/admin/index.html');
    assert(adminHtml.status === 404, '/admin/index.html returns 404 Not Found', `Got ${adminHtml.status}`);

    const adminJs = await request('GET', '/admin/admin.js');
    assert(adminJs.status === 404, '/admin/admin.js returns 404 Not Found', `Got ${adminJs.status}`);

    // -------------------------------------------------------------------------
    // TEST 3: Public API Endpoints
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Public API Endpoints ---');
    const servicesApi = await request('GET', '/api/public/services');
    assert(servicesApi.status === 200 && servicesApi.json.success, 'GET /api/public/services returns tiers');

    const quoteSubmit = await request('POST', '/api/public/quote', {
      headers: { 'Content-Type': 'application/json' },
      body: {
        name: 'Verification Client',
        email: 'verify@capesecure.test',
        phone: '+91 94444 00000',
        package: 'business',
        service: 'Enterprise Web Application',
        needDomain: true,
        needHosting: true
      }
    });
    assert(quoteSubmit.status === 200 && quoteSubmit.json.orderId, 'POST /api/public/quote creates order and returns orderId');
    const testOrderId = quoteSubmit.json.orderId;
    const testToken = quoteSubmit.json.accessToken;

    // -------------------------------------------------------------------------
    // TEST 4: Unauthorized Admin API Access Protection
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Unauthorized Admin API Protection ---');
    const unauthCustomers = await request('GET', '/api/admin/customers');
    assert(unauthCustomers.status === 401, 'Unauthenticated GET /api/admin/customers returns 401', `Got ${unauthCustomers.status}`);

    const unauthOrders = await request('GET', '/api/admin/orders');
    assert(unauthOrders.status === 401, 'Unauthenticated GET /api/admin/orders returns 401', `Got ${unauthOrders.status}`);

    const unauthDash = await request('GET', '/api/admin/dashboard');
    assert(unauthDash.status === 401, 'Unauthenticated GET /api/admin/dashboard returns 401', `Got ${unauthDash.status}`);

    const invalidTokenDash = await request('GET', '/api/admin/dashboard', {
      headers: { 'Authorization': 'Bearer fake_invalid_jwt_token_12345' }
    });
    assert(invalidTokenDash.status === 401, 'Invalid Bearer token returns 401', `Got ${invalidTokenDash.status}`);

    // -------------------------------------------------------------------------
    // TEST 5: Customer Portal Access Control
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Customer Portal Access Control ---');
    const unauthOrderGet = await request('GET', `/api/public/orders/${testOrderId}`);
    assert(unauthOrderGet.status === 403, 'Order access without token returns 403 Forbidden', `Got ${unauthOrderGet.status}`);

    const authOrderGet = await request('GET', `/api/public/orders/${testOrderId}?token=${testToken}`);
    assert(authOrderGet.status === 200 && authOrderGet.json.order, 'Order access with valid token returns 200', `Got ${authOrderGet.status}`);

    // -------------------------------------------------------------------------
    // TEST 6: Admin Authentication (PBKDF2 Hashed Login)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Admin Authentication ---');
    const badLogin = await request('POST', '/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@capesecure.com', password: 'WrongPassword123!' }
    });
    assert(badLogin.status === 401, 'Login with wrong password rejected with 401', `Got ${badLogin.status}`);

    const goodLogin = await request('POST', '/api/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      body: { email: 'admin@capesecure.com', password: 'CapeSecure@2026!' }
    });
    assert(goodLogin.status === 200 && goodLogin.json.token, 'Login with valid admin credentials succeeds with 200 & token', `Got ${goodLogin.status}`);
    const adminToken = goodLogin.json.token;

    // -------------------------------------------------------------------------
    // TEST 7: Authenticated Admin Operations
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Authenticated Admin Operations ---');
    const authDash = await request('GET', '/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(authDash.status === 200 && authDash.json.metrics, 'Authenticated GET /api/admin/dashboard succeeds');

    const authCust = await request('GET', '/api/admin/customers', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(authCust.status === 200 && Array.isArray(authCust.json.customers), 'Authenticated GET /api/admin/customers returns customers');

    const authAudit = await request('GET', '/api/admin/audit-logs', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(authAudit.status === 200 && Array.isArray(authAudit.json.auditLogs), 'Authenticated GET /api/admin/audit-logs returns logs');

    // -------------------------------------------------------------------------
    // TEST 8: Token Revocation on Logout
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Token Revocation & Logout ---');
    const logoutRes = await request('POST', '/api/auth/logout', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout succeeds');

    const postLogoutDash = await request('GET', '/api/admin/dashboard', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(postLogoutDash.status === 401, 'Revoked token rejected with 401 on subsequent requests', `Got ${postLogoutDash.status}`);

    // -------------------------------------------------------------------------
    // TEST 9: Security Headers Verification
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Security Headers ---');
    const headersCheck = await request('GET', '/api/public/pricing');
    assert(headersCheck.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff present');
    assert(headersCheck.headers['x-frame-options'] === 'SAMEORIGIN', 'X-Frame-Options: SAMEORIGIN present');
    assert(headersCheck.headers['referrer-policy'] === 'strict-origin-when-cross-origin', 'Referrer-Policy present');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
