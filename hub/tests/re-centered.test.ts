import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";
import { daysOfMonth, exportRoom, pickForDay, readReCenteredSettings } from "../convex/reCentered/pure.ts";

describe("Re-Centered helpers", () => {
  it("lists the days of a month", () => {
    assert.equal(daysOfMonth(2026, 2).length, 28);
    assert.equal(daysOfMonth(2028, 2).length, 29);
    assert.equal(daysOfMonth(2026, 9)[0], "2026-09-01");
    assert.equal(daysOfMonth(2026, 9).at(-1), "2026-09-30");
  });
  it("picks the same way back in all day and nothing from nothing", () => {
    const items = ["a", "b", "c"];
    assert.equal(pickForDay(items, "2026-09-19"), pickForDay(items, "2026-09-19"));
    assert.equal(pickForDay([], "2026-09-19"), null);
    const picks = new Set(["2026-09-19", "2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23"].map((d) => pickForDay(items, d)));
    assert.ok(picks.size > 1);
  });
  it("reads settings with safe defaults", () => {
    assert.deepEqual(readReCenteredSettings(undefined), { boundaries: "", ifThen: "" });
    assert.equal(readReCenteredSettings({ reCentered: { boundaries: "x", ifThen: 3 } }).ifThen, "");
  });
  it("exports only the person's own words", () => {
    const text = exportRoom({
      name: "Jen",
      settings: { boundaries: "I won't remind.", ifThen: "I go anyway." },
      sorts: [{ createdAt: 0, text: "Missed the call", whose: "theirs" }, { createdAt: 0, text: "The leak", whose: "ours", myPart: "Pick a day", theirPart: "Call the plumber" }],
      pauses: [],
      landings: [{ createdAt: 0, text: "Let the bill sit", after: "Shaky, then fine" }],
      taps: [{ day: "2026-09-19", where: "self" }],
      ownLife: [{ area: "Faith", wayBackIn: "Psalm 23" }],
      keptByMe: [{ createdAt: 0, text: "Went to dinner" }],
    });
    assert.match(text, /Jen's room/);
    assert.match(text, /Theirs to carry/);
    assert.match(text, /Ours: a piece each/);
    assert.match(text, /Their part: Call the plumber/);
    assert.match(text, /In me and God/);
    assert.match(text, /Went to dinner/);
    assert.doesNotMatch(text, /John/);
  });
  it("theme text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#6B5B8E") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#B3A2D6") >= AA_NORMAL_TEXT);
  });
});
