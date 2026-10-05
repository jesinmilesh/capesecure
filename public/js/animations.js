/**
 * Cape Secure Solutions - Animations & Scroll Reveal Controller
 * Uses IntersectionObserver for performant scroll-triggered animations.
 * Ensures all content is immediately and reliably visible.
 */

document.addEventListener("DOMContentLoaded", () => {
  const revealElements = document.querySelectorAll(".reveal");

  // Immediate visibility safeguard: content is always visible
  const markRevealed = (el) => {
    el.classList.add("revealed");
    el.classList.add("reveal-visible");
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach(markRevealed);
    return;
  }

  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -40px 0px",
    threshold: 0.08
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        markRevealed(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealElements.forEach((el) => {
    // If element is already in viewport or near top, reveal immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 50) {
      markRevealed(el);
    } else {
      revealObserver.observe(el);
    }
  });

  // Fallback safety timer: ensure everything is revealed within 500ms
  setTimeout(() => {
    revealElements.forEach(markRevealed);
  }, 500);
});
