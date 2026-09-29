import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSystemPrompt } from "../convex/coach/prompt.ts";
import { AREA_LABEL, BODY_AREAS, coreOf, feltText, movementFor, patternLine, patterns, SENSATIONS, WHEEL } from "../core/felt/wheel.ts";
import { DOORS_HER, DOORS_JOHN, toolByKey } from "../convex/toolIndex.ts";

describe("Felt: the wheel and the body", () => {
  it("the wheel has seven cores with unique finer words inside each core", () => {
    assert.equal(WHEEL.length, 7);
    for (const c of WHEEL) {
      const words = c.ring.flatMap((r) => [r.word, ...r.words]);
      assert.equal(new Set(words).size, words.length, c.key);
      assert.ok(c.ring.length >= 4, c.key);
      for (const r of c.ring) assert.ok(r.body.length >= 2 && r.body.every((w) => w.length <= 14), `${c.key}/${r.word}`);
    }
    assert.equal(coreOf("betrayed")?.key, "angry");
    assert.equal(coreOf("Calm")?.key, "calm");
    assert.equal(coreOf("banana"), undefined);
    assert.ok(SENSATIONS.length >= 15 && new Set(SENSATIONS).size === SENSATIONS.length);
  });
  it("body areas cover front and back and every one has a label", () => {
    assert.ok(BODY_AREAS.filter((a) => a.view === "front").length >= 14);
    assert.ok(BODY_AREAS.filter((a) => a.view === "back").length >= 7);
    for (const a of BODY_AREAS) assert.ok(AREA_LABEL[a.key], a.key);
    assert.equal(AREA_LABEL.whole, "All over");
  });
  it("the words that land in a field read like a sentence", () => {
    assert.equal(feltText({ feelings: ["anxious", "unheard"], body: [{ area: "throat", words: ["tight"], note: "like a fist" }, { area: "gut", words: [] }] }), "anxious, unheard. throat: tight; like a fist. gut and low belly");
    assert.equal(feltText({ feelings: [], body: [], note: " just off " }), "just off");
  });
  it("patterns are plain counts, with a sentence once there are three", () => {
    const t = (d: number, h: number) => Date.UTC(2026, 8, d, h);
    const rows = [
      { feelings: ["scared", "anxious"], body: [{ area: "chest", words: ["tight"] }], createdAt: t(1, 20) },
      { feelings: ["scared"], body: [{ area: "chest", words: ["tight", "heavy"] }, { area: "throat", words: ["tight"] }], createdAt: t(2, 21) },
      { feelings: ["sad"], body: [{ area: "chest", words: ["hollow"] }], createdAt: t(3, 9) },
    ];
    const p = patterns(rows, (ms) => new Date(ms).getUTCHours());
    assert.equal(p.entries, 3);
    assert.equal(p.areas[0].area, "chest");
    assert.equal(p.areas[0].times, 3);
    assert.equal(p.areas[0].feelings[0].word, "scared");
    assert.equal(p.areas[0].words[0].word, "tight");
    assert.equal(p.timesOfDay[0].part, "evening");
    assert.match(patternLine(p)!, /^Chest shows up most \(3 of 3\), mostly with scared, mostly in the evening\./);
    assert.equal(patternLine(patterns(rows.slice(0, 2))), null);
    assert.equal(movementFor(p)?.key, "fitness.somatic");
    assert.equal(movementFor(patterns([])), null);
  });
  it("the coach sees recent entries and the front desk has a door", () => {
    const base = { displayName: "Jen", partnerName: "John", faith: true, mySections: [], partnerSections: [], loopSuspected: false };
    const p = buildSystemPrompt({ ...base, felt: ["2026-09-28: anxious; body: throat (tight)"] });
    assert.match(p, /feelings wheel/);
    assert.match(p, /throat \(tight\)/);
    assert.ok(toolByKey("hub.felt"));
    assert.ok(DOORS_HER.some((d) => d.toolKey === "hub.felt") && DOORS_JOHN.some((d) => d.toolKey === "hub.felt"));
  });
});
