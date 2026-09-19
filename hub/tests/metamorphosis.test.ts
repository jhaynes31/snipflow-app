import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { CHARTER, HEADER } from "../core/metamorphosis/charter.ts";
import { KNOWING } from "../core/metamorphosis/knowing.ts";
import { MENTOR_TASKS, MENTOR_VOICE } from "../convex/coach/prompt.ts";
import { SURVIVAL_SIGNS, WAY_BACK } from "../core/metamorphosis/mirror.ts";
import { SHEET, sessionZero } from "../core/metamorphosis/sheet.ts";
import { STREAM_LABEL, VOICE } from "../core/metamorphosis/voice.ts";
import { findBanned } from "../core/copy/banned.mjs";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";

const index = JSON.parse(readFileSync(new URL("../public/bible/bsb/index.json", import.meta.url), "utf8")) as { books: { slug: string; chapters: number }[] };
const chapters = new Map(index.books.map((b) => [b.slug, b.chapters]));

describe("Metamorphosis content", () => {
  it("every reference points at a real book and chapter", () => {
    for (const r of [...VOICE.map((v) => v.ref), ...KNOWING.map((k) => k.ref)]) {
      assert.ok(chapters.has(r.book), r.book);
      assert.ok(r.chapter >= 1 && r.chapter <= chapters.get(r.book)!, `${r.book} ${r.chapter}`);
    }
  });
  it("the Father's Voice rotates all three streams and is never tied to yesterday", () => {
    for (const stream of Object.keys(STREAM_LABEL)) assert.ok(VOICE.filter((v) => v.stream === stream).length >= 8, stream);
    assert.ok(VOICE.length >= 30);
  });
  it("uses none of the words the room forbids", () => {
    const text = [
      HEADER.verse, HEADER.note,
      ...CHARTER.flatMap((c) => [c.gives, c.here]),
      ...VOICE.map((v) => v.line),
      ...KNOWING.flatMap((k) => [k.shows, k.toYou]),
      ...SHEET.flatMap((q) => [q.label, q.hint]),
      ...SURVIVAL_SIGNS,
      ...WAY_BACK.flatMap((w) => [w.step, w.why]),
    ].join("\n");
    assert.deepEqual(findBanned(text), []);
    for (const bad of [/boy to man/i, /step up/i, /real men/i, /\byou should\b/i, /man up/i]) assert.doesNotMatch(text, bad);
  });
  it("Session Zero is a handful, and the hardest question is not in it", () => {
    assert.ok(sessionZero().length >= 4 && sessionZero().length <= 6);
    assert.ok(!sessionZero().some((q) => q.key === "fatherWish"));
  });
  it("the Way Back starts with water", () => {
    assert.match(WAY_BACK[0].step, /water/i);
  });
  it("the mentor's voice forbids shame and comparison and knows survival", () => {
    assert.match(MENTOR_VOICE, /Never shame/);
    assert.match(MENTOR_VOICE, /Never compare him/);
    assert.match(MENTOR_VOICE, /survival/);
    assert.match(MENTOR_TASKS["metamorphosis.landing"], /Listen first/);
    assert.match(MENTOR_TASKS["metamorphosis.horizon"], /Never turn a dream into a task/);
  });
  it("theme text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#3D5A73") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#8FB3CF") >= AA_NORMAL_TEXT);
  });
});
