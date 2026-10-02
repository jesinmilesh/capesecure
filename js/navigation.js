/**
 * CapeSecure - Navigation Controller
 * Handles sticky navbar, mobile drawer menu, accessible ARIA states,
 * focus management, and keyboard shortcuts.
 */

document.addEventListener("DOMContentLoaded", () => {
  const navbar = document.querySelector(".navbar");
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navBackdrop = document.querySelector(".nav-backdrop");
  const navLinks = document.querySelectorAll(".nav-link");

  // 1. Sticky Navbar on Scroll
  const handleScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 30) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  };

  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll(); // Initial check

  // 2. Mobile Drawer Open / Close
  const openMenu = () => {
    if (!navMenu || !menuToggle) return;
    menuToggle.classList.add("open");
    menuToggle.setAttribute("aria-expanded", "true");
    navMenu.classList.add("open");
    if (navBackdrop) navBackdrop.classList.add("open");
    document.body.classList.add("menu-locked");

    // Focus first link in mobile menu for accessibility
    const firstLink = navMenu.querySelector("a, button");
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 150);
    }
  };

  const closeMenu = () => {
    if (!navMenu || !menuToggle) return;
    menuToggle.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("open");
    if (navBackdrop) navBackdrop.classList.remove("open");
    document.body.classList.remove("menu-locked");
  };

  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.classList.contains("open");
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  // Close when clicking on backdrop
  if (navBackdrop) {
    navBackdrop.addEventListener("click", closeMenu);
  }

  // Close menu on link click (for one-page anchors or navigation)
  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 992) {
        closeMenu();
      }
    });
  });

  // Close on Escape Key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuToggle && menuToggle.classList.contains("open")) {
      closeMenu();
      menuToggle.focus();
    }
  });

  // 3. Highlight Active Page Link based on current URL path
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href) {
      const linkPath = href.split("/").pop().split("#")[0];
      if (linkPath === currentPath || (currentPath === "" && linkPath === "index.html")) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      }
    }
  });
});
