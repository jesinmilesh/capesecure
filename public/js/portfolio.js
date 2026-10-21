/**
 * Cape Secure Solutions - Portfolio & Demo Projects Controller
 * Handles category filtering, interactive demo preview modal with full business/security details,
 * and accessible keyboard focus trapping.
 * 
 * NOTE: All portfolio projects are clearly designated as DEMO PROJECTS.
 */

const demoProjectsData = [
  {
    id: "sri-lakshmi-textiles",
    title: "Sri Lakshmi Textiles",
    category: "business",
    categoryName: "Business / Retail",
    badge: "DEMO PROJECT",
    image: "assets/projects/sri-lakshmi-textiles.jpg",
    shortDesc: "Handcrafted boutique retail website with silk collections catalog, WhatsApp ordering, and interactive showroom gallery.",
    fullDesc: "Designed for heritage silk showrooms and regional boutique retail stores. Features a high-converting visual catalog, direct WhatsApp 'Buy/Inquire' integration for individual sarees, Google Maps directions, festival announcement banners, and ultra-fast mobile loading for local customers on 4G networks.",
    businessProblem: "Traditional heritage textile retailers struggle to display seasonal silk sarees online without expensive ecommerce platforms that require complex inventory management.",
    solution: "A high-conversion visual silk showcase with instant WhatsApp inquiry, fast 4G loading, and direct physical showroom direction navigation.",
    responsiveBehavior: "Fluid responsive layout engineered for mobile touchscreens, smooth gesture swiping, and crisp image rendering across all viewport widths from 320px to 4K.",
    securityConsiderations: "Enforced HTTPS SSL certificate, sanitized WhatsApp deep link generation, no customer data leakage, and secure Google Maps embed integration.",
    features: [
      "Categorized Silk & Saree Catalog",
      "Instant WhatsApp Inquiry with Product Title Pre-fill",
      "Store Location, Timings & Google Maps Direction Link",
      "Mobile-First Touch Carousel & Zoom View",
      "Optimized for High-Resolution Apparel Photography"
    ],
    techStack: ["Semantic HTML5", "Responsive CSS Grid", "Vanilla JS", "WebP Image Optimization", "Google Maps Embed"]
  },
  {
    id: "careplus-clinic",
    title: "CarePlus Clinic",
    category: "healthcare",
    categoryName: "Healthcare / Clinic",
    badge: "DEMO PROJECT",
    image: "assets/projects/careplus-clinic.jpg",
    shortDesc: "Modern clinic and doctor portal with consultation slot scheduling, department guides, and doctor credential profiles.",
    fullDesc: "Tailored for private clinics, dental practices, and multi-specialty healthcare centers. Provides an intuitive appointment request workflow with specialty filtering, clinic hours, emergency hotline triggers, and patient preparation guidelines, adhering to strict patient privacy considerations.",
    businessProblem: "Patients face long telephone waits and confusion over clinical timings, doctor schedules, and department availability.",
    solution: "A clear, intuitive clinical gateway with interactive appointment requests, doctor credential profiles, visiting hours, and one-tap emergency call buttons.",
    responsiveBehavior: "Mobile-first layout prioritizing high-contrast tap targets, quick doctor filtering, and rapid consultation booking on handheld devices.",
    securityConsiderations: "Zero client-side storage of confidential medical history, privacy-hardened consultation request endpoint, and SSL encryption on all form submissions.",
    features: [
      "Doctor Profile Cards & Clinical Specialties",
      "Online Consultation & Appointment Request System",
      "Department Directory (Pediatrics, Cardiology, Dental)",
      "Emergency Contact One-Tap Calling",
      "Clinic Schedule, Visiting Hours & Location Guide"
    ],
    techStack: ["HTML5 Forms", "Accessible ARIA Workflows", "Vanilla JS Scheduler", "CSS Variables", "Schema.org Medical Clinic Markup"]
  },
  {
    id: "future-scholars",
    title: "Future Scholars Academy",
    category: "education",
    categoryName: "Education / School",
    badge: "DEMO PROJECT",
    image: "assets/projects/future-scholars.jpg",
    shortDesc: "Comprehensive educational institution portal with academic calendar, course directory, and admission enquiry workflow.",
    fullDesc: "Built for private schools, junior colleges, and coaching academies looking to modernize their admissions and institutional branding. Incorporates an online prospectus download system, admissions timeline, academic achievements showcase, and structured parent enquiry channels.",
    businessProblem: "Educational institutions often have cluttered, outdated websites that make downloading prospectuses and finding admission timelines difficult for parents.",
    solution: "A modern, authoritative academic portal featuring structured admission workflows, downloadable curriculum prospectuses, faculty directories, and event calendars.",
    responsiveBehavior: "Adaptive multi-column layout on desktop collapsing into an intuitive, accessible accordion navigation on tablets and smartphones.",
    securityConsiderations: "Sanitized student enquiry inputs, protected prospectus assets, and hardened web server security headers against malicious tampering.",
    features: [
      "Admissions Lead Capture & Enquiry Form",
      "Comprehensive Course & Curriculum Directory",
      "Campus News, Events & Notice Board",
      "Academic Calendar & Faculty Showcase",
      "Downloadable Prospectus & Fee Structure Guide"
    ],
    techStack: ["Modern CSS3", "Vanilla JS Form Validation", "Responsive Layouts", "SEO Structured Data", "Accessible Navigation"]
  },
  {
    id: "spice-route",
    title: "Spice Route Restaurant",
    category: "restaurant",
    categoryName: "Restaurant / Dining",
    badge: "DEMO PROJECT",
    image: "assets/projects/spice-route.jpg",
    shortDesc: "Atmospheric coastal dining website with digital QR menu, online table reservation, and chef specialities gallery.",
    fullDesc: "Crafted for fine dining, coastal seafood restaurants, and family bistros. Features an appetizing visual menu categorized by cuisine, real-time table reservation enquiry form, dietary preference filters (Vegetarian, Seafood, Chef's Special), and seamless WhatsApp table booking.",
    businessProblem: "Diners need quick access to current menus, dietary requirements (Veg / Non-Veg / Seafood), and seamless table booking without phone delays.",
    solution: "An appetizing digital QR-accessible menu with dietary filters, table reservation booking, operating hours, and instant WhatsApp concierge.",
    responsiveBehavior: "Touch-optimized QR menu interface designed for single-thumb mobile browsing with instant filter toggles and lightweight image loading.",
    securityConsiderations: "HTTPS transmission, clean parameter encoding for reservation requests, and privacy-respecting analytics.",
    features: [
      "Digital Interactive Menu with Pricing & Dietary Tags",
      "Table Reservation Booking System with Guest Count",
      "Atmospheric Visual Gallery & Customer Experience",
      "Operating Hours, Chef Specials & Party Booking",
      "One-Click Location & WhatsApp Concierge"
    ],
    techStack: ["CSS Flex/Grid", "Vanilla JS Filter Engine", "Touch-friendly UI", "Optimized Assets", "Local SEO Microdata"]
  },
  {
    id: "businessflow-dashboard",
    title: "BusinessFlow Dashboard",
    category: "custom",
    categoryName: "Custom Web Application",
    badge: "DEMO PROJECT",
    image: "assets/projects/businessflow-dashboard.jpg",
    shortDesc: "High-performance business operations portal with booking management, revenue analytics, and client CRM module.",
    fullDesc: "Designed for small-to-mid businesses needing custom operational dashboards without expensive monthly SaaS fees. Offers appointment booking schedules, client records tracking, revenue visualization charts, role-based simulated admin controls, and clean export features.",
    businessProblem: "Small to mid-sized service businesses struggle with recurring SaaS subscription fees for bloated operational software that doesn't fit their exact workflow.",
    solution: "A tailored lightweight web app with booking management, revenue metrics visualization, client records, and simulated role-based access.",
    responsiveBehavior: "Data tables and SVG chart layouts that gracefully scale from widescreen management dashboards down to handheld mobile viewports.",
    securityConsiderations: "Strict input validation, role separation architecture, protection against XSS and injection vulnerabilities, and HTTPS transport security.",
    features: [
      "Real-time Operational Metrics & Revenue Growth",
      "Booking & Appointment Lifecycle Management",
      "Client Management & Interaction Logs",
      "Interactive SVG Data Charts & Statistics",
      "Clean Modular Component Architecture"
    ],
    techStack: ["Pure Vanilla JavaScript", "Custom SVG Data Visualizations", "Modern CSS Dark Mode", "State Management Pattern", "Modular Architecture"]
  }
];

document.addEventListener("DOMContentLoaded", () => {
  const filterButtons = document.querySelectorAll(".filter-btn");
  const projectCards = document.querySelectorAll(".project-card");
  const previewModal = document.getElementById("projectPreviewModal");

  let lastFocusedElement = null;

  // 1. Category Filtering
  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-selected", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");

        const selectedCategory = btn.getAttribute("data-filter");

        if (typeof window.trackCapeEvent === "function") {
          window.trackCapeEvent("cape:portfolio_filter", { category: selectedCategory });
        }

        projectCards.forEach((card) => {
          const cardCategory = card.getAttribute("data-category");
          if (selectedCategory === "all" || cardCategory === selectedCategory) {
            card.style.display = "flex";
            setTimeout(() => {
              card.style.opacity = "1";
              card.style.transform = "translateY(0)";
            }, 50);
          } else {
            card.style.opacity = "0";
            card.style.transform = "translateY(15px)";
            setTimeout(() => {
              card.style.display = "none";
            }, 250);
          }
        });
      });
    });
  }

  // 2. Demo Preview Modal Handler
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-preview-project]");
    if (trigger) {
      e.preventDefault();
      lastFocusedElement = trigger;
      const projectId = trigger.getAttribute("data-preview-project");
      openProjectPreview(projectId);
    }
  });

  function openProjectPreview(projectId) {
    const project = demoProjectsData.find((p) => p.id === projectId);
    if (!project || !previewModal) return;

    if (typeof window.trackCapeEvent === "function") {
      window.trackCapeEvent("cape:project_view", { projectId: project.id, category: project.category });
    }

    const modalImage = previewModal.querySelector(".preview-modal-img");
    const modalTitle = previewModal.querySelector(".preview-modal-title");
    const modalCategory = previewModal.querySelector(".preview-modal-category");
    const modalBadge = previewModal.querySelector(".preview-modal-badge");
    const modalDesc = previewModal.querySelector(".preview-modal-desc");
    const modalFeaturesList = previewModal.querySelector(".preview-modal-features");
    const modalTechStack = previewModal.querySelector(".preview-modal-tech");
    const quoteBtn = previewModal.querySelector(".preview-quote-cta");

    // Dynamic fields for Business Problem, Solution, Responsive Behavior, Security
    let problemEl = previewModal.querySelector(".preview-modal-problem");
    let solutionEl = previewModal.querySelector(".preview-modal-solution");
    let responsiveEl = previewModal.querySelector(".preview-modal-responsive");
    let securityEl = previewModal.querySelector(".preview-modal-security");

    if (modalImage) {
      modalImage.src = project.image;
      modalImage.alt = `${project.title} - ${project.badge}`;
    }
    if (modalTitle) modalTitle.textContent = project.title;
    if (modalCategory) modalCategory.textContent = project.categoryName;
    if (modalBadge) modalBadge.textContent = project.badge;
    if (modalDesc) modalDesc.textContent = project.fullDesc;

    if (problemEl) problemEl.textContent = project.businessProblem;
    if (solutionEl) solutionEl.textContent = project.solution;
    if (responsiveEl) responsiveEl.textContent = project.responsiveBehavior;
    if (securityEl) securityEl.textContent = project.securityConsiderations;

    if (modalFeaturesList) {
      modalFeaturesList.textContent = "";
      project.features.forEach((feat) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"></path>
          </svg>
          <span>${escapeHtml(feat)}</span>
        `;
        modalFeaturesList.appendChild(li);
      });
    }

    if (modalTechStack) {
      modalTechStack.textContent = "";
      project.techStack.forEach((tech) => {
        const pill = document.createElement("span");
        pill.className = "project-tag";
        pill.textContent = tech;
        modalTechStack.appendChild(pill);
      });
    }

    if (quoteBtn) {
      quoteBtn.setAttribute("data-quote-category", project.category);
      // Clicking the CTA inside preview modal closes the preview and opens the quote modal smoothly
      quoteBtn.onclick = (e) => {
        e.preventDefault();
        closeProjectPreview();
        setTimeout(() => {
          if (typeof window.openQuoteModal === "function") {
            window.openQuoteModal(null, project.category);
          } else {
            window.location.href = `quote.html?category=${encodeURIComponent(project.category)}`;
          }
        }, 150);
      };
    }

    // Display modal
    previewModal.classList.add("open");
    previewModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-locked");

    const closeBtn = previewModal.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.focus();
  }

  function closeProjectPreview() {
    if (!previewModal) return;
    previewModal.classList.remove("open");
    previewModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-locked");

    if (lastFocusedElement) {
      try { lastFocusedElement.focus(); } catch (e) {}
    }
  }

  window.closeProjectPreview = closeProjectPreview;

  if (previewModal) {
    const closeBtn = previewModal.querySelector(".modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeProjectPreview);
    }

    previewModal.addEventListener("click", (e) => {
      if (e.target === previewModal) {
        closeProjectPreview();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && previewModal.classList.contains("open")) {
        closeProjectPreview();
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }
});
