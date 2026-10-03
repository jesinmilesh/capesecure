/**
 * CapeSecure - Main Orchestrator
 * Injects configuration values, handles WhatsApp links gracefully without fake numbers,
 * initializes modals, copyright, and global UI utilities.
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Inject Config Values into DOM elements with [data-config]
  if (typeof siteConfig !== "undefined") {
    // Dynamic Copyright Year
    const yearEls = document.querySelectorAll("[data-config='year']");
    const currentYear = new Date().getFullYear();
    yearEls.forEach((el) => (el.textContent = currentYear));

    // Developer 1
    const dev1Name = document.querySelectorAll("[data-config='dev1-name']");
    const dev1Role = document.querySelectorAll("[data-config='dev1-role']");
    const dev1Bio = document.querySelectorAll("[data-config='dev1-bio']");
    dev1Name.forEach((el) => (el.textContent = siteConfig.developers.developerOne.name));
    dev1Role.forEach((el) => (el.textContent = siteConfig.developers.developerOne.role));
    dev1Bio.forEach((el) => (el.textContent = siteConfig.developers.developerOne.bio));

    // Developer 2
    const dev2Name = document.querySelectorAll("[data-config='dev2-name']");
    const dev2Role = document.querySelectorAll("[data-config='dev2-role']");
    const dev2Bio = document.querySelectorAll("[data-config='dev2-bio']");
    dev2Name.forEach((el) => (el.textContent = siteConfig.developers.developerTwo.name));
    dev2Role.forEach((el) => (el.textContent = siteConfig.developers.developerTwo.role));
    dev2Bio.forEach((el) => (el.textContent = siteConfig.developers.developerTwo.bio));

    // Contact Elements
    const emailEls = document.querySelectorAll("[data-config='email']");
    emailEls.forEach((el) => {
      el.textContent = siteConfig.email || "hello@capesecure.in";
      if (el.tagName === "A") el.href = `mailto:${siteConfig.email || "hello@capesecure.in"}`;
    });

    const locationEls = document.querySelectorAll("[data-config='location']");
    locationEls.forEach((el) => (el.textContent = siteConfig.location));

    const hoursEls = document.querySelectorAll("[data-config='hours']");
    hoursEls.forEach((el) => (el.textContent = siteConfig.workingHours));

    const responseEls = document.querySelectorAll("[data-config='response-time']");
    responseEls.forEach((el) => (el.textContent = siteConfig.responseTime));
  }

  // 2. WhatsApp Handler (Degrades gracefully if no real number is in config)
  const whatsappTriggers = document.querySelectorAll("[data-whatsapp-btn]");
  whatsappTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const configuredNumber = typeof siteConfig !== "undefined" ? siteConfig.whatsapp.trim() : "";

      if (configuredNumber) {
        // Remove special characters and open official WhatsApp API
        const cleanNumber = configuredNumber.replace(/[\s\+\-()]/g, "");
        const prefillMessage = encodeURIComponent("Hello CapeSecure, I am interested in discussing a website for my business.");
        window.open(`https://wa.me/${cleanNumber}?text=${prefillMessage}`, "_blank", "noopener,noreferrer");
      } else {
        // Graceful fallback modal/toast: explain clearly and offer quote form
        showToast(
          "WhatsApp line is currently in configuration. Please use our instant Free Quote form or email us!",
          "info"
        );
        // If quote modal exists, trigger it
        const quoteModal = document.getElementById("quoteModal");
        if (quoteModal) {
          setTimeout(() => {
            const quoteTrigger = document.querySelector("[data-open-quote]");
            if (quoteTrigger) quoteTrigger.click();
          }, 600);
        }
      }
    });
  });

  // 3. Global Toast Notification System
  function showToast(message, type = "info") {
    let toast = document.querySelector(".toast-notice");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notice";
      toast.setAttribute("role", "alert");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = "";

    // Icon
    const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    iconSvg.setAttribute("viewBox", "0 0 20 20");
    iconSvg.setAttribute("width", "20");
    iconSvg.setAttribute("height", "20");
    iconSvg.setAttribute("fill", "currentColor");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill-rule", "evenodd");
    path.setAttribute(
      "d",
      "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
    );
    iconSvg.appendChild(path);

    const span = document.createElement("span");
    span.textContent = message;

    toast.appendChild(iconSvg);
    toast.appendChild(span);
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
    }, 4500);
  }

  // 4. Brevo Transactional SMS Dispatcher
  function normalizePhoneNumber(phone) {
    if (!phone) return "";
    let digits = String(phone).replace(/\D/g, "");
    if (digits.length === 10) {
      digits = "91" + digits; // Default to India (+91)
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = "91" + digits.slice(1);
    }
    return digits;
  }

  async function sendCapeSMS(data) {
    const normPhone = normalizePhoneNumber(data.phone);
    if (!normPhone || normPhone.length < 10) {
      return { success: false, error: "Invalid recipient phone number" };
    }

    try {
      const res = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          phone: normPhone
        })
      });

      if (res.ok) {
        return await res.json();
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn("Serverless /api/send-sms response:", errJson);
        return { success: false, error: errJson.error || "SMS dispatch notice" };
      }
    } catch (err) {
      console.warn("SMS dispatch request notice:", err);
      return { success: true, offline: true };
    }
  }

  window.capeToast = showToast;
  window.sendCapeSMS = sendCapeSMS;
  window.normalizePhoneNumber = normalizePhoneNumber;
});

