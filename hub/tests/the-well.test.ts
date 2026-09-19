import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { BOOK_GUIDES } from "../core/well/books.ts";
import { LIES } from "../core/well/lies.ts";
import { DEFAULT_PERMISSIONS, LAMENT_PSALMS, TOGETHER_QUESTIONS } from "../core/well/permissions.ts";
import { parseRef, refHref, refLabel, sliceVerses } from "../core/well/refs.ts";
import { TODAY } from "../core/well/today.ts";
import { WAYS } from "../core/well/ways.ts";
import { findBanned } from "../core/copy/banned.mjs";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";
import { alignVerses, builtInTranslations, TRANSLATIONS } from "../core/well/translations.ts";

const index = JSON.parse(readFileSync(new URL("../public/bible/bsb/index.json", import.meta.url), "utf8")) as { books: { slug: string; chapters: number }[] };
const chapters = new Map(index.books.map((b) => [b.slug, b.chapters]));

describe("The Well content", () => {
  it("has a Where am I card for all 66 books and no others", () => {
    assert.equal(BOOK_GUIDES.length, 66);
    for (const g of BOOK_GUIDES) assert.ok(chapters.has(g.slug), g.slug);
    for (const g of BOOK_GUIDES) assert.ok(g.start.chapter <= chapters.get(g.slug)!, `${g.slug} start`);
  });
  it("every reference points at a real book and chapter", () => {
    const refs = [...TODAY.map((t) => t.ref), ...WAYS.flatMap((w) => w.passages.map((p) => p.ref)), ...LIES.map((l) => l.ref)];
    assert.ok(refs.length > 60);
    for (const r of refs) {
      assert.ok(chapters.has(r.book), r.book);
      assert.ok(r.chapter >= 1 && r.chapter <= chapters.get(r.book)!, `${r.book} ${r.chapter}`);
      if (r.from && r.to) assert.ok(r.to >= r.from);
    }
    for (const p of LAMENT_PSALMS) assert.ok(p.chapter <= 150);
  });
  it("Today is mostly the Gospels", () => {
    const gospels = TODAY.filter((t) => ["matthew", "mark", "luke", "john"].includes(t.ref.book)).length;
    assert.ok(gospels / TODAY.length > 0.9);
    assert.ok(TODAY.length >= 40);
  });
  it("uses no shame language and no counting language", () => {
    const text = [
      ...TODAY.flatMap((t) => [t.did, t.question]),
      ...WAYS.flatMap((w) => [w.title, w.line, ...w.passages.map((p) => p.note)]),
      ...LIES.flatMap((l) => [l.lie, l.truth]),
      ...BOOK_GUIDES.flatMap((g) => [g.who, g.toWhom, g.why, g.jesus]),
      ...DEFAULT_PERMISSIONS,
      ...TOGETHER_QUESTIONS,
    ].join("\n");
    assert.deepEqual(findBanned(text), []);
    assert.doesNotMatch(text, /quiet time/i);
    assert.doesNotMatch(text, /days in a row/i);
  });
});

describe("references", () => {
  it("labels and links", () => {
    assert.equal(refLabel({ book: "john", chapter: 3, from: 16 }, "John"), "John 3:16");
    assert.equal(refLabel({ book: "john", chapter: 3, from: 16, to: 18 }, "John"), "John 3:16-18");
    assert.equal(refLabel({ book: "psalms", chapter: 23 }, "Psalms"), "Psalms 23");
    assert.equal(refHref({ book: "john", chapter: 3, from: 16 }), "/the-well/bible/john/3#v16");
  });
  it("parses what a person types", () => {
    assert.deepEqual(parseRef("john 8:10-11"), { book: "john", chapter: 8, from: 10, to: 11 });
    assert.deepEqual(parseRef("1 John 4:18"), { book: "1-john", chapter: 4, from: 18, to: undefined });
    assert.deepEqual(parseRef("Psalms 23"), { book: "psalms", chapter: 23, from: undefined, to: undefined });
    assert.equal(parseRef("nonsense"), null);
  });
  it("slices verses", () => {
    const ch = ["a", "b", "c", "d"];
    assert.deepEqual(sliceVerses(ch, { book: "x", chapter: 1, from: 2, to: 3 }).map((v) => v.n), [2, 3]);
    assert.deepEqual(sliceVerses(ch, { book: "x", chapter: 1 }).map((v) => v.n), [1, 2, 3, 4]);
    assert.deepEqual(sliceVerses(ch, { book: "x", chapter: 1, from: 4, to: 9 }).map((v) => v.n), [4]);
  });
});

describe("The Well theme", () => {
  it("text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#2F6E8A") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#7FB6CF") >= AA_NORMAL_TEXT);
  });
});

describe("translations", () => {
  it("every built-in translation has all 66 books on disk with matching chapter counts", () => {
    for (const t of builtInTranslations()) {
      const idx = JSON.parse(readFileSync(new URL(`../public/bible/${t.code}/index.json`, import.meta.url), "utf8")) as { books: { slug: string; chapters: number }[] };
      assert.equal(idx.books.length, 66, t.code);
      for (const b of idx.books) assert.equal(b.chapters, chapters.get(b.slug), `${t.code} ${b.slug}`);
    }
  });
  it("keyed translations name the key they need and are never hidden", () => {
    for (const t of TRANSLATIONS.filter((x) => !x.builtIn)) assert.ok(t.needsKey, t.code);
    assert.equal(TRANSLATIONS.length, 6);
  });
  it("aligns verses by number and leaves blanks where a translation lacks one", () => {
    const rows = alignVerses([["a1", "a2", "a3"], ["b1", "b2"], null]);
    assert.equal(rows.length, 3);
    assert.deepEqual(rows[2].texts, ["a3", null, null]);
  });
});
