const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a high-res SVG icon for Synagogue
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f2b48" />
      <stop offset="50%" stop-color="#1a3d64" />
      <stop offset="100%" stop-color="#0a1c30" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe082" />
      <stop offset="40%" stop-color="#ffd54f" />
      <stop offset="70%" stop-color="#ffb300" />
      <stop offset="100%" stop-color="#ff8f00" />
    </linearGradient>
    <linearGradient id="goldSoft" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fff8e1" />
      <stop offset="100%" stop-color="#ffe082" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.45" />
    </filter>
  </defs>

  <!-- Background with rounded squircle -->
  <rect width="512" height="512" rx="110" fill="url(#bgGrad)" />
  
  <!-- Outer subtle gold border -->
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="url(#goldGrad)" stroke-width="4" opacity="0.35" />

  <!-- Main Synagogue Graphic Group -->
  <g filter="url(#shadow)" transform="translate(0, 10)">
    <!-- Base / Steps -->
    <path d="M 96 405 L 416 405 L 400 425 L 112 425 Z" fill="url(#goldGrad)" />
    <path d="M 120 385 L 392 385 L 408 405 L 104 405 Z" fill="url(#goldSoft)" />
    
    <!-- Columns Outer -->
    <rect x="128" y="240" width="28" height="145" rx="4" fill="url(#goldGrad)" />
    <rect x="356" y="240" width="28" height="145" rx="4" fill="url(#goldGrad)" />
    <!-- Columns Inner -->
    <rect x="176" y="240" width="22" height="145" rx="3" fill="url(#goldSoft)" opacity="0.9" />
    <rect x="314" y="240" width="22" height="145" rx="3" fill="url(#goldSoft)" opacity="0.9" />

    <!-- Column Capitals -->
    <path d="M 120 240 L 164 240 L 158 230 L 126 230 Z" fill="url(#goldGrad)" />
    <path d="M 348 240 L 392 240 L 386 230 L 354 230 Z" fill="url(#goldGrad)" />
    <path d="M 170 240 L 204 240 L 200 232 L 174 232 Z" fill="url(#goldGrad)" />
    <path d="M 308 240 L 342 240 L 338 232 L 312 232 Z" fill="url(#goldGrad)" />

    <!-- Central Arch / Holy Ark (Aron Kodesh) -->
    <path d="M 214 385 L 214 260 A 42 42 0 0 1 298 260 L 298 385 Z" fill="#0b1e33" stroke="url(#goldGrad)" stroke-width="6" />
    
    <!-- Ark Inner Glow / Curtain (Parochet) -->
    <path d="M 224 385 L 224 268 A 32 32 0 0 1 288 268 L 288 385 Z" fill="#14365d" />

    <!-- Entablature / Roof Pediment -->
    <path d="M 100 230 L 412 230 L 256 120 Z" fill="url(#goldGrad)" />
    <path d="M 124 224 L 388 224 L 256 134 Z" fill="#0f2b48" />

    <!-- Tablets of the Covenant (Luchot HaBrit) in Tympanum -->
    <g transform="translate(256, 178) scale(0.68)">
      <g transform="translate(-50, -45)">
        <!-- Left Tablet -->
        <path d="M 10 70 L 10 25 A 20 20 0 0 1 50 25 L 50 70 Z" fill="url(#goldSoft)" stroke="#ffb300" stroke-width="2.5" />
        <!-- Right Tablet -->
        <path d="M 50 70 L 50 25 A 20 20 0 0 1 90 25 L 90 70 Z" fill="url(#goldSoft)" stroke="#ffb300" stroke-width="2.5" />
        <!-- Commandments Lines / Text hints -->
        <line x1="20" y1="35" x2="40" y2="35" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="20" y1="44" x2="40" y2="44" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="20" y1="53" x2="40" y2="53" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="20" y1="62" x2="40" y2="62" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="60" y1="35" x2="80" y2="35" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="60" y1="44" x2="80" y2="44" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="60" y1="53" x2="80" y2="53" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
        <line x1="60" y1="62" x2="80" y2="62" stroke="#b26a00" stroke-width="2.5" stroke-linecap="round" />
      </g>
    </g>

    <!-- Star of David on the Top / Dome Peak -->
    <g transform="translate(256, 102) scale(0.65)">
      <polygon points="0,-32 28,16 -28,16" fill="url(#goldGrad)" />
      <polygon points="0,32 28,-16 -28,-16" fill="url(#goldGrad)" />
      <circle cx="0" cy="0" r="8" fill="#0f2b48" />
    </g>

    <!-- Menorah / Star inside Ark -->
    <g transform="translate(256, 320) scale(0.6)">
      <!-- Menorah branches -->
      <path d="M -30 -15 C -30 15, -10 20, 0 20 C 10 20, 30 15, 30 -15" fill="none" stroke="url(#goldSoft)" stroke-width="4" stroke-linecap="round" />
      <path d="M -18 -8 C -18 10, -6 14, 0 14 C 6 14, 18 10, 18 -8" fill="none" stroke="url(#goldSoft)" stroke-width="4" stroke-linecap="round" />
      <line x1="0" y1="-22" x2="0" y2="32" stroke="url(#goldSoft)" stroke-width="5" stroke-linecap="round" />
      <path d="M -15 32 L 15 32" stroke="url(#goldSoft)" stroke-width="6" stroke-linecap="round" />
      <!-- Flames -->
      <circle cx="-30" cy="-22" r="3.5" fill="#ffeb3b" />
      <circle cx="-18" cy="-15" r="3.5" fill="#ffeb3b" />
      <circle cx="0" cy="-28" r="4.5" fill="#ffeb3b" />
      <circle cx="18" cy="-15" r="3.5" fill="#ffeb3b" />
      <circle cx="30" cy="-22" r="3.5" fill="#ffeb3b" />
    </g>
  </g>
</svg>`;

// Pure JS minimal PNG generator
function createRawPng(width, height, renderPixelFn) {
    const rawData = Buffer.alloc(height * (1 + width * 4));
    let offset = 0;
    
    for (let y = 0; y < height; y++) {
        rawData[offset++] = 0; // Filter type 0 (None)
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = renderPixelFn(x / width, y / height);
            rawData[offset++] = r;
            rawData[offset++] = g;
            rawData[offset++] = b;
            rawData[offset++] = a;
        }
    }

    const compressed = zlib.deflateSync(rawData, { level: 9 });

    function makeChunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length, 0);
        const typeBuf = Buffer.from(type, 'ascii');
        const body = Buffer.concat([typeBuf, data]);
        const crc = crc32(body);
        const crcBuf = Buffer.alloc(4);
        crcBuf.writeUInt32BE(crc, 0);
        return Buffer.concat([len, data.length ? body : typeBuf, crcBuf]);
    }

    const crcTable = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    function crc32(buf) {
        let crc = 0 ^ (-1);
        for (let i = 0; i < buf.length; i++) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
        }
        return (crc ^ (-1)) >>> 0;
    }

    const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const ihdrChunk = makeChunk('IHDR', ihdr);
    const idatChunk = makeChunk('IDAT', compressed);
    const iendChunk = makeChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function renderSynagoguePixel(u, v, isMaskable = false) {
    const pad = isMaskable ? 0.75 : 0.92;
    const px = (u - 0.5) * 2 / pad;
    const py = (v - 0.5) * 2 / pad;

    const bgR = Math.floor(15 + (1 - v) * 12);
    const bgG = Math.floor(43 + (1 - v) * 20);
    const bgB = Math.floor(75 + (1 - v) * 35);

    if (!isMaskable) {
        const cornerR = 0.42;
        const ax = Math.abs((u - 0.5) * 2);
        const ay = Math.abs((v - 0.5) * 2);
        const qx = Math.max(ax - (1 - cornerR), 0);
        const qy = Math.max(ay - (1 - cornerR), 0);
        const d = Math.sqrt(qx * qx + qy * qy);
        if (d > cornerR) {
            return [0, 0, 0, 0];
        }
    }

    let r = bgR, g = bgG, b = bgB, a = 255;

    const goldLight = [255, 224, 130];
    const goldMid   = [255, 179, 0];
    const goldDark  = [218, 140, 0];

    // Base:
    if (py >= 0.58 && py <= 0.68 && Math.abs(px) <= 0.65 - (py - 0.58) * 0.3) {
        return [goldMid[0], goldMid[1], goldMid[2], 255];
    }
    if (py >= 0.50 && py <= 0.58 && Math.abs(px) <= 0.60) {
        return [goldLight[0], goldLight[1], goldLight[2], 255];
    }

    // Columns:
    const inCol = (py >= -0.05 && py <= 0.50) && (
        (px >= -0.55 && px <= -0.42) ||
        (px >= -0.34 && px <= -0.23) ||
        (px >= 0.23 && px <= 0.34) ||
        (px >= 0.42 && px <= 0.55)
    );
    if (inCol) {
        return [goldMid[0] + Math.floor((1 - py) * 15), goldMid[1] + Math.floor((1 - py) * 15), goldMid[2], 255];
    }

    // Arch (Aron Kodesh):
    if (px >= -0.20 && px <= 0.20 && py >= -0.05 && py <= 0.50) {
        const archTopY = -0.05 + Math.sqrt(Math.max(0, 0.04 - px * px)) * 0.8;
        if (py >= archTopY) {
            if (Math.abs(px) >= 0.16 || Math.abs(py - archTopY) <= 0.04) {
                return [goldLight[0], goldLight[1], goldLight[2], 255];
            }
            return [14, 35, 60, 255];
        }
    }

    // Menorah shape inside Ark:
    if (px >= -0.12 && px <= 0.12 && py >= 0.12 && py <= 0.44) {
        if (Math.abs(px) <= 0.02 && py <= 0.42) return [255, 235, 59, 255];
        const b1 = Math.abs(py - (0.28 + px * px * 8));
        const b2 = Math.abs(py - (0.34 + px * px * 14));
        if ((b1 < 0.025 || b2 < 0.025) && Math.abs(px) <= 0.11) {
            return [255, 224, 130, 255];
        }
        if (py >= 0.40 && py <= 0.44 && Math.abs(px) <= 0.06) {
            return [255, 224, 130, 255];
        }
    }

    // Roof:
    if (py >= -0.52 && py <= -0.05) {
        const roofHalfWidth = (py - (-0.52)) / 0.47 * 0.65;
        if (Math.abs(px) <= roofHalfWidth) {
            if (Math.abs(px) >= roofHalfWidth - 0.06 || py <= -0.46 || py >= -0.10) {
                return [goldMid[0], goldMid[1], goldMid[2], 255];
            }
            // Luchot HaBrit:
            if (py >= -0.36 && py <= -0.14 && Math.abs(px) <= 0.16) {
                const tabletCenterX = px < 0 ? -0.08 : 0.08;
                const tx = px - tabletCenterX;
                const topArch = -0.36 + Math.sqrt(Math.max(0, 0.0064 - tx * tx));
                if (py >= topArch) {
                    if (Math.abs(tx) >= 0.065 || Math.abs(py - topArch) <= 0.02 || py >= -0.16) {
                        return [goldDark[0], goldDark[1], goldDark[2], 255];
                    }
                    return [255, 248, 225, 255];
                }
            }
            return [20, 50, 85, 255];
        }
    }

    // Magen David:
    if (py >= -0.70 && py <= -0.54 && Math.abs(px) <= 0.09) {
        const starPy = (py - (-0.62)) * 14;
        const starPx = px * 14;
        const inT1 = (starPy >= -1 && starPy <= 0.5 && Math.abs(starPx) <= (starPy + 1) * 0.58);
        const inT2 = (starPy <= 1 && starPy >= -0.5 && Math.abs(starPx) <= (1 - starPy) * 0.58);
        if (inT1 || inT2) {
            return [goldLight[0], goldLight[1], goldLight[2], 255];
        }
    }

    return [r, g, b, a];
}

// Windows Multi-Resolution ICO Builder
function makeMultiResolutionIco(pngEntries) {
    const count = pngEntries.length;
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type 1 = ICO
    header.writeUInt16LE(count, 4); // Count of images

    let offset = 6 + (16 * count);
    const directoryEntries = [];
    const imageBuffers = [];

    for (const { size, buf } of pngEntries) {
        const entry = Buffer.alloc(16);
        entry.writeUInt8(size >= 256 ? 0 : size, 0); // Width
        entry.writeUInt8(size >= 256 ? 0 : size, 1); // Height
        entry.writeUInt8(0, 2);  // Colors
        entry.writeUInt8(0, 3);  // Reserved
        entry.writeUInt16LE(1, 4); // Planes
        entry.writeUInt16LE(32, 6); // Bit count
        entry.writeUInt32LE(buf.length, 8); // Size of image data
        entry.writeUInt32LE(offset, 12); // Offset to image data
        
        directoryEntries.push(entry);
        imageBuffers.push(buf);
        offset += buf.length;
    }

    return Buffer.concat([header, ...directoryEntries, ...imageBuffers]);
}

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const buildDir = path.join(rootDir, 'build');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

// 1. Write SVG
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon, 'utf8');

// 2. Generate multi-size PNGs
const sizes = [16, 32, 48, 64, 128, 180, 192, 256, 512];
const pngEntriesForIco = [];

for (const sz of sizes) {
    const png = createRawPng(sz, sz, (u, v) => renderSynagoguePixel(u, v, false));
    fs.writeFileSync(path.join(publicDir, `icon-${sz}.png`), png);
    if (sz === 180) {
        fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png);
    }
    if ([16, 32, 48, 64, 128, 256].includes(sz)) {
        pngEntriesForIco.push({ size: sz, buf: png });
    }
}

// 3. Generate Maskable PNGs for Android Adaptive Icons
const maskable192 = createRawPng(192, 192, (u, v) => renderSynagoguePixel(u, v, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-192.png'), maskable192);

const maskable512 = createRawPng(512, 512, (u, v) => renderSynagoguePixel(u, v, true));
fs.writeFileSync(path.join(publicDir, 'icon-maskable-512.png'), maskable512);

// 4. Generate Windows standard multi-resolution ICO file
const multiIco = makeMultiResolutionIco(pngEntriesForIco);

// Save ICO file to all standard locations
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), multiIco);
fs.writeFileSync(path.join(publicDir, 'synagogue.ico'), multiIco);
fs.writeFileSync(path.join(publicDir, 'app.ico'), multiIco);
fs.writeFileSync(path.join(buildDir, 'synagogue_icon.ico'), multiIco);
fs.writeFileSync(path.join(buildDir, 'prague_synagogue_icon.ico'), multiIco);
fs.writeFileSync(path.join(rootDir, 'synagogue.ico'), multiIco);
fs.writeFileSync(path.join(rootDir, 'prague_synagogue_icon.ico'), multiIco);

console.log('All multi-resolution icons & Windows ICO files created successfully!');
