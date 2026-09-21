import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FOUNDATIONS, moved, pickForToday, trendLines } from "../convex/renewedMind/pure.ts";

const beliefs = [
  { _id: "a", newLine: "I am not too much.", createdAt: 1 },
  { _id: "b", newLine: "Rest is allowed.", createdAt: 2 },
  { _id: "c", newLine: "I can say no.", createdAt: 3 },
];

describe("renewed mind", () => {
  it("picks the least recently rehearsed line, and stays put once answered today", () => {
    assert.equal(pickForToday([], [], "2026-09-21"), null);
    const first = pickForToday(beliefs, [], "2026-09-21")!;
    assert.ok(first);
    assert.equal(pickForToday(beliefs, [], "2026-09-21")!._id, first._id, "same day, same pick");
    const r = [{ beliefId: "a", feltTrue: "aLittle" as const, day: "2026-09-20" }, { beliefId: "b", feltTrue: "notYet" as const, day: "2026-09-19" }];
    assert.equal(pickForToday(beliefs, r, "2026-09-21")!._id, "c", "never rehearsed comes first");
    const r2 = [...r, { beliefId: "c", feltTrue: "mostly" as const, day: "2026-09-18" }];
    assert.equal(pickForToday(beliefs, r2, "2026-09-21")!._id, "c", "oldest rehearsal comes back");
    const r3 = [...r2, { beliefId: "a", feltTrue: "mostly" as const, day: "2026-09-21" }];
    assert.equal(pickForToday(beliefs, r3, "2026-09-21")!._id, "a", "answered today stays today's line");
  });
  it("tells the season how each line moved, in the person's words", () => {
    const r = [
      { beliefId: "a", feltTrue: "notYet" as const, day: "2026-09-01" },
      { beliefId: "a", feltTrue: "aLittle" as const, day: "2026-09-08" },
      { beliefId: "a", feltTrue: "mostly" as const, day: "2026-09-15" },
      { beliefId: "b", feltTrue: "notYet" as const, day: "2026-09-03" },
    ];
    const lines = trendLines(beliefs, r);
    assert.deepEqual(lines.map((l) => [l.line, l.first, l.last, l.times]), [["I am not too much.", "notYet", "mostly", 3], ["Rest is allowed.", "notYet", "notYet", 1]]);
    assert.equal(moved("notYet", "mostly"), "up");
    assert.equal(moved("mostly", "aLittle"), "down");
    assert.equal(moved("aLittle", "aLittle"), "same");
  });
  it("stands on the scriptures Jen named", () => {
    const refs = FOUNDATIONS.map((f) => f.ref);
    for (const r of ["Proverbs 23:7", "Romans 12:2", "2 Corinthians 10:5", "Philippians 4:8", "Ephesians 4:22-24"]) assert.ok(refs.includes(r), r);
  });
});

import { ARENA_LABEL, extractSteps, suggestFor, THEMES } from "../convex/renewedMind/library.ts";

describe("live it", () => {
  it("every theme covers the arenas Jen named and has enough steps", () => {
    for (const t of THEMES) {
      assert.ok(t.steps.length >= 5, t.key);
      for (const s of t.steps) assert.ok(s.arena in ARENA_LABEL && s.text.length > 20, t.key);
    }
    const arenas = new Set(THEMES.flatMap((t) => t.steps.map((s) => s.arena)));
    for (const a of ["marriage", "outside", "friends", "work", "faith"]) assert.ok(arenas.has(a as never), a);
  });
  it("matches a person's own words to themes", () => {
    assert.equal(suggestFor("I'm too much for people.", "I am not too much.")[0]?.key, "tooMuch");
    assert.equal(suggestFor("If I don't handle it, everything falls apart.", "Others can carry things.")[0]?.key, "fixEverything");
    assert.equal(suggestFor("I always say yes when I mean no.", "My no is allowed.")[0]?.key, "cantSayNo");
    assert.deepEqual(suggestFor("xyzzy", "qwerty"), []);
  });
  it("turns the coach's bullets into steps with arenas", () => {
    const reply = "Here are five.\n- [Marriage] Tell John one need in full.\n2. [Friends] Invite one person for coffee Thursday at ten.\n* [With God] Pray out loud for two minutes.\n- too short\nPick one.";
    const steps = extractSteps(reply);
    assert.deepEqual(steps.map((s) => s.arena), ["marriage", "friends", "faith"]);
    assert.equal(steps[0].text, "Tell John one need in full.");
    assert.equal(extractSteps("No bullets here.").length, 0);
  });
});
