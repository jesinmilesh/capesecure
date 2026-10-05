const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create PNG buffer from RGBA pixel array
function createPng(width, height, getPixel) {
  // getPixel(x, y) returns [r, g, b, a] (0-255)
  const rowSize = width * 4 + 1; // 1 filter byte per scanline
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression: 0 (deflate)
  ihdr[11] = 0; // Filter: 0 (standard)
  ihdr[12] = 0; // Interlace: 0 (no interlace)

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(Buffer.concat([Buffer.from(type, 'ascii'), data]));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 implementation
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
}

// Procedural high-quality renderer for the circular CapeSecure emblem:
// Circular gold border, deep navy sky, warm sunset glow, ocean waves (deep blue, cyan, violet),
// Thiruvalluvar silhouette, cybersecurity shield outline, lock in center.
function renderEmblem(x, y, w, h) {
  // Normalize coordinates to -1 to 1
  const nx = (x / (w - 1)) * 2 - 1;
  const ny = (y / (h - 1)) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Anti-aliased outer circular mask
  const radius = 0.94;
  const borderThickness = 0.07;
  const aaEdge = 1.8 / Math.min(w, h);

  if (dist > radius + aaEdge) {
    return [0, 0, 0, 0]; // Transparent background
  }

  let alpha = 1;
  if (dist > radius - aaEdge) {
    alpha = Math.max(0, Math.min(1, (radius + aaEdge - dist) / (2 * aaEdge)));
  }

  // Outer Gold Border Check
  const isBorder = dist >= (radius - borderThickness);
  if (isBorder) {
    // Gold gradient with subtle highlight
    const goldT = (nx + ny + 1.4) / 2.8;
    // #F59E32 to #FFD477
    const r = Math.round(245 + goldT * 10);
    const g = Math.round(158 + goldT * 54);
    const b = Math.round(50 + goldT * 69);
    return [r, g, b, Math.round(alpha * 255)];
  }

  // Inside circle background:
  // Sky: deep navy (#04111D) at top, transition to sunset glow (#F59E32) near horizon (ny around 0.1)
  let bgR = 4, bgG = 17, bgB = 29;

  // Sunset horizon glow (centered at nx=0, ny=0.08)
  const sunDx = nx;
  const sunDy = (ny - 0.08) * 1.5;
  const sunDist = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
  if (sunDist < 0.85) {
    const sunGlow = Math.pow(Math.max(0, 1 - sunDist / 0.85), 2.2);
    bgR += Math.round(sunGlow * 240);
    bgG += Math.round(sunGlow * 140);
    bgB += Math.round(sunGlow * 30);
  }

  // Sun disc
  if (sunDist < 0.22) {
    const discEdge = Math.max(0, Math.min(1, (0.22 - sunDist) / 0.05));
    bgR = Math.round(bgR * (1 - discEdge) + 255 * discEdge);
    bgG = Math.round(bgG * (1 - discEdge) + 225 * discEdge);
    bgB = Math.round(bgB * (1 - discEdge) + 120 * discEdge);
  }

  // Thiruvalluvar Statue silhouette (placed slightly right of center, nx: 0.15 to 0.45, ny: -0.35 to 0.25)
  let isStatue = false;
  // Pedestal
  if (nx >= 0.16 && nx <= 0.42 && ny >= 0.10 && ny <= 0.25) {
    isStatue = true;
  }
  // Body torso & robes
  if (nx >= 0.22 && nx <= 0.36 && ny >= -0.22 && ny < 0.10) {
    isStatue = true;
  }
  // Head & shoulders
  const headDist = Math.hypot((nx - 0.29) * 1.2, (ny - (-0.28)) * 1.2);
  if (headDist < 0.075) {
    isStatue = true;
  }
  // Raised right hand (symbolic 3 fingers of Aram, Porul, Inbam)
  if (nx >= 0.36 && nx <= 0.41 && ny >= -0.32 && ny <= -0.15) {
    isStatue = true;
  }

  if (isStatue) {
    // Deep silhouette with warm rim light on left edge
    const isRim = nx < 0.24 && ny < 0.10;
    if (isRim) {
      bgR = 255; bgG = 180; bgB = 60;
    } else {
      bgR = 6; bgG = 18; bgB = 30;
    }
  }

  // Ocean Waves at lower portion (ny > 0.15)
  if (ny > 0.15) {
    // Wave 1: Blue-Violet (#2C1B4D to #4A3E99) at bottom
    // Wave 2: Deep Blue (#006D9C)
    // Wave 3: Cyan (#00C8E8 / #00E5FF)
    const waveSin1 = Math.sin(nx * 6 + 1.2) * 0.04 + 0.18;
    const waveSin2 = Math.sin(nx * 7.5 + 2.8) * 0.035 + 0.38;
    const waveSin3 = Math.sin(nx * 9 + 0.5) * 0.03 + 0.58;

    if (ny > waveSin3) {
      // Bottom layer: deep blue & violet
      bgR = 15; bgG = 35; bgB = 75;
    } else if (ny > waveSin2) {
      // Mid layer: Ocean Cyan / Blue
      bgR = 0; bgG = 120; bgB = 180;
    } else if (ny > waveSin1) {
      // Top ocean surface: Cyan highlight
      bgR = 0; bgG = 160; bgB = 210;
    }
  }

  // Cyber Shield Outline (center overlay)
  // Shield shape: nx between -0.45 and 0.45, ny between -0.38 and 0.48
  const absX = Math.abs(nx);
  let isShieldBorder = false;
  if (ny >= -0.40 && ny <= 0.46) {
    let shieldWidth = 0.40;
    if (ny > 0.0) {
      // curve inward towards point at (0, 0.46)
      const t = (ny - 0.0) / 0.46;
      shieldWidth = 0.40 * (1 - Math.pow(t, 1.4));
    }
    const borderDist = Math.abs(absX - shieldWidth);
    if (borderDist < 0.045 && ny > -0.38) {
      isShieldBorder = true;
    }
    // Top rim of shield
    if (ny >= -0.40 && ny <= -0.35 && absX <= 0.40) {
      isShieldBorder = true;
    }
  }

  if (isShieldBorder) {
    // Glowing Cyan Cyber outline
    bgR = 0;
    bgG = 229;
    bgB = 255;
  }

  // Central Security Lock (nx around 0, ny around 0.02)
  const lockBody = absX <= 0.11 && ny >= -0.02 && ny <= 0.16;
  const shackleDist = Math.hypot(absX - 0.065, (ny - (-0.08)) * 1.1);
  const isShackle = absX <= 0.09 && ny >= -0.16 && ny <= -0.02 && (shackleDist < 0.09 && shackleDist > 0.045);

  if (lockBody || isShackle) {
    // Crisp gold & white lock symbol
    bgR = 255;
    bgG = 230;
    bgB = 140;
  }

  // Clamp color channels
  bgR = Math.max(0, Math.min(255, bgR));
  bgG = Math.max(0, Math.min(255, bgG));
  bgB = Math.max(0, Math.min(255, bgB));

  return [bgR, bgG, bgB, Math.round(alpha * 255)];
}

// Generate ICO format buffer from PNG buffers
function createIco(pngBuffers) {
  // ICO header: 6 bytes
  // ICONDIR: reserved (0), type (1 = icon), count
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // Color palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // Size of image
    entry.writeUInt32LE(offset, 12); // Offset
    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

// Main execution
const targetDir = path.join(__dirname, '..', 'assets', 'logo');
const rootDir = path.join(__dirname, '..');

console.log('Generating crisp favicon assets...');

// Generate PNG sizes
const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 192 }
];

const generatedPngs = [];

for (const s of sizes) {
  console.log(`Rendering ${s.name} (${s.size}x${s.size})...`);
  const png = createPng(s.size, s.size, renderEmblem);
  fs.writeFileSync(path.join(targetDir, s.name), png);
  generatedPngs.push({ width: s.size, height: s.size, buffer: png });
}

// Copy primary favicon.png to root
fs.copyFileSync(path.join(targetDir, 'favicon.png'), path.join(rootDir, 'favicon.png'));
fs.copyFileSync(path.join(targetDir, 'apple-touch-icon.png'), path.join(rootDir, 'apple-touch-icon.png'));

// Create multi-resolution favicon.ico containing 16, 32, 48
const icoBuffers = generatedPngs.filter(p => [16, 32, 48].includes(p.width));
const ico = createIco(icoBuffers);
fs.writeFileSync(path.join(rootDir, 'favicon.ico'), ico);
fs.writeFileSync(path.join(targetDir, 'favicon.ico'), ico);

// Also update assets/logo/favicon.svg with the dedicated vector specification
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <!-- Sky & Sunset Gradients -->
    <radialGradient id="skyGrad" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#142c44" />
      <stop offset="60%" stop-color="#081827" />
      <stop offset="100%" stop-color="#04111D" />
    </radialGradient>
    <radialGradient id="sunsetGlow" cx="50%" cy="54%" r="45%">
      <stop offset="0%" stop-color="#FFD477" stop-opacity="0.9" />
      <stop offset="35%" stop-color="#F59E32" stop-opacity="0.65" />
      <stop offset="70%" stop-color="#E65100" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#04111D" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFD477" />
      <stop offset="50%" stop-color="#F59E32" />
      <stop offset="100%" stop-color="#B87314" />
    </linearGradient>
    <linearGradient id="cyberShield" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF" />
      <stop offset="50%" stop-color="#008FC4" />
      <stop offset="100%" stop-color="#003B5C" />
    </linearGradient>
    <filter id="cyberGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Circular Outer Gold Border -->
  <circle cx="64" cy="64" r="61" fill="url(#skyGrad)" stroke="url(#goldRing)" stroke-width="4.5" />
  <circle cx="64" cy="64" r="58.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

  <!-- Compass Cardinal Markers -->
  <polygon points="64,3.5 67,11 64,8.5 61,11" fill="#FFD477" />
  <polygon points="64,124.5 67,117 64,119.5 61,117" fill="#FFD477" />
  <polygon points="3.5,64 11,61 8.5,64 11,67" fill="#FFD477" />
  <polygon points="124.5,64 117,61 119.5,64 117,67" fill="#FFD477" />

  <!-- Sunset Glow -->
  <circle cx="64" cy="66" r="46" fill="url(#sunsetGlow)" />
  <circle cx="64" cy="66" r="9" fill="#FFF2BD" opacity="0.95" />

  <!-- Distant Landmark: Vivekananda Rock Memorial Silhouette on Left -->
  <path d="M26,73 L29,71 L33,71 L36,73 L38,72 L42,75 L24,75 Z" fill="#081827" opacity="0.8" />
  <path d="M31,71 L31,68 L34,68 L34,71 Z" fill="#081827" opacity="0.8" />

  <!-- Kanyakumari Thiruvalluvar Statue Silhouette on Right -->
  <!-- Pedestal -->
  <path d="M74,75 L76,68 L92,68 L94,75 Z" fill="#061320" />
  <!-- Torso & Draped Robes -->
  <path d="M80,68 L81,49 L88,49 L89,68 Z" fill="#061320" />
  <!-- Crown / Head -->
  <circle cx="84.5" cy="44" r="4.2" fill="#061320" />
  <rect x="83.5" y="40" width="2" height="2.5" fill="#061320" />
  <!-- Raised Right Hand (symbol of Aram, Porul, Inbam) -->
  <path d="M88,52 L93,45 L91,44 L87,50 Z" fill="#061320" />
  <!-- Sunset Rim Light on Statue -->
  <path d="M80,68 L81,49 Q81,44 84.5,44" fill="none" stroke="#FFBE55" stroke-width="1.2" opacity="0.85" />

  <!-- Three-Ocean Converging Waves at Base -->
  <!-- Wave 1: Deep Blue (Indian Ocean) -->
  <path d="M12,82 Q36,76 64,82 T116,82 C108,102 90,116 64,120 C38,116 20,102 12,82 Z" fill="#003554" />
  <!-- Wave 2: Blue-Violet (Bay of Bengal) -->
  <path d="M14,92 Q42,86 68,91 T114,90 C106,108 88,118 64,121 C40,118 22,108 14,92 Z" fill="#1A2D63" opacity="0.9" />
  <!-- Wave 3: Cyan Highlight (Arabian Sea) -->
  <path d="M18,100 Q46,94 72,99 T110,98 C100,112 84,120 64,121 C44,120 28,112 18,100 Z" fill="#008FC4" opacity="0.75" />
  <path d="M22,86 Q46,80 74,85 T106,84" fill="none" stroke="#00E5FF" stroke-width="1.5" opacity="0.8" />

  <!-- Cybersecurity Shield Visual Overlay -->
  <path d="M64,24 Q84,24 90,38 Q90,68 64,88 Q38,68 38,38 Q44,24 64,24 Z" 
        fill="url(#cyberShield)" fill-opacity="0.32" 
        stroke="#00E5FF" stroke-width="2.4" filter="url(#cyberGlow)" />
  <path d="M64,30 Q80,30 84,40 Q84,62 64,78 Q44,62 44,40 Q48,30 64,30 Z" 
        fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="1" stroke-dasharray="3 3" />

  <!-- Central Security Lock Emblem -->
  <rect x="56" y="52" width="16" height="13" rx="3" fill="#FFD477" stroke="#F59E32" stroke-width="1.2" />
  <!-- Shackle -->
  <path d="M59,52 V46 C59,43.2 61.2,41 64,41 C66.8,41 69,43.2 69,46 V52" 
        fill="none" stroke="#FFD477" stroke-width="2.5" stroke-linecap="round" />
  <!-- Keyhole -->
  <circle cx="64" cy="57.5" r="1.8" fill="#04111D" />
  <polygon points="63.2,58 64.8,58 65.2,62 62.8,62" fill="#04111D" />
</svg>`;

fs.writeFileSync(path.join(targetDir, 'favicon.svg'), svgContent);
fs.writeFileSync(path.join(rootDir, 'favicon.svg'), svgContent);

console.log('Favicon generation completed successfully!');
