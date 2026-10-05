const fs = require('fs');
const zlib = require('zlib');

// Read favicon (2).png
const buf = fs.readFileSync('favicon (2).png');
let pos = 8;
let chunks = [];
let width, height, bitDepth, colorType;

while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  const data = buf.slice(pos + 8, pos + 8 + len);
  const crc = buf.readUInt32BE(pos + 8 + len);
  
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  }
  
  chunks.push({ type, data, len, crc });
  pos += 12 + len;
}

const idatChunks = chunks.filter(c => c.type === 'IDAT').map(c => c.data);
const raw = zlib.inflateSync(Buffer.concat(idatChunks));
const stride = width * 4 + 1;

// Identify cyan line pixels
// We do two passes:
// 1. Core cyan line detection
// 2. Slight dilation (1-2px) to catch the antialiased blue glow around the line/dots
const isMask = new Uint8Array(width * height);

for (let y = 0; y < height; y++) {
  const lineStart = y * stride + 1;
  for (let x = 0; x < width; x++) {
    // Shield area: x: 440 to 814, y: 645 to 1070
    if (x >= 440 && x <= 814 && y >= 645 && y <= 1070) continue;

    const idx = lineStart + x * 4;
    const r = raw[idx];
    const g = raw[idx + 1];
    const b = raw[idx + 2];
    const a = raw[idx + 3];

    if (a < 30) continue;

    // Detect electric cyan line or cyan dot
    const isElectricCyan = (g > 180 && b > 210 && r < 120);
    const isDashedLine = (b > 150 && g > 150 && (b - r) > 40 && (g - r) > 25);
    
    // Also in the sky (y < 600), sunset colors are warm, so any high blue/green with low red is the line
    const isSkyCyan = y < 580 && (b > 120 && g > 130 && b > r + 30 && g > r + 20);

    if (isElectricCyan || isDashedLine || isSkyCyan) {
      isMask[y * width + x] = 1;
    }
  }
}

// Dilate mask by 2px to ensure all fringe antialiasing of the cyan line is removed
const dilated = new Uint8Array(width * height);
for (let y = 2; y < height - 2; y++) {
  for (let x = 2; x < width - 2; x++) {
    if (isMask[y * width + x]) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (dx*dx + dy*dy <= 5) {
            dilated[(y + dy) * width + (x + dx)] = 1;
          }
        }
      }
    }
  }
}

// Inpaint: for each dilated pixel, sample non-dilated neighbors in a ring of radius 3-7px
let inpaintedCount = 0;
const outputRaw = Buffer.from(raw);

for (let y = 0; y < height; y++) {
  const lineStart = y * stride + 1;
  for (let x = 0; x < width; x++) {
    if (!dilated[y * width + x]) continue;

    inpaintedCount++;
    let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

    // Search neighbors
    for (let r = 3; r <= 8; r++) {
      for (let angle = 0; angle < 16; angle++) {
        const nx = Math.round(x + r * Math.cos(angle * Math.PI / 8));
        const ny = Math.round(y + r * Math.sin(angle * Math.PI / 8));
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (!dilated[ny * width + nx]) {
            const nIdx = ny * stride + 1 + nx * 4;
            const weight = 1 / (r * r);
            sumR += raw[nIdx] * weight;
            sumG += raw[nIdx + 1] * weight;
            sumB += raw[nIdx + 2] * weight;
            sumWeight += weight;
          }
        }
      }
      if (sumWeight > 0.05) break; // found enough clean background neighbors
    }

    const idx = lineStart + x * 4;
    if (sumWeight > 0) {
      outputRaw[idx] = Math.round(sumR / sumWeight);
      outputRaw[idx + 1] = Math.round(sumG / sumWeight);
      outputRaw[idx + 2] = Math.round(sumB / sumWeight);
    }
  }
}

console.log(`Inpainted ${inpaintedCount} pixels cleanly.`);

// Recompress PNG
function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcVal = crc32(typeAndData);
  chunk.writeUInt32BE(crcVal, 8 + len);
  return chunk;
}

const newIdatData = zlib.deflateSync(outputRaw, { level: 9 });
const newIdatChunk = makeChunk('IDAT', newIdatData);

// Keep IHDR, write new IDAT, write IEND
const ihdrChunk = chunks.find(c => c.type === 'IHDR');
const ihdrBuffer = makeChunk('IHDR', ihdrChunk.data);
const iendBuffer = makeChunk('IEND', Buffer.alloc(0));

const newPng = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ihdrBuffer,
  newIdatChunk,
  iendBuffer
]);

fs.writeFileSync('favicon (2).png', newPng);
console.log('Successfully saved cleaned favicon (2).png! File size:', newPng.length);
