/**
 * Cape Secure Solutions — Comprehensive Enquiry Workflow & Security Tests
 * 
 * Verifies:
 * 1. 3-attempt brute-force protection with account lockout (HTTP 429)
 * 2. Generic anti-enumeration response ("Invalid credentials.")
 * 3. Customer Enquiry submission & authoritative server-side sequential ID generation (CSS-ENQ-2026-######)
 * 4. Authentication enforcement on enquiry endpoints (HTTP 401)
 * 5. Retrieval of enquiries by authorized admin
 * 6. Strict state machine transition validation (rejects invalid transitions with HTTP 400)
 * 7. Admin assignment & internal note management
 * 8. Quotation and invoice generation from enquiry
 * 9. Real-time metrics reflection
 */

const http = require('http');

function postJson(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function putJson(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getJson(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method: 'GET',
      headers: {
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('CAPE SECURE — ENQUIRY WORKFLOW & SECURITY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Brute-Force & Anti-Enumeration Protection
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Brute-Force Protection (Max 3 Failed Attempts) ---');
    const testTargetEmail = `lockout_target_${Date.now()}@capesecure.com`;

    // Attempt 1: Failed
    const att1 = await postJson('/api/auth/login', { email: testTargetEmail, password: 'wrongpassword' });
    assert(att1.status === 401 && att1.data.message === 'Invalid credentials.', 'Attempt 1 rejected with 401 and generic message');

    // Attempt 2: Failed
    const att2 = await postJson('/api/auth/login', { email: testTargetEmail, password: 'wrongpassword' });
    assert(att2.status === 401 && att2.data.message === 'Invalid credentials.', 'Attempt 2 rejected with 401 and generic message');

    // Attempt 3: Failed (triggers lockout limit)
    const att3 = await postJson('/api/auth/login', { email: testTargetEmail, password: 'wrongpassword' });
    assert(att3.status === 401 && att3.data.message === 'Invalid credentials.', 'Attempt 3 rejected with 401 and generic message');

    // Attempt 4: Should be blocked by lockout policy (HTTP 429)
    const att4 = await postJson('/api/auth/login', { email: testTargetEmail, password: 'wrongpassword' });
    assert(att4.status === 429 && att4.data.message.includes('locked'), 'Attempt 4 blocked by lockout with 429 Too Many Requests');

    // -------------------------------------------------------------------------
    // Phase 2: Valid Administrator Authentication
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Admin Authentication & RBAC ---');
    const adminLogin = await postJson('/api/auth/login', { email: 'admin@capesecure.com', password: 'CapeSecure@2026!' });
    assert(adminLogin.status === 200 && adminLogin.data.success && !!adminLogin.data.token, 'Admin login succeeds with valid session token');
    const adminToken = adminLogin.data.token;
    const authHeaders = { 'Authorization': `Bearer ${adminToken}` };

    // -------------------------------------------------------------------------
    // Phase 3: Customer Enquiry Creation
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Public Customer Enquiry Submission ---');
    const quotePayload = {
      name: 'Karthik Subramanian',
      email: 'karthik.subramanian@gmail.com',
      whatsapp: '9840123456',
      phone: '9840123456',
      businessName: 'Subramanian Maritime Logistics',
      businessType: 'Export & Shipping',
      package: 'business',
      budget: '10000-25000',
      requirements: ['Custom Cargo Tracking Portal', 'WhatsApp Delivery Alerts', 'SSL Security Hardening'],
      needDomain: true,
      needHosting: true,
      needMaintenance: true,
      notes: 'Need high security infrastructure with Indian data residency.'
    };

    const quoteRes = await postJson('/api/public/quote', quotePayload);
    assert(quoteRes.status === 200 && quoteRes.data.success, 'Public quote form submitted successfully');
    assert(quoteRes.data.enquiryId && quoteRes.data.enquiryId.startsWith('CSS-ENQ-2026-'), `Generated server-side enquiry ID: ${quoteRes.data.enquiryId}`);
    assert(quoteRes.data.orderId && quoteRes.data.orderId.startsWith('CSS-ORD-2026-'), `Generated linked order ID: ${quoteRes.data.orderId}`);
    assert(!!quoteRes.data.requestId, `Generated unique request ID: ${quoteRes.data.requestId}`);

    const createdEnquiryId = quoteRes.data.enquiryId;
    const createdOrderId = quoteRes.data.orderId;

    // -------------------------------------------------------------------------
    // Phase 4: Enquiry Authorization & Retrieval
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Enquiry Access Control & Fetching ---');
    const unauthEnq = await getJson('/api/admin/enquiries');
    assert(unauthEnq.status === 401, 'Unauthenticated GET /api/admin/enquiries rejected with 401');

    const authEnq = await getJson('/api/admin/enquiries', authHeaders);
    assert(authEnq.status === 200 && authEnq.data && Array.isArray(authEnq.data.enquiries), 'Authenticated GET /api/admin/enquiries returns array');
    const foundEnq = authEnq.data.enquiries.find(e => e.enquiryId === createdEnquiryId);
    assert(!!foundEnq, `Created enquiry ${createdEnquiryId} retrieved from database`);
    assert(foundEnq.status === 'NEW', 'Initial enquiry workflow status is NEW');

    // -------------------------------------------------------------------------
    // Phase 5: Controlled Status Workflow Progression & State Machine
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Controlled Status Workflow State Machine ---');

    // Transition 1: Valid NEW -> REVIEWING
    const st1 = await putJson(`/api/admin/enquiries/${createdEnquiryId}/status`, { status: 'REVIEWING' }, authHeaders);
    assert(st1.status === 200 && st1.data.enquiry.status === 'REVIEWING', 'Valid transition NEW -> REVIEWING succeeds (200)');

    // Transition 2: Valid REVIEWING -> CONTACTED
    const st2 = await putJson(`/api/admin/enquiries/${createdEnquiryId}/status`, { status: 'CONTACTED' }, authHeaders);
    assert(st2.status === 200 && st2.data.enquiry.status === 'CONTACTED', 'Valid transition REVIEWING -> CONTACTED succeeds (200)');

    // Transition 3: Invalid CONTACTED -> COMPLETED (Must be rejected!)
    const st3 = await putJson(`/api/admin/enquiries/${createdEnquiryId}/status`, { status: 'COMPLETED' }, authHeaders);
    assert(st3.status === 400 && st3.data.message.includes('Invalid status transition'), 'Illegal transition CONTACTED -> COMPLETED correctly rejected (400)');

    // Transition 4: Valid CONTACTED -> QUOTATION_PREPARED
    const st4 = await putJson(`/api/admin/enquiries/${createdEnquiryId}/status`, { status: 'QUOTATION_PREPARED' }, authHeaders);
    assert(st4.status === 200 && st4.data.enquiry.status === 'QUOTATION_PREPARED', 'Valid transition CONTACTED -> QUOTATION_PREPARED succeeds (200)');

    // -------------------------------------------------------------------------
    // Phase 6: Admin Assignment & Internal Notes
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Admin Assignment & Internal Notes ---');
    const assignRes = await postJson(`/api/admin/enquiries/${createdEnquiryId}/assign`, { assignedAdmin: 'techlead@capesecure.com' }, authHeaders);
    assert(assignRes.status === 200 && assignRes.data.enquiry.assignedAdmin === 'techlead@capesecure.com', 'Enquiry assigned to staff member successfully');

    const noteRes = await postJson(`/api/admin/enquiries/${createdEnquiryId}/notes`, { note: 'Initial client briefing call completed via WhatsApp.' }, authHeaders);
    assert(noteRes.status === 200 && noteRes.data.enquiry.internalNotes.length > 0, 'Internal note added to enquiry audit trail');

    // -------------------------------------------------------------------------
    // Phase 7: Quotation & Invoice Creation Linked to Enquiry
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Quotation & Invoice Generation ---');
    const quoteCreate = await postJson('/api/admin/quotations', {
      orderId: createdOrderId,
      issueDate: '2026-10-21',
      validUntil: '2026-11-05',
      notes: 'Custom solution pricing as per initial consultation'
    }, authHeaders);
    assert(quoteCreate.status === 201 && quoteCreate.data.quotation.quotationId.startsWith('CSS-QTN-2026-'), `Quotation ${quoteCreate.data?.quotation?.quotationId} generated`);

    const quotationId = quoteCreate.data.quotation.quotationId;

    const invoiceCreate = await postJson('/api/admin/invoices', {
      orderId: createdOrderId,
      invoiceDate: '2026-10-21',
      dueDate: '2026-10-28',
      notes: 'Advance 50% invoice'
    }, authHeaders);
    assert(invoiceCreate.status === 201 && invoiceCreate.data.invoice.invoiceId.startsWith('CSS-INV-2026-'), `Invoice ${invoiceCreate.data?.invoice?.invoiceId} generated`);

    // -------------------------------------------------------------------------
    // Phase 8: Dashboard Metrics
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Dashboard Metrics Reflection ---');
    const metricsRes = await getJson('/api/admin/dashboard', authHeaders);
    assert(metricsRes.status === 200 && metricsRes.data.metrics.totalEnquiries > 0, `Dashboard metrics include total enquiries: ${metricsRes.data.metrics.totalEnquiries}`);

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exit(1);
  }
}

runTests();
