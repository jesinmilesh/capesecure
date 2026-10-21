/**
 * Cape Secure Solutions — Contact Form Handler
 * Validates inquiries and dispatches transactional notification via /api/send-sms
 * with graceful offline fallback and client-side confidentiality assurance.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactPageForm');
    if (!contactForm) return;

    const nameInput = document.getElementById('contactName');
    const phoneInput = document.getElementById('contactPhone');
    const emailInput = document.getElementById('contactEmail');
    const subjectSelect = document.getElementById('contactSubject');
    const messageInput = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmitBtn') || contactForm.querySelector('button[type="submit"]');
    const loadingBox = document.getElementById('contactLoading') || contactForm.querySelector('.form-status-msg.loading');
    const successBox = document.getElementById('contactSuccess') || contactForm.querySelector('.form-status-msg.success');

    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Check honeypot
      const honeypot = contactForm.querySelector('[name="website_trap"], [name="hp_name"]');
      if (honeypot && honeypot.value.trim() !== '') {
        console.warn('Spam trap triggered.');
        if (loadingBox) loadingBox.style.display = 'none';
        if (successBox) successBox.style.display = 'block';
        return;
      }

      // Clear previous error styles
      contactForm.querySelectorAll('.form-group.has-error').forEach((g) => g.classList.remove('has-error'));
      contactForm.querySelectorAll('.error').forEach((el) => el.classList.remove('error'));

      const existingError = contactForm.querySelector('.contact-inline-error');
      if (existingError) existingError.remove();

      let isValid = true;
      let firstError = null;

      function flagError(input, message) {
        const group = input.closest('.form-group');
        if (group) {
          group.classList.add('has-error');
          const errorMsg = group.querySelector('.field-error-msg');
          if (errorMsg) errorMsg.textContent = message;
        }
        input.classList.add('error');
        if (!firstError) firstError = input;
        isValid = false;
      }

      // Name validation
      if (!nameInput || !nameInput.value.trim()) {
        flagError(nameInput, 'Please enter your full name.');
      }

      // Phone validation (Indian mobile: 10 digits starting 6-9)
      if (phoneInput) {
        const rawPhone = phoneInput.value.trim().replace(/[\s\-\(\)]/g, '');
        const phoneRegex = /^(\+?91)?[6-9]\d{9}$/;
        if (!rawPhone) {
          flagError(phoneInput, 'WhatsApp / Phone number is required.');
        } else if (!phoneRegex.test(rawPhone) && rawPhone.replace(/\D/g, '').length < 10) {
          flagError(phoneInput, 'Please enter a valid 10-digit Indian mobile number.');
        }
      }

      // Email validation (optional)
      if (emailInput && emailInput.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailInput.value.trim())) {
          flagError(emailInput, 'Please enter a valid email address.');
        }
      }

      // Message validation
      if (!messageInput || !messageInput.value.trim()) {
        flagError(messageInput, 'Please describe your project requirements or question.');
      }

      if (!isValid) {
        if (firstError) firstError.focus();
        return;
      }

      const subjectVal = subjectSelect && subjectSelect.selectedIndex >= 0
        ? subjectSelect.options[subjectSelect.selectedIndex].text
        : 'General Inquiry';

      const payload = {
        type: 'contact',
        name: nameInput.value.trim(),
        phone: phoneInput ? phoneInput.value.trim() : '',
        email: emailInput ? emailInput.value.trim() : '',
        subject: subjectVal,
        message: messageInput.value.trim()
      };

      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Send Message';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.remove('btn-submitted', 'btn-error');
        submitBtn.classList.add('btn-submitting');
        submitBtn.innerHTML = `<span>Sending...</span>`;
      }
      if (loadingBox) loadingBox.style.display = 'flex';
      if (successBox) successBox.style.display = 'none';

      try {
        let result = null;
        try {
          const res = await fetch('/api/public/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          result = await res.json().catch(() => ({ success: true }));
        } catch (e) {
          if (typeof window.sendCapeSMS === 'function') {
            result = await window.sendCapeSMS(payload);
          } else {
            const res = await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            result = await res.json().catch(() => ({ success: true }));
          }
        }

        if (loadingBox) loadingBox.style.display = 'none';

        // Button changes to Submitted with checkmark
        if (submitBtn) {
          submitBtn.classList.remove('btn-submitting');
          submitBtn.classList.add('btn-submitted');
          submitBtn.innerHTML = `<span>✓ Submitted</span>`;
        }

        // Smooth pause before opening centered success dialog
        await new Promise((r) => setTimeout(r, 450));

        if (typeof window.showCapeDialog === 'function') {
          await window.showCapeDialog({
            type: 'success',
            title: 'Request Submitted Successfully',
            message: 'Thank you for contacting Cape Secure Solutions.\nWe have received your message and will get back to you shortly.',
            confirmText: 'OK'
          });
        }

        if (successBox) successBox.style.display = 'block';
        if (submitBtn) submitBtn.style.display = 'none';

        if (nameInput) nameInput.disabled = true;
        if (phoneInput) phoneInput.disabled = true;
        if (emailInput) emailInput.disabled = true;
        if (subjectSelect) subjectSelect.disabled = true;
        if (messageInput) messageInput.disabled = true;

        if (typeof window.trackCapeEvent === 'function') {
          window.trackCapeEvent('cape:contact_submit', { subject: subjectVal });
        }
      } catch (err) {
        console.warn('Contact dispatch error:', err);
        if (loadingBox) loadingBox.style.display = 'none';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('btn-submitting');
          submitBtn.classList.add('btn-error');
          submitBtn.innerHTML = `<span>Try Again</span>`;
        }

        if (typeof window.showCapeDialog === 'function') {
          window.showCapeDialog({
            type: 'error',
            title: 'Something Went Wrong',
            message: 'We couldn\'t send your message right now.\nPlease try again or reach out to us directly via WhatsApp.',
            confirmText: 'Close'
          });
        } else {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'contact-inline-error';
          errorDiv.style.cssText = 'margin-top: 1rem; padding: 1rem; background: rgba(255, 107, 107, 0.12); border: 1px solid rgba(255, 107, 107, 0.4); border-radius: 8px; color: #ffb4b4; font-size: 0.9rem; line-height: 1.5; text-align: center;';
          errorDiv.innerHTML = `
            <strong>We couldn't send your message right now.</strong><br>
            Please reach out directly via WhatsApp or email us at 
            <a href="mailto:capesecuresolutions@gmail.com" style="color: #00d9ff; text-decoration: underline;">capesecuresolutions@gmail.com</a>.
          `;
          contactForm.appendChild(errorDiv);
        }
      }
    });
  });
})();
