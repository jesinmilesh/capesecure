/**
 * CapeSecure - Portfolio & Demo Projects Controller
 * Handles category filtering, interactive demo preview modal, and accessible keyboard controls.
 * NOTE: All portfolio projects are clearly designated as DEMO PROJECTS.
 */

const demoProjectsData = [
  {
    id: "sri-lakshmi-textiles",
    title: "Sri Lakshmi Textiles",
    category: "business",
    categoryName: "Business",
    badge: "DEMO PROJECT",
    image: "assets/projects/sri-lakshmi-textiles.jpg",
    shortDesc: "Handcrafted boutique retail website with silk collections catalog, WhatsApp ordering, and interactive showroom gallery.",
    fullDesc: "Designed for heritage silk showrooms and regional boutique retail stores. Features a high-converting visual catalog, direct WhatsApp 'Buy/Inquire' integration for individual sarees, Google Maps directions, festival announcement banners, and ultra-fast mobile loading for local customers on 4G networks.",
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
    categoryName: "Healthcare",
    badge: "DEMO PROJECT",
    image: "assets/projects/careplus-clinic.jpg",
    shortDesc: "Modern clinic and doctor portal with consultation slot scheduling, department guides, and doctor credential profiles.",
    fullDesc: "Tailored for private clinics, dental practices, and multi-specialty healthcare centers. Provides an intuitive appointment request workflow with specialty filtering, clinic hours, emergency hotline triggers, and patient preparation guidelines, adhering to strict patient privacy considerations.",
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
    categoryName: "Education",
    badge: "DEMO PROJECT",
    image: "assets/projects/future-scholars.jpg",
    shortDesc: "Comprehensive educational institution portal with academic calendar, course directory, and admission enquiry workflow.",
    fullDesc: "Built for private schools, junior colleges, and coaching academies looking to modernize their admissions and institutional branding. Incorporates an online prospectus download system, admissions timeline, academic achievements showcase, and structured parent enquiry channels.",
    features: [
      "Admissions 2026-27 Lead Capture & Enquiry Form",
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
    categoryName: "Restaurant",
    badge: "DEMO PROJECT",
    image: "assets/projects/spice-route.jpg",
    shortDesc: "Atmospheric coastal dining website with digital QR menu, online table reservation, and chef specialities gallery.",
    fullDesc: "Crafted for fine dining, coastal seafood restaurants, and family bistros. Features an appetizing visual menu categorized by cuisine, real-time table reservation enquiry form, dietary preference filters (Vegetarian, Seafood, Chef's Special), and seamless WhatsApp table booking.",
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
    categoryName: "Custom Web App",
    badge: "DEMO PROJECT",
    image: "assets/projects/businessflow-dashboard.jpg",
    shortDesc: "High-performance business operations portal with booking management, revenue analytics, and client CRM module.",
    fullDesc: "Designed for small-to-mid businesses needing custom operational dashboards without expensive monthly SaaS fees. Offers appointment booking schedules, client records tracking, revenue visualization charts, role-based simulated admin controls, and clean export features.",
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

  // 1. Category Filtering
  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const selectedCategory = btn.getAttribute("data-filter");

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
      const projectId = trigger.getAttribute("data-preview-project");
      openProjectPreview(projectId);
    }
  });

  function openProjectPreview(projectId) {
    const project = demoProjectsData.find((p) => p.id === projectId);
    if (!project || !previewModal) return;

    // Populate modal elements safely using textContent and DOM APIs
    const modalImage = previewModal.querySelector(".preview-modal-img");
    const modalTitle = previewModal.querySelector(".preview-modal-title");
    const modalCategory = previewModal.querySelector(".preview-modal-category");
    const modalBadge = previewModal.querySelector(".preview-modal-badge");
    const modalDesc = previewModal.querySelector(".preview-modal-desc");
    const modalFeaturesList = previewModal.querySelector(".preview-modal-features");
    const modalTechStack = previewModal.querySelector(".preview-modal-tech");
    const quoteBtn = previewModal.querySelector(".preview-quote-cta");

    if (modalImage) {
      modalImage.src = project.image;
      modalImage.alt = `${project.title} - ${project.badge}`;
    }
    if (modalTitle) modalTitle.textContent = project.title;
    if (modalCategory) modalCategory.textContent = project.categoryName;
    if (modalBadge) modalBadge.textContent = project.badge;
    if (modalDesc) modalDesc.textContent = project.fullDesc;

    if (modalFeaturesList) {
      modalFeaturesList.textContent = ""; // Clear existing
      project.features.forEach((feat) => {
        const li = document.createElement("li");
        const iconSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        iconSvg.setAttribute("viewBox", "0 0 20 20");
        iconSvg.setAttribute("width", "16");
        iconSvg.setAttribute("height", "16");
        iconSvg.setAttribute("fill", "currentColor");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill-rule", "evenodd");
        path.setAttribute("d", "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z");
        iconSvg.appendChild(path);

        const span = document.createElement("span");
        span.textContent = feat;

        li.appendChild(iconSvg);
        li.appendChild(span);
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
    }

    // Display modal
    previewModal.classList.add("open");
    previewModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("menu-locked");

    const closeBtn = previewModal.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.focus();
  }

  // Close preview modal
  if (previewModal) {
    const closeBtn = previewModal.querySelector(".modal-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeProjectPreview());
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

  function closeProjectPreview() {
    if (!previewModal) return;
    previewModal.classList.remove("open");
    previewModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-locked");
  }
});
