/**
 * CapeSecure - Ambient Atmosphere & Interactive Experience System
 * 1. Soft atmospheric particles (ocean droplets, celestial light points, network nodes)
 * 2. Minimal non-intrusive desktop cursor glow
 * 3. Hero layered mouse parallax (desktop only, max 8px)
 * 4. Minimal fast page loader (<800ms)
 * Respects: prefers-reduced-motion & touch-device constraints
 */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

  // =========================================================================
  // 1. MINIMAL PAGE LOADER
  // =========================================================================
  function initPageLoader() {
    const loader = document.getElementById("capeLoader");
    if (!loader) return;

    const hideLoader = () => {
      if (loader.classList.contains("loaded")) return;
      loader.classList.add("loaded");
      setTimeout(() => {
        loader.style.display = "none";
      }, 500);
    };

    // If document is already complete, dismiss quickly
    if (document.readyState === "complete") {
      setTimeout(hideLoader, 350);
    } else {
      window.addEventListener("load", () => setTimeout(hideLoader, 400));
      // Safety fallback: maximum 900ms duration
      setTimeout(hideLoader, 900);
    }
  }

  // =========================================================================
  // 2. ATMOSPHERIC PARTICLES SYSTEM (Canvas based, 20-30 max desktop, 6-8 mobile)
  // =========================================================================
  function initAmbientParticles() {
    if (prefersReducedMotion) return;

    const canvas = document.getElementById("ambientCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 8 : 28; // Strict compliance with 20-40 desktop, 5-10 mobile

    const particles = [];
    const colors = [
      "rgba(0, 229, 255, ",    // Cyber cyan
      "rgba(0, 143, 196, ",    // Ocean blue
      "rgba(245, 158, 50, ",   // Warm sunset gold
      "rgba(255, 212, 119, "   // Soft golden light
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.8 + 0.8, // 0.8px to 2.6px
        speedX: (Math.random() - 0.48) * 0.35, // Slow horizontal drift
        speedY: -(Math.random() * 0.45 + 0.15), // Slow upward rise (droplet / node)
        colorBase: colors[Math.floor(Math.random() * colors.length)],
        baseAlpha: Math.random() * 0.45 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        type: i % 4 === 0 ? "node" : "droplet"
      });
    }

    let animationId = null;
    let lastTime = performance.now();

    function renderParticles(now) {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle connecting lines between close network nodes (desktop only)
      if (!isMobile) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i];
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 110) {
              const lineAlpha = (1 - dist / 110) * 0.12;
              ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
              ctx.lineWidth = 0.75;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      }

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.speedX * (delta * 60);
        p.y += p.speedY * (delta * 60);
        p.pulsePhase += p.pulseSpeed;

        // Wrap around screen boundaries
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        const currentAlpha = p.baseAlpha * (0.7 + Math.sin(p.pulsePhase) * 0.3);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorBase}${currentAlpha})`;
        ctx.fill();

        // Soft outer glow for light points
        if (p.radius > 1.4 && !isMobile) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${p.colorBase}${currentAlpha * 0.25})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(renderParticles);
    }

    animationId = requestAnimationFrame(renderParticles);

    // Responsive Canvas Resize
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 200);
    }, { passive: true });

    // Pause animation when tab is inactive to preserve CPU / battery
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        lastTime = performance.now();
        animationId = requestAnimationFrame(renderParticles);
      }
    });
  }

  // =========================================================================
  // 3. DESKTOP CUSTOM CURSOR GLOW (Non-intrusive cyan/gold point, desktop only)
  // =========================================================================
  function initCustomCursor() {
    if (prefersReducedMotion || isTouchDevice) return;

    let cursorPoint = document.getElementById("cursorPoint");
    let cursorGlow = document.getElementById("cursorGlow");

    if (!cursorPoint || !cursorGlow) {
      cursorPoint = document.createElement("div");
      cursorPoint.id = "cursorPoint";
      cursorPoint.className = "custom-cursor-point";
      cursorPoint.setAttribute("aria-hidden", "true");

      cursorGlow = document.createElement("div");
      cursorGlow.id = "cursorGlow";
      cursorGlow.className = "custom-cursor-glow";
      cursorGlow.setAttribute("aria-hidden", "true");

      document.body.appendChild(cursorPoint);
      document.body.appendChild(cursorGlow);
    }

    let mouseX = -100;
    let mouseY = -100;
    let glowX = -100;
    let glowY = -100;
    let isVisible = false;

    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        cursorPoint.style.opacity = "1";
        cursorGlow.style.opacity = "1";
      }
      cursorPoint.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }, { passive: true });

    document.addEventListener("mouseleave", () => {
      isVisible = false;
      cursorPoint.style.opacity = "0";
      cursorGlow.style.opacity = "0";
    });

    // Smooth lerp follow for soft glow
    function animateCursor() {
      if (isVisible) {
        glowX += (mouseX - glowX) * 0.18;
        glowY += (mouseY - glowY) * 0.18;
        cursorGlow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0)`;
      }
      requestAnimationFrame(animateCursor);
    }

    requestAnimationFrame(animateCursor);

    // Interactive element hover states
    const interactiveSelectors = "a, button, input, select, textarea, .custom-checkbox-card, .service-card, .project-card, .faq-trigger";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactiveSelectors)) {
        cursorGlow.classList.add("cursor-hover");
        cursorPoint.classList.add("cursor-hover");
      }
    });

    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactiveSelectors)) {
        cursorGlow.classList.remove("cursor-hover");
        cursorPoint.classList.remove("cursor-hover");
      }
    });
  }

  // =========================================================================
  // 4. HERO MOUSE PARALLAX (Desktop only, max 8px movement as requested)
  // =========================================================================
  function initHeroParallax() {
    if (prefersReducedMotion || isTouchDevice) return;

    const hero = document.getElementById("hero");
    if (!hero) return;

    const cloudLayer = hero.querySelector(".hero-parallax-clouds");
    const oceanLayer = hero.querySelector(".hero-parallax-ocean");
    const techLayer = hero.querySelector(".hero-parallax-tech");
    const landmarkLayer = hero.querySelector(".hero-parallax-landmarks");

    if (!cloudLayer && !oceanLayer && !techLayer && !landmarkLayer) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    hero.addEventListener("mousemove", (e) => {
      const rect = hero.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
      const relY = (e.clientY - rect.top) / rect.height - 0.5;

      // Maximum 8px amplitude
      targetX = relX * 16;
      targetY = relY * 12;
    }, { passive: true });

    hero.addEventListener("mouseleave", () => {
      targetX = 0;
      targetY = 0;
    });

    function updateParallax() {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (cloudLayer) {
        cloudLayer.style.transform = `translate3d(${currentX * 0.25}px, ${currentY * 0.2}px, 0)`;
      }
      if (landmarkLayer) {
        landmarkLayer.style.transform = `translate3d(${currentX * 0.4}px, ${currentY * 0.3}px, 0)`;
      }
      if (oceanLayer) {
        oceanLayer.style.transform = `translate3d(${currentX * 0.55}px, ${currentY * 0.35}px, 0)`;
      }
      if (techLayer) {
        techLayer.style.transform = `translate3d(${currentX * 0.75}px, ${currentY * 0.5}px, 0)`;
      }

      requestAnimationFrame(updateParallax);
    }

    requestAnimationFrame(updateParallax);
  }

  // Initialize all after DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    initPageLoader();
    initAmbientParticles();
    initCustomCursor();
    initHeroParallax();
  });
})();
