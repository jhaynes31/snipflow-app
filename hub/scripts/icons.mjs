// Generates the installable-app icons as PNGs with no external dependencies.
// A moss-green round door with a candlelight window, on parchment. Original
// artwork; nothing borrowed. Run: npm run icons
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const PARCHMENT = [0xf5, 0xef, 0xe0];
const MOSS = [0x4f, 0x6b, 0x3a];
const BARK = [0x6b, 0x4f, 0x3a];
const GOLD = [0xc9, 0x8a, 0x2e];

function scene(size, maskable) {
  const pad = maskable ? size * 0.1 : 0;
  const cx = size / 2, cy = size / 2;
  const doorR = (size / 2 - pad) * 0.72;
  const frameR = doorR * 1.12;
  const winR = doorR * 0.18;
  const knobR = doorR * 0.07;
  return (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
    const d = Math.hypot(dx, dy);
    if (!maskable) {
      // Round app icon: transparent outside the parchment disc.
      if (d > size / 2) return [0, 0, 0, 0];
    }
    if (Math.hypot(dx, dy - doorR * 0.05) <= winR) return [...GOLD, 255];
    if (Math.hypot(dx - doorR * 0.55, dy + doorR * 0.05) <= knobR) return [...GOLD, 255];
    if (d <= doorR) return [...MOSS, 255];
    if (d <= frameR) return [...BARK, 255];
    return [...PARCHMENT, 255];
  };
}

mkdirSync("public", { recursive: true });
writeFileSync("public/icon-192.png", png(192, scene(192, false)));
writeFileSync("public/icon-512.png", png(512, scene(512, false)));
writeFileSync("public/apple-touch-icon.png", png(180, scene(180, true)));
writeFileSync("public/icon-maskable-512.png", png(512, scene(512, true)));
console.log("Wrote 4 icons to public/");
