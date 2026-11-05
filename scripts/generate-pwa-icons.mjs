import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createStudentOsPng(size, isMaskable = false) {
  const width = size;
  const height = size;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bits per channel
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const ihdrChunk = makeChunk("IHDR", ihdr);

  const rawScanlines = [];
  const radius = width * (isMaskable ? 0.48 : 0.42);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: royal blue gradient
      // #2563EB (37, 99, 235) to #1D4ED8 (29, 78, 216)
      const gradT = y / height;
      let r = Math.round(37 * (1 - gradT) + 29 * gradT);
      let g = Math.round(99 * (1 - gradT) + 78 * gradT);
      let b = Math.round(235 * (1 - gradT) + 216 * gradT);
      let a = 255;

      if (!isMaskable) {
        // Non-maskable icon has rounded squircle corners
        const cornerR = width * 0.22;
        const qx = Math.max(0, Math.abs(dx) - (width / 2 - cornerR));
        const qy = Math.max(0, Math.abs(dy) - (height / 2 - cornerR));
        const cornerDist = Math.sqrt(qx * qx + qy * qy);
        if (cornerDist > cornerR) {
          a = 0;
        }
      }

      // Draw Student OS Emblem in center:
      // Scaled coordinates relative to center
      const nx = dx / (width * (isMaskable ? 0.35 : 0.4));
      const ny = dy / (height * (isMaskable ? 0.35 : 0.4));

      // Graduation cap diamond: |nx| + |ny| <= 0.65 (offset slightly up)
      const capY = ny + 0.1;
      const diamondDist = Math.abs(nx) * 0.9 + Math.abs(capY) * 1.4;

      // Cap crown / base
      const isCapDiamond = diamondDist <= 0.55 && capY <= 0.25;
      const isCapBase = Math.abs(nx) <= 0.35 && capY >= 0.15 && capY <= 0.45;

      // AI Spark star: 4-pointed star in top right (nx: 0.35, ny: -0.35)
      const starDx = Math.abs(nx - 0.4);
      const starDy = Math.abs(ny + 0.4);
      const isStar = Math.sqrt(starDx) + Math.sqrt(starDy) <= 0.32;

      if (a > 0) {
        if (isCapDiamond || isCapBase) {
          // Pure crisp white cap
          r = 255;
          g = 255;
          b = 255;
        } else if (isStar) {
          // Vibrant cyan/gold spark
          r = 254;
          g = 240;
          b = 138; // amber-200
        }
      }

      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }

    rawScanlines.push(row);
  }

  const uncompressed = Buffer.concat(rawScanlines);
  const compressed = zlib.deflateSync(uncompressed, { level: 9 });
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function createIco(png32Buffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(1, 4); // 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // width
  entry.writeUInt8(32, 1); // height
  entry.writeUInt8(0, 2); // colors
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png32Buffer.length, 8); // image size
  entry.writeUInt32LE(22, 12); // image offset

  return Buffer.concat([header, entry, png32Buffer]);
}

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </linearGradient>
    <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0F172A" flood-opacity="0.25" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />

  <!-- Inner Subtle Accent Border -->
  <rect x="8" y="8" width="496" height="496" rx="104" stroke="#60A5FA" stroke-opacity="0.3" stroke-width="4" fill="none" />

  <!-- Graduation Cap -->
  <g filter="url(#shadow)">
    <!-- Cap Diamond (Mortarboard) -->
    <path d="M256 120 L416 195 L256 270 L96 195 Z" fill="#FFFFFF" />
    
    <!-- Cap Lower Band -->
    <path d="M152 245 L152 305 C152 345, 360 345, 360 305 L360 245" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Tassel -->
    <path d="M380 205 L404 290" stroke="#FDE047" stroke-width="8" stroke-linecap="round" />
    <circle cx="404" cy="296" r="10" fill="#FDE047" />
  </g>

  <!-- 4-Point AI Intelligence Star Spark -->
  <path d="M390 100 Q390 140 430 140 Q390 140 390 180 Q390 140 350 140 Q390 140 390 100 Z" fill="url(#sparkGrad)" />
</svg>
`;

const iconsDir = path.resolve(process.cwd(), "public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log("Generating PWA icons...");

// 1. SVG
fs.writeFileSync(path.join(iconsDir, "icon.svg"), svgIcon, "utf8");

// 2. PNG 192x192 & 512x512 standard
const png192 = createStudentOsPng(192, false);
fs.writeFileSync(path.join(iconsDir, "icon-192.png"), png192);

const png512 = createStudentOsPng(512, false);
fs.writeFileSync(path.join(iconsDir, "icon-512.png"), png512);

// 3. Maskable PNGs (safe zone padded)
const pngMask192 = createStudentOsPng(192, true);
fs.writeFileSync(path.join(iconsDir, "icon-maskable-192.png"), pngMask192);

const pngMask512 = createStudentOsPng(512, true);
fs.writeFileSync(path.join(iconsDir, "icon-maskable-512.png"), pngMask512);

// 4. Apple Touch Icon (180x180)
const pngApple = createStudentOsPng(180, false);
fs.writeFileSync(path.join(iconsDir, "apple-touch-icon.png"), pngApple);

// 5. Favicon 32x32 & ICO
const png32 = createStudentOsPng(32, false);
const ico = createIco(png32);
fs.writeFileSync(path.resolve(process.cwd(), "public/favicon.ico"), ico);
fs.writeFileSync(path.join(iconsDir, "favicon-32x32.png"), png32);

console.log("PWA Icons generated successfully in public/icons and public/favicon.ico");

