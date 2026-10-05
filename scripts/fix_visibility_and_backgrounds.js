const fs = require('fs');
const path = require('path');

const publicDir = 'e:\\Cape Secure\\public';

const pages = [
  { file: 'index.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Coast, Thiruvalluvar Statue and Three Seas Horizon' },
  { file: 'services.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Ocean Coastline' },
  { file: 'work.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Coastline and Ocean Waters' },
  { file: 'pricing.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Coastal Horizon' },
  { file: 'about.html', img: 'assets/images/kanyakumari-heritage.jpg', alt: 'Kanyakumari Coastal Heritage and Memorial' },
  { file: 'contact.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Lighthouse and Shoreline' },
  { file: 'quote.html', img: 'assets/images/kanyakumari-hero.jpg', alt: 'Kanyakumari Coastline' }
];

pages.forEach(p => {
  const filePath = path.join(publicDir, p.file);
  if (!fs.existsSync(filePath)) return;
  let html = fs.readFileSync(filePath, 'utf8');

  // Fix duplicate SOLUTIONS text
  html = html.replace(/<span class="solutions">SOLUTIONS<\/span>\s*<span class="solutions">SOLUTIONS<\/span>/g, '<span class="solutions">SOLUTIONS</span>');

  // Check if hero-backdrop already exists
  if (!html.includes('class="hero-backdrop"')) {
    const backdropSnippet = `\n      <!-- Kanyakumari Photographic Background -->\n      <div class="hero-backdrop" aria-hidden="true">\n        <img src="${p.img}" alt="${p.alt}" class="hero-scene-image">\n        <div class="hero-vignette"></div>\n      </div>\n`;
    
    // Insert immediately inside the first <section class="...hero-section...">
    html = html.replace(/(<section[^>]*class="[^"]*hero-section[^"]*"[^>]*>)/i, `$1${backdropSnippet}`);
  }

  // Ensure waterCanvas has z-index: 0
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Updated ${p.file} with hero backdrop and clean branding.`);
});
