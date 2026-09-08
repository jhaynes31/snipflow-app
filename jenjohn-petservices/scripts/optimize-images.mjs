/**
 * Image optimizer for Jen & John's Pet Services.
 * Converts the pet gallery JPGs + logo + about photo (from the originals backup
 * at /home/team/shared/pets-originals/) to resized WebP in public/.
 *
 * Orientation handling: 13 of the 15 pet JPGs carry EXIF orientation = 6
 * (rotate 90°). Browsers honor that tag for JPGs, so the old JPGs rendered
 * correctly, but the previous WebP conversion dropped the tag without baking the
 * rotation into the pixels, so the WebP files render sideways. This script:
 *   - calls .rotate() (no args = apply EXIF orientation to pixels) BEFORE resize
 *   - writes .withMetadata({ orientation: 1 }) so no rotation flag survives in
 *     the output WebP.
 *
 * Usage: cd /home/team/shared/site && bun scripts/optimize-images.mjs
 */
import { readdir, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import sharp from "sharp";

const ORIGINALS = "/home/team/shared/pets-originals"; // untouched backup
const PUBLIC = new URL("../public/", import.meta.url).pathname;

/**
 * @type {Array<{srcDir: string, outDir: string, pattern: RegExp, exclude?: string[], ext: string, size: number, quality: number}>}
 */
const JOBS = [
  // pet gallery: all pet JPGs in the originals backup -> public/pets/*.webp,
  // 600px longest side, fit inside, no upscale, q78. (about-photo.jpg lives in
  // the same backup dir, handled by its own job below.)
  {
    srcDir: ORIGINALS,
    outDir: join(PUBLIC, "pets"),
    pattern: /\.jpg$/i,
    exclude: ["about-photo.jpg"],
    ext: ".jpg",
    size: 600,
    quality: 78,
  },
  // logo: logo.png -> public/logo.webp, 400px longest side
  {
    srcDir: ORIGINALS,
    outDir: PUBLIC,
    pattern: /^logo\.png$/i,
    ext: ".png",
    size: 400,
    quality: 80,
  },
  // about photo: about-photo.jpg -> public/about-photo.webp, 800px longest side, q75
  // (q80 made it bigger than the original jpg; q75 is smaller and visually identical)
  {
    srcDir: ORIGINALS,
    outDir: PUBLIC,
    pattern: /^about-photo\.jpg$/i,
    ext: ".jpg",
    size: 800,
    quality: 75,
  },
];

let totalBefore = 0;
let totalAfter = 0;
const rows = [];

for (const job of JOBS) {
  const files = (await readdir(job.srcDir)).filter(
    (f) => job.pattern.test(f) && !(job.exclude ?? []).includes(f)
  );
  for (const file of files) {
    const inputPath = join(job.srcDir, file);
    const outPath = join(job.outDir, basename(file, job.ext) + ".webp");
    const before = (await stat(inputPath)).size;

    const img = sharp(inputPath);
    const meta = await img.metadata();
    // .rotate() with no args bakes EXIF orientation into the pixels; a no-op
    // for files without an orientation tag (Cat.jpg, Christmas Yorkie.jpg).
    const resized = img
      .rotate()
      .resize({ width: job.size, height: job.size, fit: "inside", withoutEnlargement: true })
      .webp({ quality: job.quality })
      .withMetadata({ orientation: 1 }); // strip rotation flag from output

    await resized.toFile(outPath);
    const after = (await stat(outPath)).size;
    const outMeta = await sharp(outPath).metadata();
    const outOrientation = outMeta.orientation ?? "none";

    totalBefore += before;
    totalAfter += after;
    rows.push({
      name: file,
      inOrient: meta.orientation ?? "none",
      outOrient: outOrientation,
      dims: `${meta.width}x${meta.height} -> ${outMeta.width}x${outMeta.height}`,
      before,
      after,
      pct: (100 * (1 - after / before)).toFixed(1),
    });
  }
}

console.log("file | in-orientation | out-orientation | dims | before | after | reduction");
for (const r of rows.sort((a, b) => b.before - a.before)) {
  console.log(
    `${r.name} | ${r.inOrient} | ${r.outOrient} | ${r.dims} | ${(r.before / 1024).toFixed(0)} KB | ${(r.after / 1024).toFixed(0)} KB | ${r.pct}%`
  );
}
console.log("\nTOTALS");
console.log(`before: ${(totalBefore / 1024 / 1024).toFixed(2)} MB`);
console.log(`after:  ${(totalAfter / 1024 / 1024).toFixed(2)} MB`);
console.log(`reduction: ${(100 * (1 - totalAfter / totalBefore)).toFixed(1)}%`);
console.log("\nNOTE: orientation applied to pixels via .rotate() before resize; output");
console.log("written with .withMetadata({ orientation: 1 }) so no rotation flag remains.");
