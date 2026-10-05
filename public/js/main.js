/**
 * Cape Secure Solutions - Main Orchestrator
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
    const dev1Linkedin = document.querySelectorAll("[data-config='dev1-linkedin']");
    const dev1Portfolio = document.querySelectorAll("[data-config='dev1-portfolio']");
    const dev1NameVal = (siteConfig.developers?.developerOne?.name || "").trim();
    if (dev1NameVal && !dev1NameVal.startsWith("[")) {
      dev1Name.forEach((el) => (el.textContent = dev1NameVal));
    } else {
      dev1Name.forEach((el) => (el.textContent = "Jesin Milesh M"));
    }
    const dev1RoleVal = (siteConfig.developers?.developerOne?.role || "").trim();
    if (dev1RoleVal) dev1Role.forEach((el) => (el.textContent = dev1RoleVal));
    const dev1BioVal = (siteConfig.developers?.developerOne?.bio || "").trim();
    if (dev1BioVal) dev1Bio.forEach((el) => (el.textContent = dev1BioVal));
    dev1Linkedin.forEach((el) => {
      const url = siteConfig.developers?.developerOne?.linkedin || "https://www.linkedin.com/in/jesin-milesh-m-7981bb347/";
      if (el.tagName === "A") el.href = url;
    });
    dev1Portfolio.forEach((el) => {
      const url = siteConfig.developers?.developerOne?.portfolio || "work.html";
      if (el.tagName === "A") el.href = url;
    });

    // Developer 2
    const dev2Name = document.querySelectorAll("[data-config='dev2-name']");
    const dev2Role = document.querySelectorAll("[data-config='dev2-role']");
    const dev2Bio = document.querySelectorAll("[data-config='dev2-bio']");
    const dev2Linkedin = document.querySelectorAll("[data-config='dev2-linkedin']");
    const dev2Portfolio = document.querySelectorAll("[data-config='dev2-portfolio']");
    const dev2NameVal = (siteConfig.developers?.developerTwo?.name || "").trim();
    if (dev2NameVal && !dev2NameVal.startsWith("[")) {
      dev2Name.forEach((el) => (el.textContent = dev2NameVal));
    } else {
      dev2Name.forEach((el) => (el.textContent = "Libinesh R U"));
    }
    const dev2RoleVal = (siteConfig.developers?.developerTwo?.role || "").trim();
    if (dev2RoleVal) dev2Role.forEach((el) => (el.textContent = dev2RoleVal));
    const dev2BioVal = (siteConfig.developers?.developerTwo?.bio || "").trim();
    if (dev2BioVal) dev2Bio.forEach((el) => (el.textContent = dev2BioVal));
    dev2Linkedin.forEach((el) => {
      const url = siteConfig.developers?.developerTwo?.linkedin || "https://www.linkedin.com/in/libinesh-r-u-59496a370";
      if (el.tagName === "A") el.href = url;
    });
    dev2Portfolio.forEach((el) => {
      const url = siteConfig.developers?.developerTwo?.portfolio || "work.html";
      if (el.tagName === "A") el.href = url;
    });

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
        const cleanNumber = configuredNumber.replace(/[\s\+\-()]/g, "");
        const prefillMessage = encodeURIComponent("Hello Cape Secure Solutions, I am interested in discussing a website for my business.");
        window.open(`https://wa.me/${cleanNumber}?text=${prefillMessage}`, "_blank", "noopener,noreferrer");
      } else {
        const quoteModal = document.getElementById("quoteModal");
        if (quoteModal) {
          const openQuoteModalFunc = window.openQuoteModal;
          if (typeof openQuoteModalFunc === "function") {
            openQuoteModalFunc();
          } else {
            quoteModal.classList.add("open");
            quoteModal.setAttribute("aria-hidden", "false");
            document.body.classList.add("modal-locked");
          }
        } else {
          window.location.href = "contact.html";
        }
      }
    });
  });
});
