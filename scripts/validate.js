const fs = require('fs');
const path = require('path');

const publicDir = fs.existsSync('./public') ? './public' : '.';
const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));
console.log('Validating HTML files in ' + publicDir + ':', htmlFiles);

let allValid = true;

htmlFiles.forEach(file => {
  const filePath = path.join(publicDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for critical scripts and styles
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/g;
  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["']/g;
  
  let match;
  console.log(`\nChecking ${file}:`);
  while ((match = scriptRegex.exec(content)) !== null) {
    const s = match[1];
    const cleanPath = s.split('?')[0].split('#')[0];
    const targetFile = path.join(publicDir, cleanPath);
    if (!s.startsWith('http') && !fs.existsSync(targetFile)) {
      console.error(`  [ERROR] Missing script in ${file}: ${s}`);
      allValid = false;
    } else {
      console.log(`  [OK] script: ${s}`);
    }
  }

  while ((match = linkRegex.exec(content)) !== null) {
    const l = match[1];
    const cleanPath = l.split('?')[0].split('#')[0];
    const targetFile = path.join(publicDir, cleanPath);
    if (!l.startsWith('http') && !l.startsWith('#') && !fs.existsSync(targetFile)) {
      console.error(`  [ERROR] Missing linked asset in ${file}: ${l}`);
      allValid = false;
    }
  }

  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["']/g;
  while ((match = imgRegex.exec(content)) !== null) {
    const img = match[1];
    const targetFile = path.join(publicDir, img);
    if (!img.startsWith('http') && !img.startsWith('data:') && !fs.existsSync(targetFile)) {
      console.error(`  [ERROR] Missing image in ${file}: ${img}`);
      allValid = false;
    } else {
      console.log(`  [OK] img: ${img}`);
    }
  }
});

// Validate syntax of all js files across public, admin-app, api, and backend
function validateJsInDir(dir, prefix) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      validateJsInDir(fullPath, rel);
    } else if (entry.name.endsWith('.js')) {
      try {
        const code = fs.readFileSync(fullPath, 'utf8');
        new Function(code);
        console.log(`  [OK] syntax: ${rel}`);
      } catch (e) {
        console.error(`  [ERROR] syntax error in ${rel}:`, e.message);
        allValid = false;
      }
    }
  }
}

console.log('\nValidating JS file syntax:');
validateJsInDir(path.join(publicDir, 'js'), 'public/js');
validateJsInDir('./admin-app', 'admin-app');
validateJsInDir('./api', 'api');
validateJsInDir('./backend', 'backend');

if (allValid) {
  console.log('\n>>> All HTML asset references and JS files are 100% valid!');
} else {
  process.exit(1);
}
