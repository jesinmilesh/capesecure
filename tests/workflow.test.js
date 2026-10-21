/**
 * Cape Secure Solutions — End-to-End Workflow Verification Script
 * Validates Order Creation -> Quotation -> PDF -> Customer Approval -> Invoice -> Payment -> Email
 */

async function runTest() {
  console.log('--- TEST 0: Admin Authentication ---');
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@capesecure.com', password: 'CapeSecure@2026!' })
  });
  const loginData = await loginRes.json();
  const adminToken = loginData.token;
  console.log('Admin Authenticated:', loginData.success, 'User:', loginData.user?.email);

  // 1. Create Customer Order
  console.log('\n--- TEST 1: Customer Order Submission ---');
  const orderRes = await fetch('http://127.0.0.1:3000/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Dr. S. K. Nathan',
      businessName: 'Cape Diagnostics Laboratory',
      email: 'capesecuresolutions@gmail.com',
      phone: '9840112233',
      businessType: 'healthcare',
      package: 'business',
      needDomain: true,
      domain: 'capediagnostics.in',
      needHosting: true,
      needMaintenance: true,
      needSecurity: true,
      message: 'Need patient blood test report download and doctor appointment system.'
    })
  });
  const orderData = await orderRes.json();
  console.log('Order Result:', orderData.orderId, 'Total: ₹', orderData.total);
  const orderId = orderData.orderId;

  // 2. Admin creates Quotation
  console.log('\n--- TEST 2: Admin Creates Quotation ---');
  const quoteRes = await fetch('http://127.0.0.1:3000/api/quotations/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      orderId,
      discount: 500,
      sendEmail: true
    })
  });
  const quoteData = await quoteRes.json();
  console.log('Quotation Result:', quoteData.quotation?.quotationId, 'Total: ₹', quoteData.quotation?.pricing?.total);
  const quotationId = quoteData.quotation?.quotationId;
  const quoteToken = quoteData.quotation?.accessToken;

  // 3. Test Quotation PDF Stream
  console.log('\n--- TEST 3: Fetch Quotation PDF ---');
  const quotePdfRes = await fetch('http://127.0.0.1:3000/api/quotations/' + quotationId + '/pdf?token=' + quoteToken);
  console.log('Quotation PDF status:', quotePdfRes.status, 'Content-Type:', quotePdfRes.headers.get('content-type'), 'Length:', quotePdfRes.headers.get('content-length'));

  // 4. Customer Approves Quotation
  console.log('\n--- TEST 4: Customer Approves Quotation ---');
  const approveRes = await fetch('http://127.0.0.1:3000/api/quotations/' + quotationId + '/approve?token=' + quoteToken, {
    method: 'POST'
  });
  const approveData = await approveRes.json();
  console.log('Approve Result:', approveData.success);

  // 5. Admin Generates Tax Invoice
  console.log('\n--- TEST 5: Admin Generates Invoice ---');
  const invRes = await fetch('http://127.0.0.1:3000/api/invoices/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      quotationId,
      sendEmail: true
    })
  });
  const invData = await invRes.json();
  const invoiceId = invData.invoice?.invoiceNumber || invData.invoice?.invoiceId;
  const invoiceToken = invData.invoice?.accessToken;
  console.log('Invoice Generated:', invoiceId, 'Total: ₹', invData.invoice?.pricing?.total);

  // 6. Test Invoice PDF Stream
  console.log('\n--- TEST 6: Fetch Invoice PDF ---');
  const invPdfRes = await fetch('http://127.0.0.1:3000/api/invoices/' + invoiceId + '/pdf?token=' + invoiceToken);
  console.log('Invoice PDF status:', invPdfRes.status, 'Content-Type:', invPdfRes.headers.get('content-type'), 'Length:', invPdfRes.headers.get('content-length'));

  // 7. Admin Records 50% Advance Payment
  console.log('\n--- TEST 7: Admin Records Partial Payment ---');
  const payRes = await fetch('http://127.0.0.1:3000/api/invoices/' + invoiceId + '/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      amount: 6000,
      method: 'UPI',
      transactionRef: 'UPI-2026-9988776655',
      notes: '50% advance for project initiation'
    })
  });
  const payData = await payRes.json();
  console.log('Payment Result:', payData.success, 'New Status:', payData.invoice?.status, 'Balance Due: ₹', payData.invoice?.pricing?.balance);

  // 8. Admin Metrics
  console.log('\n--- TEST 8: Admin Metrics ---');
  const metricsRes = await fetch('http://127.0.0.1:3000/api/admin/metrics', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const metricsData = await metricsRes.json();
  console.log('Metrics Summary:', metricsData.metrics);
}

runTest().catch(console.error);
