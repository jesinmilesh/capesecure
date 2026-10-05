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

// Also validate syntax of all js files
const jsDir = path.join(publicDir, 'js');
const jsFiles = fs.existsSync(jsDir) ? fs.readdirSync(jsDir).filter(f => f.endsWith('.js')) : [];
console.log('\nValidating JS file syntax:');
jsFiles.forEach(f => {
  try {
    const code = fs.readFileSync(path.join(jsDir, f), 'utf8');
    new Function(code);
    console.log(`  [OK] syntax: js/${f}`);
  } catch (e) {
    console.error(`  [ERROR] syntax error in js/${f}:`, e.message);
    allValid = false;
  }
});

if (allValid) {
  console.log('\n>>> All HTML asset references and JS files are 100% valid!');
} else {
  process.exit(1);
}
