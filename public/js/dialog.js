/**
 * Cape Secure Solutions — Centralized Centered Dialog System
 * Replaces browser alerts with accessible, glassmorphic modal notifications.
 *
 * Features:
 * - Centered viewport positioning with backdrop blur
 * - 3 semantic types: 'success', 'error', 'info'
 * - Accessible keyboard trapping & Escape key dismissal
 * - Smooth scale & fade animations (reduced-motion compliant)
 * - Auto-injected DOM container: no manual HTML markup required
 */

(function () {
  'use strict';

  let dialogContainer = null;
  let activeResolve = null;
  let previousActiveElement = null;

  function ensureDialogDOM() {
    if (dialogContainer) return dialogContainer;

    let existing = document.getElementById('capeDialogOverlay');
    if (existing) {
      dialogContainer = existing;
      return dialogContainer;
    }

    const overlay = document.createElement('div');
    overlay.id = 'capeDialogOverlay';
    overlay.className = 'cape-dialog-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-labelledby', 'capeDialogTitle');
    overlay.setAttribute('aria-describedby', 'capeDialogDesc');

    overlay.innerHTML = `
      <div class="cape-dialog-card" id="capeDialogCard">
        <button type="button" class="cape-dialog-close" id="capeDialogCloseBtn" aria-label="Close dialog">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div class="cape-dialog-icon-wrapper" id="capeDialogIconWrap">
          <!-- Injected dynamically -->
        </div>

        <h3 class="cape-dialog-title" id="capeDialogTitle"></h3>
        <p class="cape-dialog-desc" id="capeDialogDesc"></p>

        <div class="cape-dialog-actions" id="capeDialogActions">
          <button type="button" class="btn btn-secondary cape-dialog-cancel-btn" id="capeDialogCancelBtn" style="display: none;">Cancel</button>
          <button type="button" class="btn btn-primary cape-dialog-confirm-btn" id="capeDialogConfirmBtn">OK</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    dialogContainer = overlay;

    // Event listeners
    const closeBtn = overlay.querySelector('#capeDialogCloseBtn');
    const confirmBtn = overlay.querySelector('#capeDialogConfirmBtn');
    const cancelBtn = overlay.querySelector('#capeDialogCancelBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => closeDialog(false));
    if (confirmBtn) confirmBtn.addEventListener('click', () => closeDialog(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeDialog(false));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dialogContainer && dialogContainer.classList.contains('active')) {
        closeDialog(false);
      }
      if (e.key === 'Tab' && dialogContainer && dialogContainer.classList.contains('active')) {
        trapFocus(e);
      }
    });

    return dialogContainer;
  }

  function trapFocus(e) {
    if (!dialogContainer) return;
    const focusable = dialogContainer.querySelectorAll('button:not([disabled]), [tabindex="0"]');
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function getIconMarkup(type) {
    switch (type) {
      case 'success':
        return `
          <div class="cape-dialog-badge success">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        `;
      case 'error':
        return `
          <div class="cape-dialog-badge error">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
        `;
      case 'info':
      default:
        return `
          <div class="cape-dialog-badge info">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
        `;
    }
  }

  function showCapeDialog(options = {}) {
    return new Promise((resolve) => {
      ensureDialogDOM();
      activeResolve = resolve;
      previousActiveElement = document.activeElement;

      const {
        type = 'info', // 'success' | 'error' | 'info'
        title = type === 'success' ? 'Request Submitted' : type === 'error' ? 'Notice' : 'Information',
        message = '',
        confirmText = 'OK',
        showCancel = false,
        cancelText = 'Cancel',
        onConfirm = null
      } = options;

      const card = dialogContainer.querySelector('#capeDialogCard');
      const iconWrap = dialogContainer.querySelector('#capeDialogIconWrap');
      const titleEl = dialogContainer.querySelector('#capeDialogTitle');
      const descEl = dialogContainer.querySelector('#capeDialogDesc');
      const confirmBtn = dialogContainer.querySelector('#capeDialogConfirmBtn');
      const cancelBtn = dialogContainer.querySelector('#capeDialogCancelBtn');

      if (card) {
        card.className = `cape-dialog-card type-${type}`;
      }
      if (iconWrap) {
        iconWrap.innerHTML = getIconMarkup(type);
      }
      if (titleEl) {
        titleEl.textContent = title;
      }
      if (descEl) {
        descEl.innerHTML = typeof message === 'string' ? message.replace(/\n/g, '<br>') : '';
      }
      if (confirmBtn) {
        confirmBtn.textContent = confirmText;
      }
      if (cancelBtn) {
        cancelBtn.style.display = showCancel ? 'inline-flex' : 'none';
        cancelBtn.textContent = cancelText;
      }

      dialogContainer.classList.add('active');
      dialogContainer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('menu-locked');

      setTimeout(() => {
        if (confirmBtn) confirmBtn.focus();
      }, 100);
    });
  }

  function closeDialog(confirmed) {
    if (!dialogContainer || !dialogContainer.classList.contains('active')) return;

    dialogContainer.classList.remove('active');
    dialogContainer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-locked');

    if (activeResolve) {
      activeResolve(confirmed);
      activeResolve = null;
    }

    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch (e) {}
    }
  }

  // Expose globally
  window.showCapeDialog = showCapeDialog;
  window.closeCapeDialog = closeDialog;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureDialogDOM);
  } else {
    ensureDialogDOM();
  }
})();
