// Generates PNG app icons without any native dependencies.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

const bg = [246, 239, 230], heart = [201, 131, 106]
const inHeart = (x, y) => {
  // x,y in [-1,1]; classic heart curve
  const X = x * 1.25, Y = -y * 1.25 + 0.1
  const v = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y
  return v <= 0
}

function makePng(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const r = size * 0.22
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4
      // rounded corners
      const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r)
      const outside = (x - cx) ** 2 + (y - cy) ** 2 > r * r
      let px = bg, a = outside ? 0 : 255
      const nx = (x / size) * 2 - 1, ny = (y / size) * 2 - 1
      if (!outside && inHeart(nx * 1.15, ny * 1.15 - 0.05)) px = heart
      raw[i] = px[0]; raw[i + 1] = px[1]; raw[i + 2] = px[2]; raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}

writeFileSync('public/icon-192.png', makePng(192))
writeFileSync('public/icon-512.png', makePng(512))
writeFileSync('public/apple-touch-icon.png', makePng(180))
console.log('icons written')
