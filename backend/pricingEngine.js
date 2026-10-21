/**
 * Cape Secure Solutions — Server-Side Financial & Pricing Engine
 * Authoritative pricing calculation. Never trusts client-submitted totals.
 */

const { getCompanyConfig } = require('./companyConfig');

const CATALOG = {
  packages: {
    starter: {
      id: 'starter',
      name: 'Starter Website Package',
      description: 'Single-page responsive business website with WhatsApp ordering & Google Maps pin.',
      price: 2999
    },
    business: {
      id: 'business',
      name: 'Business Growth Package',
      description: 'Up to 5 custom responsive pages, services catalog, enquiry intake & local SEO schema.',
      price: 5999
    },
    custom: {
      id: 'custom',
      name: 'Custom Web Application / Portal',
      description: 'Bespoke web application with interactive portal, admin dashboard & database.',
      price: 9999
    }
  },
  addons: {
    domain: {
      id: 'domain',
      name: 'Custom Domain Registration (.com / .in)',
      description: '1-Year top-level domain registration with DNS management & SSL binding.',
      price: 999,
      unit: 'year'
    },
    hosting: {
      id: 'hosting',
      name: 'High-Speed Cloud Hosting',
      description: '1-Year SSD cloud hosting, 99.9% uptime, automated weekly backups & CDN acceleration.',
      price: 1999,
      unit: 'year'
    },
    ssl_security: {
      id: 'ssl_security',
      name: 'Security Hardening & SSL Setup',
      description: 'Zero-trust SSL certificate, security headers, XSS/CORS protection & spam honeypot.',
      price: 1499,
      unit: 'one-time'
    },
    business_email: {
      id: 'business_email',
      name: 'Professional Business Email Setup',
      description: 'Custom domain email addresses (info@/sales@), SPF/DKIM/DMARC deliverability hardening.',
      price: 999,
      unit: 'one-time'
    },
    maintenance: {
      id: 'maintenance',
      name: 'Annual Care & Maintenance Plan',
      description: 'Priority tech support, security patches, monthly content updates & uptime monitoring.',
      price: 2499,
      unit: 'year'
    },
    seo: {
      id: 'seo',
      name: 'Local SEO & Google Search Console Indexing',
      description: 'On-page SEO, Open Graph social cards, sitemap generation & Google Business profile sync.',
      price: 1999,
      unit: 'one-time'
    },
    custom_feature: {
      id: 'custom_feature',
      name: 'Bespoke Functional Module / Integration',
      description: 'Custom database workflow, booking engine, or third-party API integration.',
      price: 2999,
      unit: 'per module'
    }
  }
};

/**
 * Calculates authoritative line items and financial totals for an order or quotation.
 */
function calculateOrderTotals(payload, customItems = [], discount = 0, amountPaid = 0) {
  const config = getCompanyConfig();
  const items = [];

  // 1. Process custom items if provided (e.g. from Admin quotation/invoice editor)
  if (Array.isArray(customItems) && customItems.length > 0) {
    customItems.forEach((it) => {
      const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
      const rate = Math.max(0, parseFloat(it.rate ?? it.price ?? 0));
      items.push({
        description: String(it.description || it.name || 'Service Item').trim(),
        quantity: qty,
        rate: rate,
        total: Math.round(qty * rate)
      });
    });
  } else {
    // 2. Build line items from customer selections
    const planKey = (payload.plan || payload.package || 'starter').toLowerCase();
    const pkg = CATALOG.packages[planKey] || CATALOG.packages.starter;
    items.push({
      description: `${pkg.name} (${payload.businessType || payload.category || 'Standard'} Layout)`,
      quantity: 1,
      rate: pkg.price,
      total: pkg.price
    });

    // Check Domain
    if (payload.needDomain || payload.domain || (payload.addons && payload.addons.includes('domain'))) {
      const d = CATALOG.addons.domain;
      const domainName = typeof payload.domain === 'string' && payload.domain.trim() ? ` (${payload.domain.trim()})` : '';
      items.push({
        description: `${d.name}${domainName}`,
        quantity: 1,
        rate: d.price,
        total: d.price
      });
    }

    // Check Hosting
    if (payload.needHosting || payload.hosting || (payload.addons && payload.addons.includes('hosting'))) {
      const h = CATALOG.addons.hosting;
      items.push({
        description: h.name,
        quantity: 1,
        rate: h.price,
        total: h.price
      });
    }

    // Check Maintenance
    if (payload.needMaintenance || payload.maintenance || (payload.addons && payload.addons.includes('maintenance'))) {
      const m = CATALOG.addons.maintenance;
      items.push({
        description: m.name,
        quantity: 1,
        rate: m.price,
        total: m.price
      });
    }

    // Check SSL / Security
    if (payload.needSecurity || (payload.addons && payload.addons.includes('ssl_security'))) {
      const s = CATALOG.addons.ssl_security;
      items.push({
        description: s.name,
        quantity: 1,
        rate: s.price,
        total: s.price
      });
    }

    // Check Business Email
    if (payload.needEmail || (payload.addons && payload.addons.includes('business_email'))) {
      const e = CATALOG.addons.business_email;
      items.push({
        description: e.name,
        quantity: 1,
        rate: e.price,
        total: e.price
      });
    }

    // Check SEO
    if (payload.needSeo || (payload.addons && payload.addons.includes('seo'))) {
      const seo = CATALOG.addons.seo;
      items.push({
        description: seo.name,
        quantity: 1,
        rate: seo.price,
        total: seo.price
      });
    }

    // Check custom requirements/features
    if (payload.customFeaturesCount && parseInt(payload.customFeaturesCount, 10) > 0) {
      const count = parseInt(payload.customFeaturesCount, 10);
      const cf = CATALOG.addons.custom_feature;
      items.push({
        description: `${cf.name} (${count} feature${count > 1 ? 's' : ''})`,
        quantity: count,
        rate: cf.price,
        total: count * cf.price
      });
    }
  }

  // Calculate Subtotal
  const subtotal = items.reduce((acc, it) => acc + it.total, 0);

  // Apply Discount
  const cleanDiscount = Math.min(subtotal, Math.max(0, parseFloat(discount) || 0));
  const taxableAmount = Math.max(0, subtotal - cleanDiscount);

  // Apply Tax / GST if configured
  const taxEnabled = Boolean(config.tax && config.tax.enabled);
  const taxRate = taxEnabled ? (parseFloat(config.tax.ratePercent) || 18) : 0;
  const taxAmount = taxEnabled ? Math.round(taxableAmount * (taxRate / 100)) : 0;

  // Final Total
  const total = taxableAmount + taxAmount;

  // Payments & Balance
  const cleanAmountPaid = Math.min(total, Math.max(0, parseFloat(amountPaid) || 0));
  const balance = Math.max(0, total - cleanAmountPaid);

  // Status computation
  let paymentStatus = 'PENDING';
  if (cleanAmountPaid >= total && total > 0) {
    paymentStatus = 'PAID';
  } else if (cleanAmountPaid > 0) {
    paymentStatus = 'PARTIALLY PAID';
  }

  return {
    items,
    subtotal,
    discount: cleanDiscount,
    taxableAmount,
    taxEnabled,
    taxRate,
    taxName: config.tax?.name || 'GST',
    taxAmount,
    total,
    amountPaid: cleanAmountPaid,
    balance,
    paymentStatus
  };
}

module.exports = {
  CATALOG,
  calculateOrderTotals
};
