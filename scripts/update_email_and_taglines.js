const fs = require('fs');
const path = require('path');

const publicDir = 'e:\\Cape Secure\\public';

// 1. UPDATE config.js
const configPath = path.join(publicDir, 'js', 'config.js');
if (fs.existsSync(configPath)) {
  let configCode = fs.readFileSync(configPath, 'utf8');
  configCode = configCode.replace(/email:\s*["'][^"']+["']/, 'email: "capesecuresolutions@gmail.com"');
  configCode = configCode.replace(/tagline:\s*["'][^"']+["']/, 'tagline: "Where three seas meet, security begins."');
  if (!configCode.includes('motto:')) {
    configCode = configCode.replace('tagline: "Where three seas meet, security begins."', 'tagline: "Where three seas meet, security begins.",\n    motto: "Born at the edge of three seas. Built to protect your digital horizon."');
  }
  fs.writeFileSync(configPath, configCode, 'utf8');
  console.log('[OK] js/config.js updated with capesecuresolutions@gmail.com and taglines');
}

// 2. UPDATE main.js
const mainPath = path.join(publicDir, 'js', 'main.js');
if (fs.existsSync(mainPath)) {
  let mainCode = fs.readFileSync(mainPath, 'utf8');
  mainCode = mainCode.replace(/hello@capesecure\.in/g, 'capesecuresolutions@gmail.com');
  fs.writeFileSync(mainPath, mainCode, 'utf8');
  console.log('[OK] js/main.js updated with capesecuresolutions@gmail.com');
}

// 3. UPDATE ALL HTML FILES
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  // Replace emails
  html = html.replace(/hello@capesecure\.in/g, 'capesecuresolutions@gmail.com');
  html = html.replace(/contact@capesecure\.in/g, 'capesecuresolutions@gmail.com');

  // Update brand tagline in header and footer
  html = html.replace(/<span class="brand-tagline">Websites • Security • Solutions<\/span>/g, '<span class="brand-tagline">Where Three Seas Meet, Security Begins</span>');

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`[OK] ${file} updated email and tagline`);
});

// 4. Update story section in index.html to feature the related motto quote prominently
const indexPath = path.join(publicDir, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

if (!indexHtml.includes('Born at the edge of three seas. Built to protect your digital horizon.')) {
  // Add in hero if not present
  indexHtml = indexHtml.replace(
    /<p class="hero-subtitle">/,
    `<p class="hero-subtitle">\n              <span class="hero-motto-callout" style="display: block; color: var(--gold-light); font-weight: 600; font-size: 1.15rem; margin-bottom: 0.65rem; letter-spacing: -0.01em;">&ldquo;Born at the edge of three seas. Built to protect your digital horizon.&rdquo;</span>`
  );
}

// Ensure Kanyakumari Brand Story section also highlights the taglines
const storyTarget = `<h2 class="section-title">BUILT FROM THE CAPE.<br><span class="text-cyan">DESIGNED FOR THE DIGITAL WORLD.</span></h2>`;
const storyReplacement = `<h2 class="section-title">WHERE THREE SEAS MEET,<br><span class="text-cyan">SECURITY BEGINS.</span></h2>
            
            <div style="margin: 1.25rem 0 1.5rem 0; padding: 0.9rem 1.25rem; background: rgba(0, 217, 255, 0.06); border-left: 3px solid var(--cyan); border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
              <p style="color: var(--gold-light); font-weight: 600; font-size: 1.1rem; margin: 0; font-style: italic;">
                &ldquo;Born at the edge of three seas. Built to protect your digital horizon.&rdquo;
              </p>
            </div>`;

if (indexHtml.includes(storyTarget)) {
  indexHtml = indexHtml.replace(storyTarget, storyReplacement);
  console.log('[OK] index.html story section updated with both taglines');
}

fs.writeFileSync(indexPath, indexHtml, 'utf8');
