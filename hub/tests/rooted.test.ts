import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANCHORS, EARNED, PRACTICES, PROTESTS, SCRIPTS, STYLES, TELLS, TRAP, TRIPWIRE_STARTERS, WATCH_TIMELINE } from "../core/rooted/content.ts";
import { failSafesText, leanOf, readRootedSettings } from "../convex/rooted/pure.ts";

describe("Rooted content", () => {
  it("covers the four styles, each with the same shape and a faith line", () => {
    assert.deepEqual(STYLES.map((s) => s.key), ["secure", "anxious", "avoidant", "disorganized"]);
    for (const s of STYLES) {
      assert.ok(s.sections.length >= 5, s.key);
      assert.match(s.faith.ref, /^[1-3]? ?[A-Z][a-z]+ \d+(:\d+(-\d+)?)?$/, s.faith.ref);
      for (const sec of s.sections) assert.ok(sec.body.length > 80, `${s.key}: ${sec.title}`);
    }
    assert.ok(TRAP.sections.length >= 3 && EARNED.sections.length >= 3);
  });
  it("gives every tell a fair exception and a secure contrast, across all three windows", () => {
    assert.ok(TELLS.length >= 10);
    for (const t of TELLS) {
      assert.ok(t.exception.length > 10, t.key);
      assert.ok(t.secure.length > 10, t.key);
    }
    assert.deepEqual([...new Set(TELLS.map((t) => t.window))].sort(), ["later", "months", "weeks"]);
    assert.equal(WATCH_TIMELINE.length, 3);
  });
  it("pairs every protest behavior with a secure move and never shames", () => {
    for (const p of PROTESTS) {
      assert.ok(p.secureMove.length > 20, p.key);
      assert.ok(!/you should have|pathetic|crazy/i.test(p.secureMove + p.looksLike), p.key);
    }
    assert.ok(PRACTICES.every((p) => p.how.length >= 3));
    assert.ok(SCRIPTS.length >= 6 && TRIPWIRE_STARTERS.length >= 4 && ANCHORS.length >= 5);
  });
  it("never uses weight or appearance words anywhere", () => {
    const all = JSON.stringify({ STYLES, TRAP, EARNED, PROTESTS, PRACTICES, SCRIPTS, TELLS });
    assert.ok(!/\b(fat|thin|skinny|weight|diet|pounds)\b/i.test(all));
  });
});

describe("Rooted settings", () => {
  it("reads with safe defaults and trims lists", () => {
    assert.deepEqual(readRootedSettings(undefined), { vow: "", tripwires: [], checklist: [] });
    assert.deepEqual(readRootedSettings({ rooted: { vow: "x", tripwires: ["a", " ", 3, "b "], checklist: "nope" } }), { vow: "x", tripwires: ["a", "b"], checklist: [] });
  });
  it("names the lean and writes the fail safes for the coach", () => {
    assert.equal(leanOf({ secure: 1, anxious: 3, avoidant: 0, disorganized: 3 }), "anxious and disorganized");
    assert.equal(leanOf({ secure: 0, anxious: 0, avoidant: 0, disorganized: 0 }), "quiet");
    const lines = failSafesText({ vow: "Slow.", tripwires: ["If a, then b."], checklist: [] });
    assert.equal(lines.length, 2);
    assert.match(lines[1], /"If a, then b\."/);
    assert.deepEqual(failSafesText({ vow: "", tripwires: [], checklist: [] }), []);
  });
});
