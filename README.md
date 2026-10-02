# CapeSecure — Official Business Website

> **Websites • Security • Digital Solutions**  
> Two-person freelance web-development & digital-solutions agency based out of Kanyakumari.

---

## 🌊 Visual & Brand Identity

CapeSecure merges **Kanyakumari coastal heritage** with **modern cyber-security web engineering**:
- **Palette**: Deep navy foundations (`#06111c`), vivid cyan ocean accents (`#00d9ff`, `#0787ff`), and warm Kanyakumari sunset gold (`#f6b73c`).
- **Brand Imagery**: Inspired by the Kanyakumari horizon where the Indian Ocean, Arabian Sea, and Bay of Bengal converge, with the Thiruvalluvar monument and maritime lighthouse motifs.
- **Tech Philosophy**: Zero unnecessary framework dependencies. Pure, blazing-fast HTML5, CSS3, and Vanilla JavaScript with sub-second page loads and security-conscious standards.

---

## 📁 Project Architecture

```
/
├── index.html              # High-converting homepage with all 11 core sections
├── services.html           # In-depth breakdown for all 6 specialized business services
├── work.html               # Demo portfolio with category filters & interactive preview modal
├── pricing.html            # Transparent starting pricing, comparison matrix & add-ons
├── about.html              # Two-developer team story, Kanyakumari coastal identity & ethos
├── contact.html            # Direct developer contact channels, location & direct message form
├── quote.html              # Dedicated full-page interactive quote builder
├── 404.html                # Branded custom 404 error page
├── vercel.json             # Vercel configuration (clean URLs, caching, security headers)
│
├── .github/
│   └── workflows/
│       └── ci-cd.yml       # GitHub Actions CI/CD pipeline (syntax validation & deploy)
│
├── css/
│   ├── style.css           # Design tokens, CSS variables, glass cards, buttons & layout
│   ├── responsive.css      # Mobile-first breakpoints (320px, 375px, 480px, 768px, 1024px, 1440px+)
│   └── animations.css      # Wave motion, shield glow, slow compass & prefers-reduced-motion
│
├── js/
│   ├── config.js           # Central configuration for developer names, WhatsApp, email, pricing
│   ├── main.js             # Global orchestrator, toast notices & dynamic DOM config binding
│   ├── navigation.js       # Sticky navbar, mobile drawer menu & keyboard accessibility
│   ├── portfolio.js        # Demo projects filter engine & interactive preview modal
│   ├── quote.js            # Client-side quote calculator, validation & backend integration hook
│   ├── faq.js              # Accessible accordion with keyboard navigation (Enter/Space/Arrows)
│   └── animations.js       # Performant IntersectionObserver scroll reveals
│
├── assets/
│   ├── logo/
│   │   ├── cape-secure-logo.png  # Primary brand logo
│   │   ├── favicon.png           # Brand favicon asset
│   │   └── favicon.svg           # High-resolution vector favicon
│   ├── images/
│   │   └── kanyakumari-heritage.jpg # Cape sunset horizon visual
│   └── projects/
│       ├── sri-lakshmi-textiles.jpg # Demo: Retail Boutique Website
│       ├── careplus-clinic.jpg      # Demo: Healthcare Clinic Portal
│       ├── future-scholars.jpg      # Demo: Educational Academy Website
│       ├── spice-route.jpg          # Demo: Coastal Restaurant Portal
│       └── businessflow-dashboard.jpg # Demo: Custom SaaS Dashboard
│
├── robots.txt              # Search engine crawler instructions
├── sitemap.xml             # XML sitemap for SEO discovery
└── README.md               # Maintenance, configuration & deployment guide
```

---

## ⚡ Continuous Deployment with Vercel & CI/CD

This repository is configured for **Continuous Deployment (CI/CD)**:

1. **Automatic Deployments on Git Push**:
   - Any commit pushed to the `main` branch automatically triggers an instant production build and deployment on Vercel.
   - Any pull request generates a preview deployment with an isolated staging URL.

2. **`vercel.json` Optimizations**:
   - `cleanUrls: true`: Routes `/services` cleanly to `services.html`, `/pricing` to `pricing.html`, etc.
   - **Enterprise Security Headers**: Automatic `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
   - **Immutable Asset Caching**: 1-year caching for images and assets (`Cache-Control: public, max-age=31536000, immutable`), and stale-while-revalidate caching for scripts and stylesheets.

3. **GitHub Actions Workflow (`.github/workflows/ci-cd.yml`)**:
   - Runs on every push to `main`.
   - Validates syntax across all JavaScript modules via `node -c`.
   - Verifies the integrity of all HTML documents and static assets before deployment.

---

## ⚙️ Configuration & Customization (`js/config.js`)

All business details, developer names, and contact channels can be edited directly inside `js/config.js` without touching HTML:

```javascript
const siteConfig = {
  companyName: "CapeSecure",
  whatsapp: "+91XXXXXXXXXX",  // Fill with verified business WhatsApp
  email: "hello@capesecure.in",
  phone: "+91 XXXXX XXXXX",
  location: "Kanyakumari, Tamil Nadu, India",
  
  developers: {
    developerOne: {
      name: "Your Name",
      role: "Founder & Developer"
    },
    developerTwo: {
      name: "Partner Name",
      role: "Co-Founder / Business & Development"
    }
  }
};
```

---

## 🚀 Connecting Your Vercel Project

If you haven't linked your repository to Vercel yet:
1. Log in to [vercel.com](https://vercel.com) and click **"Add New Project"**.
2. Select your repository: **`jesinmilesh/capesecure`**.
3. Framework Preset: **Other** (Root directory: `./`).
4. Click **Deploy**.

From then on, whenever you push any change to GitHub, Vercel will automatically redeploy the site in seconds!