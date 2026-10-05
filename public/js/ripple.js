/**
 * Cape Secure Solutions — Interactive Element Micro-Disturbance
 * Adds subtle harmonic ripple feedback when moving across key brand & navigation elements.
 */

(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let hoverThrottle = 0;
  const interactiveSelector = '.service-card, .project-card, .sea-stream-card, .btn, .nav-brand';

  document.addEventListener('mousemove', (e) => {
    if (!window.capeWaterInstance || !window.capeWaterInstance.rippleManager) return;
    const target = e.target.closest(interactiveSelector);
    if (target) {
      const now = Date.now();
      if (now - hoverThrottle > 180) {
        hoverThrottle = now;
        window.capeWaterInstance.rippleManager.add(e.clientX, e.clientY, 0.20, 1.0, 120);
      }
    }
  }, { passive: true });
})();
