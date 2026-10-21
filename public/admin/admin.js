/**
 * Cape Secure Solutions — Admin Dashboard Orchestrator
 * Full lifecycle controller for Orders, Quotations, Invoices, Payments, PDF links, and Settings.
 */

(function () {
  'use strict';

  let adminToken = localStorage.getItem('cape_admin_token') || '';

  const loginGate = document.getElementById('loginGate');
  const adminDashboard = document.getElementById('adminDashboard');
  const btnLogout = document.getElementById('btnLogout');
  const loginForm = document.getElementById('adminLoginForm');
  const secretInput = document.getElementById('adminSecretKey');

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    if (adminToken) {
      verifyAndLoadDashboard();
    } else {
      showLogin();
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const entered = secretInput.value.trim();
        if (entered) {
          adminToken = entered;
          localStorage.setItem('cape_admin_token', adminToken);
          verifyAndLoadDashboard();
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        localStorage.removeItem('cape_admin_token');
        adminToken = '';
        showLogin();
      });
    }

    initTabs();
    initModals();
    initSettings();
  });

  function showLogin() {
    if (loginGate) loginGate.style.display = 'flex';
    if (adminDashboard) adminDashboard.style.display = 'none';
    if (btnLogout) btnLogout.style.display = 'none';
  }

  async function verifyAndLoadDashboard() {
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: { 'x-admin-token': adminToken }
      });
      if (res.status === 401) {
        localStorage.removeItem('cape_admin_token');
        adminToken = '';
        showLogin();
        if (window.showCapeDialog) {
          window.showCapeDialog({
            type: 'error',
            title: 'Authentication Failed',
            message: 'Invalid Admin Secret Key. Please try again.',
            confirmText: 'OK'
          });
        }
        return;
      }

      if (loginGate) loginGate.style.display = 'none';
      if (adminDashboard) adminDashboard.style.display = 'flex';
      if (btnLogout) btnLogout.style.display = 'inline-flex';

      loadMetrics();
      loadOrders();
      loadQuotations();
      loadInvoices();
      loadProjects();
      loadLogs();
      loadSettings();
    } catch (err) {
      console.error('[ADMIN] Error verifying session:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // TABS
  // ---------------------------------------------------------------------------
  function initTabs() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        const tabKey = item.getAttribute('data-tab');
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.style.display = 'none');

        const targetPane = document.getElementById(`tab${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
        if (targetPane) targetPane.style.display = 'block';

        if (tabKey === 'orders') loadOrders();
        else if (tabKey === 'quotations') loadQuotations();
        else if (tabKey === 'invoices') loadInvoices();
        else if (tabKey === 'projects') loadProjects();
        else if (tabKey === 'logs') loadLogs();
        else if (tabKey === 'settings') loadSettings();
      });
    });

    document.getElementById('btnRefreshOrders')?.addEventListener('click', loadOrders);
    document.getElementById('btnRefreshQuotes')?.addEventListener('click', loadQuotations);
    document.getElementById('btnRefreshInvoices')?.addEventListener('click', loadInvoices);
    document.getElementById('btnRefreshLogs')?.addEventListener('click', loadLogs);
  }

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  async function loadMetrics() {
    try {
      const res = await fetch('/api/admin/metrics', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (data.success && data.metrics) {
        const m = data.metrics;
        document.getElementById('statOrders').textContent = m.totalOrders;
        document.getElementById('statQuotes').textContent = m.totalQuotations;
        document.getElementById('statInvoices').textContent = m.totalInvoices;
        document.getElementById('statRevenue').textContent = `₹${Number(m.totalRevenue).toLocaleString('en-IN')}`;
        document.getElementById('statBalance').textContent = `₹${Number(m.pendingBalance).toLocaleString('en-IN')}`;
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 1. ORDERS
  // ---------------------------------------------------------------------------
  async function loadOrders() {
    const tbody = document.getElementById('ordersTableBody');
    try {
      const res = await fetch('/api/orders', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (!data.success || !data.orders.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--admin-text-dim);">No customer requests found.</td></tr>';
        return;
      }

      tbody.innerHTML = data.orders.map(o => {
        const c = o.customer || {};
        const p = o.project || {};
        const dateStr = o.createdAt ? o.createdAt.split('T')[0] : '';
        const statusClass = (o.status || 'enquiry').replace(/\s+/g, '-');

        return `
          <tr>
            <td><strong style="color: var(--admin-cyan);">${o.orderId}</strong></td>
            <td><strong>${escapeHtml(c.name || 'Client')}</strong><br><small style="color: var(--admin-text-dim);">${escapeHtml(c.email || c.phone || '')}</small></td>
            <td>${escapeHtml(c.businessName || '—')}</td>
            <td><span class="status-pill ${p.package}">${escapeHtml(p.package.toUpperCase())}</span><br><small>${escapeHtml(p.service)}</small></td>
            <td>₹${Number(o.pricing?.total || 0).toLocaleString('en-IN')}</td>
            <td><span class="status-pill ${statusClass}">${o.status}</span></td>
            <td>${dateStr}</td>
            <td>
              <div class="btn-action-group">
                <button type="button" class="btn-action primary" onclick="openQuotationModal('${o.orderId}')">Prepare Quote</button>
                ${o.invoiceId ? `<a href="/api/invoices/${o.invoiceId}/pdf?token=${adminToken}" target="_blank" class="btn-action">View Invoice</a>` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="color: var(--admin-coral); text-align: center;">Error loading orders: ${err.message}</td></tr>`;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. QUOTATIONS
  // ---------------------------------------------------------------------------
  async function loadQuotations() {
    const tbody = document.getElementById('quotesTableBody');
    try {
      const res = await fetch('/api/quotations', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (!data.success || !data.quotations.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--admin-text-dim);">No quotations created yet.</td></tr>';
        return;
      }

      tbody.innerHTML = data.quotations.map(q => {
        const c = q.customer || {};
        const statusClass = (q.status || 'sent').toLowerCase();

        return `
          <tr>
            <td><strong style="color: var(--admin-cyan);">${q.quotationId}</strong></td>
            <td>${q.orderId}</td>
            <td><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.businessName || c.email || '')}</small></td>
            <td><strong>₹${Number(q.pricing?.total || 0).toLocaleString('en-IN')}</strong></td>
            <td>${q.validUntil}</td>
            <td><span class="status-pill ${statusClass}">${q.status}</span></td>
            <td>
              <div class="btn-action-group">
                <a href="/api/quotations/${q.quotationId}/pdf?token=${adminToken}" target="_blank" class="btn-action">Preview PDF</a>
                <a href="/portal/quote.html?id=${q.quotationId}&token=${q.accessToken}" target="_blank" class="btn-action">Client Portal</a>
                <button type="button" class="btn-action" onclick="sendQuotationEmail('${q.quotationId}')">Email Quote</button>
                ${q.status !== 'approved' ? `<button type="button" class="btn-action primary" onclick="approveAndInvoice('${q.quotationId}')">Approve & Invoice</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" style="color: var(--admin-coral); text-align: center;">Error loading quotations.</td></tr>`;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. INVOICES
  // ---------------------------------------------------------------------------
  async function loadInvoices() {
    const tbody = document.getElementById('invoicesTableBody');
    try {
      const res = await fetch('/api/invoices', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (!data.success || !data.invoices.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--admin-text-dim);">No invoices generated yet.</td></tr>';
        return;
      }

      tbody.innerHTML = data.invoices.map(inv => {
        const c = inv.customer || {};
        const pr = inv.pricing || {};
        const statusClass = (inv.status || 'pending').toLowerCase().replace(/\s+/g, '-');

        return `
          <tr>
            <td><strong style="color: var(--admin-cyan);">${inv.invoiceId}</strong></td>
            <td>${inv.orderId}</td>
            <td><strong>${escapeHtml(c.name)}</strong><br><small>${escapeHtml(c.businessName || '')}</small></td>
            <td>₹${Number(pr.total || 0).toLocaleString('en-IN')}</td>
            <td style="color: var(--admin-aqua);">₹${Number(pr.amountPaid || 0).toLocaleString('en-IN')}</td>
            <td style="color: ${pr.balance > 0 ? 'var(--admin-gold)' : 'var(--admin-aqua)'}; font-weight: 700;">₹${Number(pr.balance || 0).toLocaleString('en-IN')}</td>
            <td><span class="status-pill ${statusClass}">${inv.status}</span></td>
            <td>${inv.dueDate}</td>
            <td>
              <div class="btn-action-group">
                <a href="/api/invoices/${inv.invoiceId}/pdf?token=${adminToken}" target="_blank" class="btn-action">PDF</a>
                <a href="/portal/invoice.html?id=${inv.invoiceId}&token=${inv.accessToken}" target="_blank" class="btn-action">Client Portal</a>
                <button type="button" class="btn-action" onclick="sendInvoiceEmail('${inv.invoiceId}')">Email</button>
                <button type="button" class="btn-action primary" onclick="openPaymentModal('${inv.invoiceId}', ${pr.balance})">Record Payment</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color: var(--admin-coral); text-align: center;">Error loading invoices.</td></tr>`;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. PROJECT LIFECYCLE
  // ---------------------------------------------------------------------------
  async function loadProjects() {
    const tbody = document.getElementById('projectsTableBody');
    try {
      const res = await fetch('/api/orders', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (!data.success || !data.orders.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-dim);">No active projects.</td></tr>';
        return;
      }

      tbody.innerHTML = data.orders.map(o => {
        const c = o.customer || {};
        const p = o.project || {};
        return `
          <tr>
            <td><strong style="color: var(--admin-cyan);">${o.orderId}</strong></td>
            <td><strong>${escapeHtml(c.name)}</strong> (${escapeHtml(c.businessName || 'Direct')})</td>
            <td>${escapeHtml(p.service)}</td>
            <td><span class="status-pill ${o.status}">${o.status}</span></td>
            <td>
              <div class="btn-action-group">
                <button type="button" class="btn-action" onclick="kickoffProject('${o.orderId}')">🚀 Kickoff Email</button>
                <button type="button" class="btn-action" onclick="deliverProject('${o.orderId}')">🎉 Delivery Email</button>
                <button type="button" class="btn-action" onclick="sendRenewalReminder('${o.orderId}')">🔔 Renewal Reminder</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 5. AUDIT & EMAIL LOGS
  // ---------------------------------------------------------------------------
  async function loadLogs() {
    const emailTbody = document.getElementById('emailLogsTableBody');
    const auditTbody = document.getElementById('auditLogsTableBody');
    try {
      const res = await fetch('/api/admin/logs', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();

      if (data.emailLogs && data.emailLogs.length) {
        emailTbody.innerHTML = data.emailLogs.map(l => `
          <tr>
            <td style="font-size: 0.8rem; white-space: nowrap;">${l.timestamp ? l.timestamp.replace('T', ' ').slice(0, 19) : ''}</td>
            <td><strong>${escapeHtml(l.recipient)}</strong></td>
            <td><span class="status-pill ${l.emailType.toLowerCase()}">${l.emailType}</span></td>
            <td>${escapeHtml(l.subject)}</td>
            <td><span class="status-pill ${l.status}">${l.status}</span></td>
          </tr>
        `).join('');
      } else {
        emailTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-dim);">No emails logged yet.</td></tr>';
      }

      if (data.auditLogs && data.auditLogs.length) {
        auditTbody.innerHTML = data.auditLogs.map(a => `
          <tr>
            <td style="font-size: 0.8rem; white-space: nowrap;">${a.timestamp ? a.timestamp.replace('T', ' ').slice(0, 19) : ''}</td>
            <td><strong>${a.action}</strong></td>
            <td><span style="color: var(--admin-cyan);">${a.entityId || '—'}</span></td>
            <td>${a.actor || 'system'}</td>
            <td><small style="color: var(--admin-text-dim);">${JSON.stringify(a.details || {})}</small></td>
          </tr>
        `).join('');
      } else {
        auditTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--admin-text-dim);">No audit actions logged.</td></tr>';
      }
    } catch (e) {}
  }

  // ---------------------------------------------------------------------------
  // 6. SETTINGS
  // ---------------------------------------------------------------------------
  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/settings', { headers: { 'x-admin-token': adminToken } });
      const data = await res.json();
      if (data.success && data.config) {
        const c = data.config;
        document.getElementById('cfgCompanyName').value = c.companyName || '';
        document.getElementById('cfgEmail').value = c.email || '';
        document.getElementById('cfgPhone').value = c.phone || '';
        document.getElementById('cfgAddress').value = c.address || '';

        const tax = c.tax || {};
        document.getElementById('cfgTaxEnabled').checked = Boolean(tax.enabled);
        document.getElementById('cfgTaxName').value = tax.name || 'GST';
        document.getElementById('cfgTaxRate').value = tax.ratePercent || 18;
        document.getElementById('cfgGstin').value = tax.gstin || '';

        const pay = c.paymentInstructions || {};
        document.getElementById('cfgUpiId').value = pay.upiId || '';
        document.getElementById('cfgBankName').value = pay.bankName || '';
        document.getElementById('cfgAccountNum').value = pay.accountNumber || '';
        document.getElementById('cfgIfsc').value = pay.ifscCode || '';
      }
    } catch (e) {}
  }

  function initSettings() {
    const form = document.getElementById('settingsForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        companyName: document.getElementById('cfgCompanyName').value.trim(),
        email: document.getElementById('cfgEmail').value.trim(),
        phone: document.getElementById('cfgPhone').value.trim(),
        whatsapp: document.getElementById('cfgPhone').value.trim(),
        address: document.getElementById('cfgAddress').value.trim(),
        tax: {
          enabled: document.getElementById('cfgTaxEnabled').checked,
          name: document.getElementById('cfgTaxName').value.trim(),
          ratePercent: parseFloat(document.getElementById('cfgTaxRate').value) || 18,
          gstin: document.getElementById('cfgGstin').value.trim()
        },
        paymentInstructions: {
          upiId: document.getElementById('cfgUpiId').value.trim(),
          bankName: document.getElementById('cfgBankName').value.trim(),
          accountNumber: document.getElementById('cfgAccountNum').value.trim(),
          ifscCode: document.getElementById('cfgIfsc').value.trim()
        }
      };

      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && window.showCapeDialog) {
          window.showCapeDialog({
            type: 'success',
            title: 'Settings Saved',
            message: 'Company configuration and billing parameters updated successfully.',
            confirmText: 'OK'
          });
        }
      } catch (err) {
        alert('Failed to save settings.');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // MODALS & ACTIONS
  // ---------------------------------------------------------------------------
  function initModals() {
    // Quotation Form Submit
    const qForm = document.getElementById('formCreateQuote');
    if (qForm) {
      qForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderId = document.getElementById('quoteTargetOrderId').value;
        const validUntil = document.getElementById('quoteValidUntil').value;
        const discount = parseFloat(document.getElementById('quoteDiscount').value) || 0;
        const notes = document.getElementById('quoteNotes').value.trim();
        const sendEmail = document.getElementById('quoteSendEmail').checked;

        try {
          const res = await fetch('/api/quotations/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
            body: JSON.stringify({ orderId, validUntil, discount, notes, sendEmail })
          });
          const data = await res.json();
          closeAdminModals();

          if (data.success && window.showCapeDialog) {
            window.showCapeDialog({
              type: 'success',
              title: 'Quotation Generated',
              message: `Quotation ${data.quotation.quotationId} generated successfully with PDF attachment.${sendEmail ? '\nEmail dispatched to client.' : ''}`,
              confirmText: 'OK'
            });
            loadOrders();
            loadQuotations();
            loadMetrics();
          }
        } catch (err) {
          alert('Failed to create quotation: ' + err.message);
        }
      });
    }

    // Payment Form Submit
    const pForm = document.getElementById('formRecordPayment');
    if (pForm) {
      pForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const invoiceId = document.getElementById('payTargetInvoiceId').value;
        const amount = parseFloat(document.getElementById('payAmount').value) || 0;
        const method = document.getElementById('payMethod').value;
        const transactionId = document.getElementById('payTxId').value.trim();
        const paymentDate = document.getElementById('payDate').value;
        const sendReceipt = document.getElementById('paySendReceipt').checked;

        try {
          const res = await fetch(`/api/invoices/${invoiceId}/payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
            body: JSON.stringify({ amount, method, transactionId, paymentDate, sendReceipt })
          });
          const data = await res.json();
          closeAdminModals();

          if (data.success && window.showCapeDialog) {
            window.showCapeDialog({
              type: 'success',
              title: 'Payment Recorded',
              message: `Payment of ₹${amount.toLocaleString('en-IN')} recorded on ${invoiceId}.\nNew Balance Due: ₹${data.invoice.pricing.balance.toLocaleString('en-IN')}`,
              confirmText: 'OK'
            });
            loadInvoices();
            loadMetrics();
          }
        } catch (err) {
          alert('Failed to record payment: ' + err.message);
        }
      });
    }
  }

  window.openQuotationModal = function (orderId) {
    document.getElementById('quoteTargetOrderId').value = orderId;
    document.getElementById('quoteModalOrderId').textContent = orderId;
    const defaultDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    document.getElementById('quoteValidUntil').value = defaultDate;
    document.getElementById('modalQuotation').classList.add('active');
  };

  window.openPaymentModal = function (invoiceId, defaultAmount) {
    document.getElementById('payTargetInvoiceId').value = invoiceId;
    document.getElementById('payModalInvoiceId').textContent = invoiceId;
    document.getElementById('payAmount').value = defaultAmount > 0 ? defaultAmount : '';
    document.getElementById('payDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('payTxId').value = `TXN-${Date.now()}`;
    document.getElementById('modalPayment').classList.add('active');
  };

  window.closeAdminModals = function () {
    document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.remove('active'));
  };

  window.sendQuotationEmail = async function (quotationId) {
    if (!confirm(`Dispatch Quotation Email with PDF attachment for ${quotationId}?`)) return;
    try {
      const res = await fetch(`/api/quotations/${quotationId}/send-email`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Quotation Email Dispatched',
          message: `Official quotation PDF successfully emailed to client.`,
          confirmText: 'OK'
        });
        loadLogs();
      }
    } catch (e) {
      alert('Failed to dispatch email.');
    }
  };

  window.sendInvoiceEmail = async function (invoiceId) {
    if (!confirm(`Dispatch Invoice Email with PDF attachment for ${invoiceId}?`)) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/send-email`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Invoice Email Dispatched',
          message: `Invoice PDF successfully emailed to client.`,
          confirmText: 'OK'
        });
        loadLogs();
      }
    } catch (e) {
      alert('Failed to dispatch email.');
    }
  };

  window.approveAndInvoice = async function (quotationId) {
    if (!confirm(`Approve Quotation ${quotationId} and auto-generate Tax Invoice?`)) return;
    try {
      const res = await fetch(`/api/quotations/${quotationId}/approve`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Quotation Approved & Invoice Generated',
          message: `Quotation approved!\nGenerated Invoice: ${data.invoice.invoiceId}\nInvoice PDF automatically attached and queued.`,
          confirmText: 'OK'
        });
        loadQuotations();
        loadInvoices();
        loadMetrics();
      }
    } catch (e) {
      alert('Failed to approve quotation.');
    }
  };

  window.kickoffProject = async function (orderId) {
    if (!confirm(`Send Project Kickoff Email for Order ${orderId}?`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/kickoff`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Project Kickoff Dispatched',
          message: `Project status set to DEVELOPMENT.\nKickoff instructions and checklist emailed to client.`,
          confirmText: 'OK'
        });
        loadOrders();
        loadProjects();
      }
    } catch (e) {}
  };

  window.deliverProject = async function (orderId) {
    const liveUrl = prompt('Enter live website URL for client delivery:', 'https://capesecure.vercel.app');
    if (!liveUrl) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({ liveUrl })
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Project Delivery Dispatched',
          message: `Project marked as DELIVERED.\nFinal handover notification emailed to client.`,
          confirmText: 'OK'
        });
        loadOrders();
        loadProjects();
      }
    } catch (e) {}
  };

  window.sendRenewalReminder = async function (orderId) {
    if (!confirm(`Send Annual Maintenance / Renewal Reminder for Order ${orderId}?`)) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/renewal`, {
        method: 'POST',
        headers: { 'x-admin-token': adminToken }
      });
      const data = await res.json();
      if (data.success && window.showCapeDialog) {
        window.showCapeDialog({
          type: 'success',
          title: 'Renewal Reminder Sent',
          message: `Renewal reminder email dispatched to client.`,
          confirmText: 'OK'
        });
        loadLogs();
      }
    } catch (e) {}
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
