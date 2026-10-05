/**
 * CapeSecure — Ocean Canvas Environment
 * Layered dynamic waves representing the convergence of the Indian Ocean,
 * Arabian Sea, and Bay of Bengal with sunset golden highlights and subtle cyber particles.
 */

(function () {
  'use strict';

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const canvas = document.getElementById('oceanCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Resize handler
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, 150);
  });

  // Mouse disturbance tracking
  let mouse = { x: width / 2, y: height / 2, vx: 0, vy: 0, targetX: width / 2 };
  window.addEventListener('mousemove', (e) => {
    mouse.targetX = e.clientX;
  }, { passive: true });

  // Floating Cyber Particles
  const PARTICLE_COUNT = Math.min(35, Math.floor(width / 40));
  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -Math.random() * 0.6 - 0.2,
      opacity: Math.random() * 0.5 + 0.2,
      color: Math.random() > 0.3 ? '#00D9FF' : '#FFB52E'
    });
  }

  // Wave configurations (representing Indian Ocean, Arabian Sea, Bay of Bengal)
  const waves = [
    {
      baseY: 0.68,
      amplitude: 22,
      wavelength: 0.0035,
      speed: 0.015,
      color: 'rgba(0, 102, 255, 0.18)',
      foam: 'rgba(255, 255, 255, 0.15)',
      shimmer: 'rgba(255, 181, 46, 0.12)'
    },
    {
      baseY: 0.74,
      amplitude: 28,
      wavelength: 0.0042,
      speed: 0.022,
      color: 'rgba(0, 80, 204, 0.22)',
      foam: 'rgba(0, 217, 255, 0.2)',
      shimmer: 'rgba(255, 122, 24, 0.1)'
    },
    {
      baseY: 0.81,
      amplitude: 34,
      wavelength: 0.0028,
      speed: -0.018,
      color: 'rgba(3, 17, 31, 0.38)',
      foam: 'rgba(255, 255, 255, 0.25)',
      shimmer: 'rgba(0, 217, 255, 0.15)'
    },
    {
      baseY: 0.88,
      amplitude: 40,
      wavelength: 0.0032,
      speed: 0.025,
      color: 'rgba(2, 12, 23, 0.55)',
      foam: 'rgba(0, 217, 255, 0.28)',
      shimmer: 'rgba(255, 181, 46, 0.18)'
    }
  ];

  let time = 0;
  let isRunning = true;

  // Pause when page is hidden
  document.addEventListener('visibilitychange', () => {
    isRunning = !document.hidden;
    if (isRunning) requestAnimationFrame(render);
  });

  function render() {
    if (!isRunning) return;

    time += 0.02;
    mouse.x += (mouse.targetX - mouse.x) * 0.05;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Subtle Light Rays from Sunset
    const gradientSun = ctx.createRadialGradient(
      width * 0.5, height * 0.35, 10,
      width * 0.5, height * 0.35, width * 0.4
    );
    gradientSun.addColorStop(0, 'rgba(255, 181, 46, 0.08)');
    gradientSun.addColorStop(0.5, 'rgba(255, 122, 24, 0.03)');
    gradientSun.addColorStop(1, 'transparent');
    ctx.fillStyle = gradientSun;
    ctx.fillRect(0, 0, width, height);

    // 2. Render Ocean Wave Layers
    waves.forEach((wave, idx) => {
      ctx.beginPath();
      const waveY = height * wave.baseY;
      ctx.moveTo(0, height);
      ctx.lineTo(0, waveY);

      // Draw wave curve
      for (let x = 0; x <= width; x += 6) {
        // Distance from mouse to disturb wave
        const distFromMouse = Math.abs(x - mouse.x);
        const mouseInfluence = Math.max(0, 1 - distFromMouse / 220) * 14;

        const sin1 = Math.sin(x * wave.wavelength + time * wave.speed * 60);
        const sin2 = Math.cos(x * wave.wavelength * 0.6 - time * wave.speed * 40);
        const y = waveY + (sin1 + sin2 * 0.5) * wave.amplitude + (idx % 2 === 0 ? mouseInfluence : -mouseInfluence);

        ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height);
      ctx.closePath();

      ctx.fillStyle = wave.color;
      ctx.fill();

      // Golden horizon shimmer & cyan foam on wave crest
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = (idx % 2 === 0) ? wave.foam : wave.shimmer;
      ctx.stroke();
    });

    // 3. Render Floating Cyber/Atmospheric Particles
    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y < 0) {
        p.y = height;
        p.x = Math.random() * width;
      }
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
