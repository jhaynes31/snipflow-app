// Generates Every Box PWA icons as PNGs with no external dependencies.
// Run: node scripts/everybox-icons.mjs
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

const BG = [0x4f, 0x7d, 0x4a];      // garden accent
const CREAM = [0xf5, 0xf2, 0xe8];   // page bg
const LEAF = [0xb5, 0xd6, 0x9f];
const BLOOM = [0xf2, 0xb8, 0xc6];

function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.max(x0 + r, Math.min(x, x1 - r));
  const cy = Math.max(y0 + r, Math.min(y, y1 - r));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}
function inEllipse(x, y, cx, cy, rx, ry, angle = 0) {
  const c = Math.cos(angle), s = Math.sin(angle);
  const dx = x - cx, dy = y - cy;
  const u = dx * c + dy * s, v = -dx * s + dy * c;
  return (u / rx) ** 2 + (v / ry) ** 2 <= 1;
}

/** A box with a sprout growing out of it. `pad` = maskable safe-zone inset. */
function draw(size, { maskable }) {
  const pad = maskable ? size * 0.1 : 0;
  const s = size - pad * 2;
  return png(size, (x, y) => {
    const px = x - pad, py = y - pad;
    const u = px / s, v = py / s; // 0..1 inside the safe area
    // Background: rounded square (opaque) or full bleed for maskable
    if (maskable) {
      // full bleed background
    } else if (!inRoundedRect(x, y, 0, 0, size - 1, size - 1, size * 0.22)) {
      return [0, 0, 0, 0];
    }
    let col = BG;
    // Box: cream rounded rect at the bottom
    if (inRoundedRect(u, v, 0.26, 0.56, 0.74, 0.84, 0.06)) col = CREAM;
    // Box lid line
    if (u > 0.24 && u < 0.76 && v > 0.55 && v < 0.6) col = mix(CREAM, BG, 0.35);
    // Stem
    if (u > 0.485 && u < 0.515 && v > 0.3 && v < 0.58) col = LEAF;
    // Leaves
    if (inEllipse(u, v, 0.42, 0.42, 0.1, 0.05, -0.7)) col = LEAF;
    if (inEllipse(u, v, 0.58, 0.36, 0.1, 0.05, 0.7)) col = LEAF;
    // Bloom
    if (inEllipse(u, v, 0.5, 0.25, 0.075, 0.075)) col = BLOOM;
    if (inEllipse(u, v, 0.5, 0.25, 0.028, 0.028)) col = mix(BLOOM, [0xff, 0xf2, 0xc0], 0.8);
    return [...col, 255];
  });
}

mkdirSync("public/everybox", { recursive: true });
writeFileSync("public/everybox/icon-192.png", draw(192, { maskable: false }));
writeFileSync("public/everybox/icon-512.png", draw(512, { maskable: false }));
writeFileSync("public/everybox/icon-maskable-512.png", draw(512, { maskable: true }));
writeFileSync("public/everybox/apple-touch-icon.png", draw(180, { maskable: true }));
console.log("icons written");
