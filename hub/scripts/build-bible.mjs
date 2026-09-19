/**
 * One-time build of the Bible text The Well reads. Source: the Berean
 * Standard Bible (public domain), as JSON from the scrollmapper/bible_databases
 * repository (MIT). Run with the path to that BSB.json:
 *
 *   node scripts/build-bible.mjs /path/to/BSB.json
 *
 * Writes public/bible/bsb/index.json (books, chapter counts, testament) and
 * one small file per book, so the reader loads a chapter at a time.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/build-bible.mjs <BSB.json>");
  process.exit(1);
}
const data = JSON.parse(readFileSync(src, "utf8"));

const RENAME = {
  "I Samuel": "1 Samuel", "II Samuel": "2 Samuel", "I Kings": "1 Kings", "II Kings": "2 Kings",
  "I Chronicles": "1 Chronicles", "II Chronicles": "2 Chronicles", "I Corinthians": "1 Corinthians",
  "II Corinthians": "2 Corinthians", "I Thessalonians": "1 Thessalonians", "II Thessalonians": "2 Thessalonians",
  "I Timothy": "1 Timothy", "II Timothy": "2 Timothy", "I Peter": "1 Peter", "II Peter": "2 Peter",
  "I John": "1 John", "II John": "2 John", "III John": "3 John", "Revelation of John": "Revelation",
};

const outDir = join(process.cwd(), "public", "bible", "bsb");
mkdirSync(outDir, { recursive: true });

const index = [];
data.books.forEach((book, i) => {
  const name = RENAME[book.name] ?? book.name;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const chapters = book.chapters.map((ch) => ch.verses.map((v) => v.text.trim()));
  writeFileSync(join(outDir, `${slug}.json`), JSON.stringify({ name, slug, chapters }));
  index.push({ name, slug, testament: i < 39 ? "old" : "new", chapters: chapters.length });
});
writeFileSync(join(outDir, "index.json"), JSON.stringify({ translation: "Berean Standard Bible", abbrev: "BSB", books: index }));
console.log(`Wrote ${index.length} books to ${outDir}`);
