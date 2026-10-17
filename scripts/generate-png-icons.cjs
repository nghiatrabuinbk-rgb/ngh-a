const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunk checksums
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const typeAndData = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);

  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
}

function createPng(width, height, isMaskable = false) {
  // RGBA buffer with raw scanlines (each row starts with 0 byte filter)
  const rowBytes = width * 4;
  const rawData = Buffer.alloc(height * (rowBytes + 1));

  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = width / 2;
  const cornerRadius = isMaskable ? 0 : width * 0.22;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    const dy = y - centerY;

    for (let x = 0; x < width; x++) {
      const dx = x - centerX;

      // Base background: Emerald to Teal gradient
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(6 + (4 - 6) * gradRatio);
      let g = Math.round(78 + (120 - 78) * gradRatio);
      let b = Math.round(59 + (110 - 59) * gradRatio);
      let a = 255;

      // Rounded rectangle mask if not maskable
      if (!isMaskable) {
        const ax = Math.abs(dx);
        const ay = Math.abs(dy);
        const innerW = width / 2 - cornerRadius;
        const innerH = height / 2 - cornerRadius;

        if (ax > innerW && ay > innerH) {
          const cornerDist = Math.hypot(ax - innerW, ay - innerH);
          if (cornerDist > cornerRadius) {
            a = 0;
          }
        }
      }

      // Draw white house / school silhouette in center
      // Normalize coords to [-1, 1]
      const nx = dx / (width * 0.35);
      const ny = dy / (height * 0.35);

      // Roof triangle: apex at ny = -0.7, base at ny = -0.05
      const isRoof = ny >= -0.7 && ny <= -0.05 && Math.abs(nx) <= (ny + 0.7) * 1.5;
      // House body: ny between -0.05 and 0.65, nx between -0.65 and 0.65
      const isBody = ny >= -0.05 && ny <= 0.65 && Math.abs(nx) <= 0.65;

      // Door cutout: ny 0.2 to 0.65, nx -0.2 to 0.2
      const isDoor = ny >= 0.2 && ny <= 0.65 && Math.abs(nx) <= 0.2;

      // Checkmark emblem on bottom-right: center at nx=0.55, ny=0.45
      const checkDist = Math.hypot(nx - 0.55, ny - 0.45);
      const isCheckBadge = checkDist <= 0.32;

      if (a > 0) {
        if (isCheckBadge) {
          // Emerald circle with white check
          r = 16; g = 185; b = 129;
          if (checkDist <= 0.32 && checkDist >= 0.28) {
            r = 255; g = 255; b = 255;
          }
        } else if ((isRoof || isBody) && !isDoor) {
          // White house body
          r = 255; g = 255; b = 255;
        } else if (isDoor) {
          // Teal door
          r = 4; g = 120; b = 87;
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT (Deflated)
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate standard PWA icons
console.log('Generating pwa-192x192.png...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, false));

console.log('Generating pwa-512x512.png...');
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, false));

console.log('Generating pwa-maskable-512x512.png...');
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));

console.log('Generating apple-touch-icon.png (180x180)...');
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, false));

// Also generate a small 64x64 favicon.ico/png
console.log('Generating favicon.png...');
fs.writeFileSync(path.join(publicDir, 'favicon.png'), createPng(64, 64, false));

console.log('All PWA icons generated successfully in public/');
