/**
 * CapeSecure - Global Configuration
 * All business details, developer profiles, and contact channels can be edited here.
 * No real private contact information or API keys are stored in this client-side configuration.
 */

const siteConfig = {
    companyName: "Cape Secure Solutions",
    brandName: "Cape Secure Solutions",
    tagline: "Where three seas meet, security begins.",
    motto: "Born at the edge of three seas. Built to protect your digital horizon.",
    establishedYear: "2026",

    // Contact Information (Configurable Placeholders)
    // NOTE: Keep empty or update with verified business channels.
    // If empty, buttons degrade gracefully with helpful prompts.
    whatsapp: "", // e.g. "+919876543210" or "919876543210"
    whatsappDisplay: "+91 (Available on Request)",
    email: "capesecuresolutions@gmail.com", // e.g. "contact@capesecure.in"
    phone: "", // e.g. "+91 98765 43210"
    phoneDisplay: "+91 (Direct Developer Line)",
    location: "Kanyakumari, Tamil Nadu, India",
    workingHours: "Monday – Saturday: 9:00 AM – 7:00 PM IST",
    responseTime: "Typically within 2 to 4 business hours",

    // Social Media Links (Configurable Placeholders)
    social: {
        instagram: "",
        linkedin: "",
        github: "",
        x: ""
    },

    // Two-Person Developer Team Information
    developers: {
        developerOne: {
            id: "dev-1",
            name: "Jesin Milesh M",
            role: "Founder & Developer",
            title: "Frontend • Backend • Security & Deployment",
            bio: "Specializes in building high-performance, mobile-first websites and secure web architectures that help local businesses establish a commanding online presence.",
            specialties: ["Modern Semantic HTML/CSS", "Vanilla JS & Core Web Vitals", "Backend APIs & Database Architecture", "Security Hardening & HTTPS"],
            linkedin: "https://www.linkedin.com/in/jesin-milesh-m-7981bb347/",
            portfolio: "work.html"
        },
        developerTwo: {
            id: "dev-2",
            name: "Libinesh R U",
            role: "Co-Founder / Business & Development",
            title: "Client Relations • UI/UX Design • Development • Business",
            bio: "Focuses on translating business needs into intuitive customer journeys, seamless booking workflows, and conversion-focused digital experiences for clients.",
            specialties: ["Client Strategy & Requirements", "Responsive UI/UX Systems", "Digital Menus & Enquiries", "SEO & Local Search Optimization"],
            linkedin: "https://www.linkedin.com/in/libinesh-r-u-59496a370",
            portfolio: "work.html"
        }
    },

    // Starting Pricing Packages (Transparent Starting Rates)
    pricing: {
        starter: {
            name: "Starter",
            startingPrice: "₹2,999+",
            description: "Essential, lightning-fast web presence for small shops, boutiques, and individual professionals getting online.",
            turnaround: "3–5 Days",
            features: [
                "1–3 Custom Designed Pages",
                "Mobile-First & 100% Responsive",
                "WhatsApp Direct Chat Button",
                "Google Maps Location Integration",
                "Contact & Lead Capture Section",
                "Free SSL / HTTPS Setup & Deployment"
            ],
            badge: "Fast Launch"
        },
        business: {
            name: "Business",
            startingPrice: "₹5,999+",
            description: "Complete professional digital presence for established clinics, schools, restaurants, and growing companies.",
            turnaround: "5–10 Days",
            features: [
                "5–7 Custom Designed Pages",
                "Tailored UI Design & Brand Aesthetics",
                "Product/Service Showcase Gallery",
                "Interactive Enquiry / Appointment Form",
                "WhatsApp Business Integration",
                "Local SEO & Google Search Meta Setup",
                "Performance Optimization (Under 1s load)",
                "Full Deployment & 30-Day Launch Support"
            ],
            badge: "Most Popular",
            popular: true
        },
        custom: {
            name: "Custom Web App",
            startingPrice: "₹9,999+",
            description: "Bespoke database-backed web applications, portals, and specialized workflows tailored to your unique operations.",
            turnaround: "2–4 Weeks",
            features: [
                "Custom Architecture & UI Componentry",
                "Database & Dynamic Data Management",
                "Interactive Booking & Reservation Workflows",
                "Secure Admin Dashboard & Authentication",
                "Third-party API & Payment Gateway Ready",
                "Role-based Access & Data Validation",
                "Security Hardening Best Practices",
                "Continuous Developer Support Plan"
            ],
            badge: "Advanced Solutions"
        }
    },

    // Trust Metrics
    trustPoints: [
        {
            title: "Mobile First",
            desc: "Designed and tested for instant responsiveness across all smartphones and tablets."
        },
        {
            title: "Performance Focused",
            desc: "Zero bloated frameworks; built with pure, lightweight code for lightning-fast loads."
        },
        {
            title: "Security Conscious",
            desc: "Hardened against vulnerabilities with HTTPS, sanitized inputs, and privacy best practices."
        },
        {
            title: "Affordable",
            desc: "Transparent, honest starting pricing tailored for local shops and institutions."
        },
        {
            title: "Direct Developer Support",
            desc: "Work directly with the two engineers who actually build and deploy your project."
        }
    ],

    // Brevo (Sendinblue) SMS & Notification Gateway Configuration
    brevo: {
        endpoint: "/api/send-sms",
        sender: "CapeSecure",
        adminEmail: "capesecuresolutions@gmail.com"
    }
};

// Freeze object to prevent unintentional mutations during runtime
if (typeof Object.freeze === "function") {
    Object.freeze(siteConfig);
}
