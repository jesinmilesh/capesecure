const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\jesin\\.gemini\\antigravity-ide\\brain\\388db243-be55-401e-b1d3-d47f5ff2077f\\.system_generated\\steps';
const publicDir = 'e:\\Cape Secure\\public';

function extractContent(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const separator = '\n---\n\n';
  const idx = raw.indexOf(separator);
  if (idx !== -1) {
    return raw.substring(idx + separator.length);
  }
  return raw;
}

// 1. RESTORE CSS FILES
console.log('Restoring CSS files...');
let styleCss = extractContent(path.join(brainDir, '291', 'content.md'));

// Add .brand-name .solutions styling & living water canvas styling if not present
const brandAdditions = `
/* Brand Solutions Badge */
.brand-name .solutions {
  color: var(--cyan);
  font-weight: 700;
  font-size: 0.88em;
  letter-spacing: 0.04em;
  margin-left: 0.25rem;
}

/* Living Ocean Water Simulation Canvas */
#waterCanvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 1;
  opacity: 0.95;
}

/* Standard Pointer Normalization */
html, body {
  cursor: default !important;
}

a, button, [role="button"], input[type="submit"], input[type="button"], select {
  cursor: pointer !important;
}
`;

styleCss += brandAdditions;
fs.writeFileSync(path.join(publicDir, 'css', 'style.css'), styleCss, 'utf8');
console.log('  [OK] css/style.css written (' + styleCss.length + ' chars)');

const responsiveCss = extractContent(path.join(brainDir, '293', 'content.md'));
fs.writeFileSync(path.join(publicDir, 'css', 'responsive.css'), responsiveCss, 'utf8');
console.log('  [OK] css/responsive.css written (' + responsiveCss.length + ' chars)');

const animationsCss = extractContent(path.join(brainDir, '295', 'content.md'));
fs.writeFileSync(path.join(publicDir, 'css', 'animations.css'), animationsCss, 'utf8');
console.log('  [OK] css/animations.css written (' + animationsCss.length + ' chars)');


// 2. RESTORE HTML PAGES
function transformHtml(html, pageName) {
  // Brand name in navbar and footer
  let transformed = html.replace(
    /<span class="brand-name">\s*<span class="cape">CAPE<\/span><span class="secure">SECURE<\/span>\s*<\/span>/g,
    `<span class="brand-name">\n            <span class="cape">CAPE</span><span class="secure">SECURE</span> <span class="solutions">SOLUTIONS</span>\n          </span>`
  );

  // Fallback single line brand replacement
  transformed = transformed.replace(
    /<span class="cape">CAPE<\/span><span class="secure">SECURE<\/span>/g,
    `<span class="cape">CAPE</span><span class="secure">SECURE</span> <span class="solutions">SOLUTIONS</span>`
  );

  // Title tag branding
  transformed = transformed.replace(/<title>CapeSecure/g, '<title>Cape Secure Solutions');

  // Footer copyright & mention
  transformed = transformed.replace(/CapeSecure\. All rights reserved\./g, 'Cape Secure Solutions. All rights reserved.');
  transformed = transformed.replace(/Built with care by CapeSecure/g, 'Built with care by Cape Secure Solutions');

  // Ensure water.css is linked in head
  if (!transformed.includes('css/water.css')) {
    transformed = transformed.replace('</head>', '  <link rel="stylesheet" href="css/water.css?v=1.2">\n</head>');
  }

  // Ensure waterCanvas is in body
  if (!transformed.includes('id="waterCanvas"')) {
    transformed = transformed.replace('<body>', '<body>\n\n  <!-- Living Ocean Simulation Canvas -->\n  <canvas id="waterCanvas" aria-hidden="true"></canvas>\n');
  }

  // Ensure water.js & ripple.js are included before </body>
  if (!transformed.includes('js/water.js')) {
    const scriptsInsert = `  <script src="js/water.js?v=1.2"></script>\n  <script src="js/ripple.js?v=1.2"></script>\n`;
    if (transformed.includes('<script src="js/main.js')) {
      transformed = transformed.replace('<script src="js/main.js', scriptsInsert + '  <script src="js/main.js');
    } else {
      transformed = transformed.replace('</body>', scriptsInsert + '</body>');
    }
  }

  return transformed;
}

const htmlPages = [
  { name: 'index.html', step: '238' },
  { name: 'services.html', step: '261' },
  { name: 'work.html', step: '263' },
  { name: 'pricing.html', step: '265' },
  { name: 'about.html', step: '267' },
  { name: 'contact.html', step: '269' }
];

console.log('\nRestoring HTML pages...');
htmlPages.forEach(p => {
  const rawHtml = extractContent(path.join(brainDir, p.step, 'content.md'));
  const transformed = transformHtml(rawHtml, p.name);
  fs.writeFileSync(path.join(publicDir, p.name), transformed, 'utf8');
  console.log(`  [OK] ${p.name} written (${transformed.length} chars)`);
});

// Update quote.html to have consistent navigation and branding
console.log('\nUpdating quote.html...');
let quoteHtml = fs.readFileSync(path.join(publicDir, 'quote.html'), 'utf8');
// Fix navigation links in quote.html if needed
const standardNav = `<ul class="nav-links">
          <li><a href="index.html" class="nav-link">Home</a></li>
          <li><a href="services.html" class="nav-link">Services</a></li>
          <li><a href="work.html" class="nav-link">Our Work</a></li>
          <li><a href="pricing.html" class="nav-link">Pricing</a></li>
          <li><a href="about.html" class="nav-link">About</a></li>
          <li><a href="contact.html" class="nav-link">Contact</a></li>
        </ul>`;

quoteHtml = quoteHtml.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/, standardNav);
// Replace ambientCanvas with waterCanvas
quoteHtml = quoteHtml.replace('<canvas id="ambientCanvas" class="ambient-canvas" aria-hidden="true"></canvas>', '<canvas id="waterCanvas" aria-hidden="true"></canvas>');
if (!quoteHtml.includes('css/water.css')) {
  quoteHtml = quoteHtml.replace('</head>', '  <link rel="stylesheet" href="css/water.css?v=1.2">\n</head>');
}
if (!quoteHtml.includes('js/water.js')) {
  quoteHtml = quoteHtml.replace('</body>', '  <script src="js/water.js?v=1.2"></script>\n  <script src="js/ripple.js?v=1.2"></script>\n</body>');
}
fs.writeFileSync(path.join(publicDir, 'quote.html'), quoteHtml, 'utf8');
console.log('  [OK] quote.html updated');

// Redirect projects.html to work.html
const projectsRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=work.html">
  <title>Redirecting to Our Work | Cape Secure Solutions</title>
  <link rel="icon" type="image/png" href="favicon.png">
  <script>window.location.replace("work.html");</script>
</head>
<body style="background: #06111c; color: #f8fbff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <p>Redirecting to <a href="work.html" style="color: #00d9ff;">Cape Secure Solutions Our Work</a>...</p>
</body>
</html>
`;
fs.writeFileSync(path.join(publicDir, 'projects.html'), projectsRedirect, 'utf8');
console.log('  [OK] projects.html set as redirect to work.html');

// Redirect security.html to index.html#security
const securityRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=index.html#security">
  <title>Redirecting to Security | Cape Secure Solutions</title>
  <link rel="icon" type="image/png" href="favicon.png">
  <script>window.location.replace("index.html#security");</script>
</head>
<body style="background: #06111c; color: #f8fbff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <p>Redirecting to <a href="index.html#security" style="color: #00d9ff;">Cape Secure Solutions Security</a>...</p>
</body>
</html>
`;
fs.writeFileSync(path.join(publicDir, 'security.html'), securityRedirect, 'utf8');
console.log('  [OK] security.html set as redirect to index.html#security');
