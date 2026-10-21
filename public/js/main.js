/**
 * Cape Secure Solutions - Main Orchestrator
 * Injects configuration values, handles intelligent WhatsApp links,
 * service detail modal (Phase 9 Option A), toast notifications, copyright, and global UI utilities.
 */

const serviceDetailsData = {
  business: {
    id: "business",
    title: "Business Websites",
    category: "Commercial Commerce",
    audience: "Retail shops, boutique showrooms, hardware suppliers, merchants, and local commercial establishments.",
    whatWeProvide: "Clean, branded digital storefronts tailored to put your inventory, catalog, and direct contact options directly into customer hands.",
    benefits: "Expand local discovery across Kanyakumari, capture direct WhatsApp inquiries without commission fees, and project established commercial authority.",
    deliverables: "1-to-5 custom designed responsive pages, product/collection visual showcase, direct WhatsApp ordering triggers, Google Maps location integration, SSL certificate setup, and Google Search indexing.",
    features: [
      "Custom responsive showcase layout for smartphone & desktop browsers",
      "One-tap WhatsApp inquiry button with prefilled item inquiries",
      "Embedded Google Maps business pin with direct turn-by-turn routing",
      "Sub-second load times optimized for local 4G/5G networks",
      "Social preview Open Graph metadata for WhatsApp & Facebook sharing"
    ]
  },
  healthcare: {
    id: "healthcare",
    title: "Healthcare Websites",
    category: "Clinical & Medical",
    audience: "Polyclinics, specialist doctors, dental clinics, diagnostic laboratories, and physiotherapists.",
    whatWeProvide: "Instill patient trust and simplify consultations with an accessible, dignified clinical portal and online booking intake workflow.",
    benefits: "Reduce front-desk telephone bottlenecks, provide clear visiting hours and specialist credentials, and ensure emergency contact numbers are accessible in one tap.",
    deliverables: "Clinical departments directory, doctor credentials profiles, online consultation slot request intake, emergency hotline banner, privacy-conscious contact endpoint, and medical clinic schema markup.",
    features: [
      "Intuitive online appointment and consultation request scheduler",
      "Doctor specialty cards, clinical degrees, and consulting timings",
      "Emergency tap-to-call hotlines prominent on all mobile viewports",
      "Strict confidentiality safeguards with sanitized form submissions",
      "Schema.org MedicalBusiness metadata for local healthcare search"
    ]
  },
  education: {
    id: "education",
    title: "Education Websites",
    category: "Academic & Institutional",
    audience: "Private schools, junior colleges, coaching institutes, tuition centers, and academies.",
    whatWeProvide: "Authoritative, inspiring digital gateways that streamline admissions, showcase achievements, and keep parents informed.",
    benefits: "Boost seasonal admissions inquiries, eliminate paper prospectus waste, and organize complex course curricula into an intuitive online experience.",
    deliverables: "Admissions lead capture system, downloadable digital prospectus, academic calendar, campus facility gallery, faculty directory, and notice board.",
    features: [
      "Admissions inquiry capture system with instant developer alert",
      "Comprehensive course & curriculum directory with subject guides",
      "Downloadable PDF prospectus and academic calendar integration",
      "Campus events, examination notices, and announcements board",
      "Accessible WCAG-compliant typography and high-contrast styling"
    ]
  },
  restaurant: {
    id: "restaurant",
    title: "Restaurant Websites",
    category: "Dining & Hospitality",
    audience: "Fine dining restaurants, coastal seafood bistros, cafes, family eateries, and cloud kitchens.",
    whatWeProvide: "Appetizing digital menus with interactive dietary categories, table reservation requests, and direct WhatsApp booking.",
    benefits: "Eliminate expensive printed menu reprint costs, allow instant menu updates, speed up table reservations, and turn online searchers into dining patrons.",
    deliverables: "Contactless QR mobile menu viewer, table booking request workflow with guest count, high-resolution food photography gallery, location map, and WhatsApp concierge.",
    features: [
      "Mobile QR digital interactive menu with dietary tags (Veg / Non-Veg / Seafood)",
      "Online table reservation booking system with party size selection",
      "Operating hours, chef specials, and private party booking inquiries",
      "One-click WhatsApp concierge and Google Maps routing link",
      "Local SEO restaurant schema for high Google Maps ranking"
    ]
  },
  portfolio: {
    id: "portfolio",
    title: "Portfolio Websites",
    category: "Personal Brand & Creative",
    audience: "Consultants, advocates, architects, engineers, photographers, and independent professionals.",
    whatWeProvide: "High-impact personal branding websites that establish credibility, demonstrate past achievements, and simplify consulting inquiries.",
    benefits: "Command higher consulting rates, build unshakeable professional authority, and provide high-value prospects with a frictionless intake path.",
    deliverables: "Case study galleries, credentials and discipline overview, contact consultation scheduler, downloadable CV/deck, and social profile integrations.",
    features: [
      "Curated case study showcases with problem-solution breakdowns",
      "Professional credentials, core disciplines, and certifications deck",
      "Direct client inquiry intake form with calendar scheduling ready",
      "Optimized for personal brand Google Search name ranking",
      "Fluid dark aesthetics tailored for creative and executive credibility"
    ]
  },
  custom: {
    id: "custom",
    title: "Custom Web Applications",
    category: "Bespoke Digital Solutions",
    audience: "Growing businesses, institutions, and service companies needing bespoke operational workflows without recurring monthly SaaS fees.",
    whatWeProvide: "Tailored operational web applications: administrative control panels, booking engines, member management portals, and data visualization tools.",
    benefits: "Eliminate expensive monthly SaaS subscription costs, automate manual paperwork, and run on bespoke software engineered specifically for your exact business process.",
    deliverables: "Custom database schema, modular frontend componentry, secure admin dashboards, automated transactional dispatches, role validation, and full deployment.",
    features: [
      "Custom responsive dashboards with interactive SVG data visualizations",
      "Secure client appointment and operations lifecycle management",
      "Role-based simulated admin controls and sanitized input endpoints",
      "Third-party API and SMS/Email transactional notification integration",
      "Security-hardened HTTPS architecture with zero software bloat"
    ]
  }
};

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
    const dev1NameVal = (siteConfig.developers?.developerOne?.name || "Jesin Milesh M").trim();
    dev1Name.forEach((el) => (el.textContent = dev1NameVal));
    const dev1RoleVal = (siteConfig.developers?.developerOne?.role || "Founder & Developer").trim();
    dev1Role.forEach((el) => (el.textContent = dev1RoleVal));
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
    const dev2NameVal = (siteConfig.developers?.developerTwo?.name || "Libinesh R U").trim();
    dev2Name.forEach((el) => (el.textContent = dev2NameVal));
    const dev2RoleVal = (siteConfig.developers?.developerTwo?.role || "Co-Founder / Business & Development").trim();
    dev2Role.forEach((el) => (el.textContent = dev2RoleVal));
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
      el.textContent = siteConfig.email || "capesecuresolutions@gmail.com";
      if (el.tagName === "A") el.href = `mailto:${siteConfig.email || "capesecuresolutions@gmail.com"}`;
    });

    const locationEls = document.querySelectorAll("[data-config='location']");
    locationEls.forEach((el) => (el.textContent = siteConfig.location || "Kanyakumari, Tamil Nadu, India"));

    const mapsLinks = document.querySelectorAll("[data-config='maps-link']");
    mapsLinks.forEach((el) => {
      if (el.tagName === "A" && siteConfig.mapsUrl) {
        el.href = siteConfig.mapsUrl;
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });

    const hoursEls = document.querySelectorAll("[data-config='hours']");
    hoursEls.forEach((el) => (el.textContent = siteConfig.workingHours || "Monday – Saturday: 9:00 AM – 7:00 PM IST"));

    const responseEls = document.querySelectorAll("[data-config='response-time']");
    responseEls.forEach((el) => (el.textContent = siteConfig.responseTime || "Typically within 2 to 4 business hours"));
  }

  // 2. Intelligent WhatsApp Handler (Phase 15 Compliant)
  const whatsappTriggers = document.querySelectorAll("[data-whatsapp-btn]");
  whatsappTriggers.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const configuredNumber = typeof siteConfig !== "undefined" ? siteConfig.whatsapp.trim() : "";
      const requestedService = btn.getAttribute("data-whatsapp-service") || "";

      let prefillMessage = "Hello Cape Secure Solutions, I would like to discuss a website project.";
      if (requestedService) {
        prefillMessage = `Hello Cape Secure Solutions, I am interested in a ${requestedService} website.`;
      }

      if (typeof window.trackCapeEvent === "function") {
        window.trackCapeEvent("cape:whatsapp_click", { service: requestedService });
      }

      if (configuredNumber) {
        const cleanNumber = configuredNumber.replace(/[\s\+\-()]/g, "");
        window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(prefillMessage)}`, "_blank", "noopener,noreferrer");
      } else {
        // Graceful fallback: prompt and open the quote modal or contact
        if (typeof window.openQuoteModal === "function") {
          const category = btn.getAttribute("data-quote-category");
          window.openQuoteModal(null, category);
        } else {
          window.location.href = "contact.html";
        }
      }
    });
  });

  // 3. Service Detail Modal Handler (Phase 9 Option A)
  const serviceDetailModal = document.getElementById("serviceDetailModal");
  let lastFocusedServiceTrigger = null;

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-service-detail]");
    if (trigger && serviceDetailModal) {
      e.preventDefault();
      lastFocusedServiceTrigger = trigger;
      const serviceKey = trigger.getAttribute("data-service-detail");
      openServiceDetail(serviceKey);
    }
  });

  function openServiceDetail(serviceKey) {
    if (!serviceDetailModal) return;
    const service = serviceDetailsData[serviceKey];
    if (!service) return;

    if (typeof window.trackCapeEvent === "function") {
      window.trackCapeEvent("cape:service_view", { serviceId: service.id });
    }

    const titleEl = serviceDetailModal.querySelector(".service-modal-title");
    const categoryEl = serviceDetailModal.querySelector(".service-modal-category");
    const descEl = serviceDetailModal.querySelector(".service-modal-desc");
    const audienceEl = serviceDetailModal.querySelector(".service-modal-audience");
    const benefitsEl = serviceDetailModal.querySelector(".service-modal-benefits");
    const featuresList = serviceDetailModal.querySelector(".service-modal-features");
    const deliverablesEl = serviceDetailModal.querySelector(".service-modal-deliverables");
    const quoteBtn = serviceDetailModal.querySelector(".service-quote-cta");

    if (titleEl) titleEl.textContent = service.title;
    if (categoryEl) categoryEl.textContent = service.category;
    if (descEl) descEl.textContent = service.whatWeProvide;
    if (audienceEl) audienceEl.textContent = service.audience;
    if (benefitsEl) benefitsEl.textContent = service.benefits;
    if (deliverablesEl) deliverablesEl.textContent = service.deliverables;

    if (featuresList) {
      featuresList.textContent = "";
      service.features.forEach((feat) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path>
          </svg>
          <span>${feat}</span>
        `;
        featuresList.appendChild(li);
      });
    }

    if (quoteBtn) {
      quoteBtn.setAttribute("data-quote-category", service.id);
      quoteBtn.onclick = (e) => {
        e.preventDefault();
        closeServiceDetail();
        setTimeout(() => {
          if (typeof window.openQuoteModal === "function") {
            window.openQuoteModal(null, service.id);
          } else {
            window.location.href = `quote.html?category=${encodeURIComponent(service.id)}`;
          }
        }, 150);
      };
    }

    serviceDetailModal.classList.add("open");
    serviceDetailModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-locked");

    const closeBtn = serviceDetailModal.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.focus();
  }

  function closeServiceDetail() {
    if (!serviceDetailModal) return;
    serviceDetailModal.classList.remove("open");
    serviceDetailModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-locked");

    if (lastFocusedServiceTrigger) {
      try { lastFocusedServiceTrigger.focus(); } catch (e) {}
    }
  }

  window.openServiceDetail = openServiceDetail;
  window.closeServiceDetail = closeServiceDetail;

  if (serviceDetailModal) {
    const closeBtns = serviceDetailModal.querySelectorAll(".modal-close-btn, .btn-modal-close");
    closeBtns.forEach((btn) => btn.addEventListener("click", closeServiceDetail));

    serviceDetailModal.addEventListener("click", (e) => {
      if (e.target === serviceDetailModal) closeServiceDetail();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && serviceDetailModal.classList.contains("open")) {
        closeServiceDetail();
      }
    });
  }
});
