import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMPTY_INTAKE, HAIR, HYGIENE, SKIN_EVENING, SKIN_MORNING, SKIN_WEEKLY, styleSuggestions } from "../core/hearth/care.ts";
import { FATHER_BLESSING, FATHER_TEACHES, FATHER_WORDS, IN_HIS_EYES } from "../core/hearth/father.ts";
import { KNOW_TOPICS } from "../core/hearth/know.ts";
import { LETTER_PROMPTS, LITTLE_ROOMS } from "../core/hearth/little.ts";
import { AVAILABLE, BODY, COME_SIT, EQUIPPED, MARRIED, MOTHER_BLESSING, MOTHER_TEACHES, MOTHER_WORDS } from "../core/hearth/mother.ts";
import { buildSystemPrompt, FATHER_VOICE, HEARTH_TASKS, hearthVoiceFor, MOTHER_VOICE, taskPromptFor } from "../convex/coach/prompt.ts";
import { LITTLE_VOICE_NOTES, styleSummary } from "../convex/hearth/pure.ts";
import { availableTools, DOORS_HER, TOOL_INDEX } from "../convex/toolIndex.ts";

const BOOKS = new Set(["genesis", "exodus", "judges", "ruth", "1-samuel", "2-samuel", "1-kings", "2-kings", "esther", "psalms", "proverbs", "song-of-solomon", "isaiah", "zephaniah", "matthew", "mark", "luke", "john", "acts", "romans"]);
const WEIGHT_WORDS = /\b(fat|thin|skinny|slim|pounds|lbs|diet|lose weight|weight loss|calories)\b/i;

describe("The Hearth", () => {
  it("every card key is unique within its shelf and every card has body lines", () => {
    for (const shelf of [FATHER_TEACHES, COME_SIT, MOTHER_TEACHES, MARRIED, AVAILABLE, BODY, SKIN_WEEKLY, HYGIENE]) {
      const keys = shelf.map((c) => c.key);
      assert.equal(new Set(keys).size, keys.length);
      for (const c of shelf) assert.ok(c.body.length >= 3, c.title);
    }
  });
  it("the father's voice never talks about weight or size", () => {
    for (const w of [...FATHER_WORDS.map((w) => w.line), ...IN_HIS_EYES, ...FATHER_BLESSING]) assert.doesNotMatch(w, WEIGHT_WORDS, w);
    assert.match(FATHER_VOICE, /never comment on her weight/i);
    assert.match(HEARTH_TASKS["hearth.eyes"], /Never mention weight/);
    assert.ok(IN_HIS_EYES.length >= 12);
  });
  it("scripture references point at books the built-in Bible has", () => {
    for (const w of [...FATHER_WORDS, ...MOTHER_WORDS]) if (w.ref) assert.ok(BOOKS.has(w.ref.book), w.ref.book);
    for (const e of EQUIPPED) assert.ok(BOOKS.has(e.ref.book), e.name);
    assert.ok(EQUIPPED.length >= 10);
    assert.ok(EQUIPPED.some((e) => e.key === "valor" && /eshet chayil/i.test(e.says)));
  });
  it("the mother's voice is honest about Proverbs 31 and carries the whole table", () => {
    assert.match(MOTHER_VOICE, /woman of valor/);
    for (const word of ["hair", "skin", "hygiene", "married", "submission", "wisdom"]) assert.match(MOTHER_VOICE, new RegExp(word, "i"));
    assert.ok(MOTHER_WORDS.length >= 20 && FATHER_WORDS.length >= 20);
    assert.ok(MOTHER_BLESSING.length >= 5 && FATHER_BLESSING.length >= 5);
  });
  it("hearth tasks all resolve and route to the right parent", () => {
    for (const key of Object.keys(HEARTH_TASKS)) assert.equal(taskPromptFor(key), HEARTH_TASKS[key]);
    assert.equal(hearthVoiceFor("hearth.father"), FATHER_VOICE);
    assert.equal(hearthVoiceFor("hearth.eyes"), FATHER_VOICE);
    assert.equal(hearthVoiceFor("hearth.told"), FATHER_VOICE);
    for (const k of ["hearth.mother", "hearth.sit", "hearth.care", "hearth.know", "hearth.girl", "hearth.teen"]) assert.equal(hearthVoiceFor(k), MOTHER_VOICE, k);
  });
  it("the system prompt carries the voice, what she knows, her style, and the little one", () => {
    const base = { displayName: "Jen", partnerName: "John", faith: true, mySections: [], partnerSections: [], loopSuspected: false };
    const p = buildSystemPrompt({ ...base, hearth: { voice: MOTHER_VOICE, known: ["body: Pacing. Do half and stop."], style: "Colors she reaches for: olive", little: LITTLE_VOICE_NOTES.girl } });
    assert.match(p, /woman of valor/);
    assert.match(p, /Pacing\. Do half and stop\./);
    assert.match(p, /Colors she reaches for: olive/);
    assert.match(p, /five to seven years old/);
    const elsewhere = buildSystemPrompt({ ...base, known: ["marriage: Say it once. Then stop talking."] });
    assert.match(elsewhere, /Say it once\. Then stop talking\./);
    assert.doesNotMatch(elsewhere, /woman of valor/);
  });
  it("style intake summary and suggestions", () => {
    assert.equal(styleSummary(undefined), null);
    assert.equal(styleSummary({}), null);
    const s = styleSummary({ style: { colors: ["Olive and forest greens", "Cream and oat"], sensory: ["Tags"], makeup: "minimal", minutes: "5", notes: "  I like boots " } })!;
    assert.match(s, /Colors she reaches for: Olive and forest greens, Cream and oat/);
    assert.match(s, /Sensory no-gos: Tags/);
    assert.match(s, /In her words: I like boots/);
    const out = styleSuggestions({ ...EMPTY_INTAKE, colors: ["Olive and forest greens", "Rust and terracotta"], avoid: ["Anything tight at the waist", "Heels"], sensory: ["Tags", "Fragrance"], vibe: ["Earthy and easy"], makeup: "minimal", playUp: ["Brows", "Lips"], minutes: "2" });
    const text = out.map((o) => `${o.title}\n${o.lines.join("\n")}`).join("\n");
    assert.match(text, /Warm and earthy/);
    assert.match(text, /Elastic waists/);
    assert.match(text, /Cut every tag/);
    assert.match(text, /Fragrance-free/);
    assert.match(text, /Brows: brushed up/);
    assert.match(text, /Two minutes:/);
    assert.match(text, /Cream products, not powders/);
    const none = styleSuggestions(EMPTY_INTAKE);
    assert.ok(none.length >= 4);
    assert.match(none.map((o) => o.lines.join(" ")).join(" "), /Skin care is your makeup/);
  });
  it("hair cards have real steps with a glyph each and are mostly seated", () => {
    const glyphs = new Set(["wash", "comb", "wet", "pray", "scrunch", "plop", "handsoff", "diffuse", "pineapple", "bonnet", "spray", "clip", "braid", "claw", "bowl", "flat"]);
    assert.ok(HAIR.length >= 10);
    for (const h of HAIR) {
      assert.ok(h.steps.length >= 2, h.title);
      for (const s of h.steps) assert.ok(glyphs.has(s.glyph), `${h.title}: ${s.glyph}`);
    }
    assert.ok(HAIR.filter((h) => h.seated).length >= HAIR.length - 1);
    assert.ok(HAIR.some((h) => h.key === "flax"));
    assert.ok(SKIN_MORNING.length >= 3 && SKIN_EVENING.length >= 3);
  });
  it("the little rooms have ages, prompts for both, and voice notes", () => {
    assert.equal(LITTLE_ROOMS.girl.ages, "five to seven");
    assert.equal(LITTLE_ROOMS.teen.ages, "twelve to sixteen");
    assert.ok(LETTER_PROMPTS.filter((p) => p.who.includes("girl")).length >= 4);
    assert.ok(LETTER_PROMPTS.some((p) => p.kind === "right" && !p.who.includes("girl")));
    assert.equal(LITTLE_ROOMS.teen.voiceNote, LITTLE_VOICE_NOTES.teen);
    assert.ok(KNOW_TOPICS.length >= 10 && new Set(KNOW_TOPICS.map((t) => t.key)).size === KNOW_TOPICS.length);
  });
  it("hearth tools exist only for the room's owner, and a door leads there", () => {
    const hh = TOOL_INDEX.filter((t) => t.room === "hearth");
    assert.ok(hh.length >= 6);
    assert.ok(!availableTools({ metamorphosis: false, reCentered: true }).some((t) => t.room === "hearth"));
    assert.ok(availableTools({ metamorphosis: false, reCentered: true, hearth: true }).some((t) => t.key === "hh.sit"));
    assert.ok(DOORS_HER.some((d) => d.toolKey === "hh.sit"));
  });
});
