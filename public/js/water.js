/**
 * Cape Secure Solutions — Calm Ocean Living Water & Ripple System
 * 
 * Modular Technical Architecture:
 * ├── BackgroundRenderer (Slow, majestic tri-sea ambient swells & subtle sunrise caustic glow)
 * ├── RippleManager (Concentric water ripples with dual cyan/gold harmonics & smooth decay)
 * ├── MouseInteraction (Smooth trailing wake tracking; standard pointer preserved)
 * ├── TouchInteraction (Throttled passive touch ripples; zero scroll interference)
 * └── PerformanceController (60 FPS loop, auto-throttling, visibility pause, reduced-motion compliance)
 * 
 * Hierarchy:
 * Layer 1: Kanyakumari photo / monument landscape (untouched & crisp)
 * Layer 2: Dark navy gradient & atmospheric overlay
 * Layer 3: This transparent living water canvas (subtle swells & interaction)
 * Layer 4: Content (cards, headings, buttons)
 * Layer 5: Glass/dark navy navigation
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CapeWaterEffect = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 1. Ripple Manager (Handles wave propagation and natural dissipation)
  class RippleManager {
    constructor(maxRipples = 22) {
      this.maxRipples = maxRipples;
      this.ripples = [];
      for (let i = 0; i < this.maxRipples; i++) {
        this.ripples.push({
          x: 0,
          y: 0,
          radius: 0,
          maxRadius: 180,
          strength: 0,
          speed: 1.1,
          decay: 0.985,
          active: false
        });
      }
    }

    add(x, y, strength = 0.35, speed = 1.2, maxRadius = 200) {
      let r = this.ripples.find(item => !item.active);
      if (!r) {
        // Recycle the weakest ripple
        r = this.ripples.reduce((min, item) => (item.strength < min.strength ? item : min), this.ripples[0]);
      }

      r.x = x;
      r.y = y;
      r.radius = 3;
      r.maxRadius = maxRadius;
      r.strength = Math.min(0.65, strength);
      r.speed = speed;
      r.decay = 0.986;
      r.active = true;
    }

    update() {
      let activeCount = 0;
      for (let i = 0; i < this.maxRipples; i++) {
        const r = this.ripples[i];
        if (r.active) {
          r.radius += r.speed;
          r.strength *= r.decay;

          if (r.strength < 0.006 || r.radius >= r.maxRadius) {
            r.active = false;
            r.strength = 0;
          } else {
            activeCount++;
          }
        }
      }
      return activeCount;
    }

    draw(ctx) {
      for (let i = 0; i < this.maxRipples; i++) {
        const r = this.ripples[i];
        if (!r.active) continue;

        const rad = r.radius;
        const str = r.strength;
        const progress = rad / r.maxRadius;
        const alpha = str * (1 - progress * 0.7);

        ctx.save();
        ctx.beginPath();
        ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);

        // Primary outer oceanic cyan refraction
        ctx.strokeStyle = `rgba(0, 217, 255, ${Math.max(0, alpha * 0.42)})`;
        ctx.lineWidth = Math.max(1, 2.2 * (1 - progress));
        ctx.shadowColor = 'rgba(0, 217, 255, 0.4)';
        ctx.shadowBlur = 6;
        ctx.stroke();

        // Secondary subtle inner sunrise gold reflection
        if (rad > 16) {
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad * 0.76, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 185, 66, ${Math.max(0, alpha * 0.22)})`;
          ctx.lineWidth = 1;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }

        ctx.restore();
      }
    }
  }

  // 2. Main WaterEffect Controller
  class WaterEffect {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: true });
      this.rippleManager = new RippleManager(22);
      this.isRunning = false;
      this.time = 0;
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      // Mouse & Pointer disturbance tracking
      this.mouse = {
        x: this.width * 0.5,
        y: this.height * 0.5,
        targetX: this.width * 0.5,
        targetY: this.height * 0.5,
        lastX: 0,
        lastY: 0,
        lastTime: performance.now()
      };

      this.moveThrottle = 0;
      this.touchThrottle = 0;

      this.init();
    }

    init() {
      // Respect accessibility reduced-motion preference
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        this.resize();
        this.ctx.clearRect(0, 0, this.width, this.height);
        return;
      }

      this.resize();
      this.setupEventListeners();
      this.isRunning = true;
      this.render = this.render.bind(this);
      requestAnimationFrame(this.render);
    }

    setupEventListeners() {
      // Debounced window resize
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this.resize(), 120);
      }, { passive: true });

      // Tab visibility conservation
      document.addEventListener('visibilitychange', () => {
        this.isRunning = !document.hidden;
        if (this.isRunning) requestAnimationFrame(this.render);
      });

      // Mouse Move: Gentle trailing wake disturbance (Standard cursor untouched)
      window.addEventListener('mousemove', (e) => {
        const now = performance.now();
        const dt = Math.max(1, now - this.mouse.lastTime);
        const dx = e.clientX - this.mouse.lastX;
        const dy = e.clientY - this.mouse.lastY;
        const speed = Math.hypot(dx, dy) / dt;

        this.mouse.lastX = e.clientX;
        this.mouse.lastY = e.clientY;
        this.mouse.lastTime = now;

        this.mouse.targetX = e.clientX;
        this.mouse.targetY = e.clientY;

        const nowMs = Date.now();
        // Emits a gentle wake ripple on smooth motion
        if (speed > 0.16 && nowMs - this.moveThrottle > 100) {
          this.moveThrottle = nowMs;
          const strength = Math.min(0.32, 0.10 + speed * 0.07);
          this.rippleManager.add(e.clientX, e.clientY, strength, 1.0, 130);
        }
      }, { passive: true });

      // Click / Tap: Soft expanding water pulse
      window.addEventListener('click', (e) => {
        // Do not interrupt form inputs or interactive controls
        if (e.target.closest('input, textarea, select, button, a')) return;
        this.rippleManager.add(e.clientX, e.clientY, 0.48, 1.3, 230);
      }, { passive: true });

      // Mobile Touch Interaction: Passive & non-blocking
      window.addEventListener('touchstart', (e) => {
        if (!e.touches.length) return;
        const touch = e.touches[0];
        this.rippleManager.add(touch.clientX, touch.clientY, 0.38, 1.2, 170);
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (!e.touches.length) return;
        const nowMs = Date.now();
        if (nowMs - this.touchThrottle < 120) return;
        this.touchThrottle = nowMs;

        const touch = e.touches[0];
        this.rippleManager.add(touch.clientX, touch.clientY, 0.24, 1.0, 120);
      }, { passive: true });
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    }

    render(now) {
      if (!this.isRunning) return;

      // Ultra-slow, serene ocean time scale (Calm Kanyakumari morning)
      this.time = now * 0.00035;

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      // Smooth mouse interpolation
      this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.06;
      this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.06;

      // Clear transparently so background photo / vignette is completely crisp
      ctx.clearRect(0, 0, w, h);

      // 1. Draw calm ambient swells (Three Seas: Arabian Sea, Indian Ocean, Bay of Bengal)
      this.drawAmbientWaves(ctx, w, h);

      // 2. Subtle Kanyakumari sunrise caustic shimmer
      this.drawCausticShimmer(ctx, w, h);

      // 3. Update & render interactive ripples
      this.rippleManager.update();
      this.rippleManager.draw(ctx);

      requestAnimationFrame(this.render);
    }

    drawAmbientWaves(ctx, w, h) {
      const t = this.time;
      ctx.save();

      // Three harmonious waves in lower horizon representing the three seas
      const layers = [
        { baseY: h * 0.68, amp: 9, freq: 0.0014, speed: 0.6, color: 'rgba(0, 119, 182, 0.07)' },
        { baseY: h * 0.80, amp: 12, freq: 0.0020, speed: -0.4, color: 'rgba(0, 217, 255, 0.05)' },
        { baseY: h * 0.92, amp: 14, freq: 0.0012, speed: 0.5, color: 'rgba(245, 185, 66, 0.03)' }
      ];

      for (let i = 0; i < layers.length; i++) {
        const l = layers[i];
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 18) {
          const y = l.baseY + Math.sin(x * l.freq + t * l.speed) * l.amp + Math.cos(x * l.freq * 0.7 - t * l.speed * 0.5) * (l.amp * 0.4);
          if (x === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = l.color;
        ctx.fill();
      }

      ctx.restore();
    }

    drawCausticShimmer(ctx, w, h) {
      const t = this.time;
      const sunX = w * 0.5 + Math.sin(t * 0.3) * (w * 0.06);
      const sunY = h * 0.20 + Math.cos(t * 0.2) * (h * 0.03);

      const radial = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, w * 0.55);
      radial.addColorStop(0, 'rgba(0, 217, 255, 0.045)');
      radial.addColorStop(0.5, 'rgba(245, 185, 66, 0.025)');
      radial.addColorStop(1, 'transparent');

      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Auto-mount on DOM ready if waterCanvas exists
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('waterCanvas');
      if (canvas && !window.capeWaterInstance) {
        window.capeWaterInstance = new WaterEffect(canvas);
      }
    });
  }

  return WaterEffect;
});
