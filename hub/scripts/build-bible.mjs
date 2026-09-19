/**
 * One-time build of the Bible texts The Well reads. All public domain:
 *
 *   BSB  Berean Standard Bible          scrollmapper/bible_databases formats/json/BSB.json
 *   ASV  American Standard Version 1901 scrollmapper/bible_databases formats/json/ASV.json
 *   KJV  King James Version             thiagobodruk/bible json/en_kjv.json
 *
 *   node scripts/build-bible.mjs BSB /path/to/BSB.json
 *   node scripts/build-bible.mjs KJV /path/to/en_kjv.json
 *
 * Writes public/bible/<code>/index.json (books, chapter counts, testament)
 * and one small file per book, so the reader loads a chapter at a time.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [code, src] = process.argv.slice(2);
if (!code || !src) {
  console.error("Usage: node scripts/build-bible.mjs <BSB|ASV|KJV> <source.json>");
  process.exit(1);
}
const NAMES = { BSB: "Berean Standard Bible", ASV: "American Standard Version (1901)", KJV: "King James Version" };
const raw = readFileSync(src, "utf8").replace(/^﻿/, "");
const data = JSON.parse(raw);

const RENAME = {
  "I Samuel": "1 Samuel", "II Samuel": "2 Samuel", "I Kings": "1 Kings", "II Kings": "2 Kings",
  "I Chronicles": "1 Chronicles", "II Chronicles": "2 Chronicles", "I Corinthians": "1 Corinthians",
  "II Corinthians": "2 Corinthians", "I Thessalonians": "1 Thessalonians", "II Thessalonians": "2 Thessalonians",
  "I Timothy": "1 Timothy", "II Timothy": "2 Timothy", "I Peter": "1 Peter", "II Peter": "2 Peter",
  "I John": "1 John", "II John": "2 John", "III John": "3 John", "Revelation of John": "Revelation",
  "Song of Songs": "Song of Solomon",
};

// Two source shapes: { books: [{ name, chapters: [{ verses: [{ text }] }] }] } and [{ name, chapters: [[text]] }].
const books = Array.isArray(data)
  ? data.map((b) => ({ name: b.name, chapters: b.chapters.map((ch) => ch.map((t) => String(t).trim())) }))
  : data.books.map((b) => ({ name: b.name, chapters: b.chapters.map((ch) => ch.verses.map((v) => String(v.text).trim())) }));
if (books.length !== 66) throw new Error(`Expected 66 books, got ${books.length}`);

const outDir = join(process.cwd(), "public", "bible", code.toLowerCase());
mkdirSync(outDir, { recursive: true });

const index = [];
books.forEach((book, i) => {
  const name = RENAME[book.name] ?? book.name;
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  writeFileSync(join(outDir, `${slug}.json`), JSON.stringify({ name, slug, chapters: book.chapters }));
  index.push({ name, slug, testament: i < 39 ? "old" : "new", chapters: book.chapters.length });
});
writeFileSync(join(outDir, "index.json"), JSON.stringify({ translation: NAMES[code] ?? code, abbrev: code, books: index }));
console.log(`Wrote ${index.length} books to ${outDir}`);
