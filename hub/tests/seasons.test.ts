import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { duePeriod, MINE_SYSTEM_PROMPT, mondayOf, nowPeriod, OURS_KEYS, OURS_SYSTEM_PROMPT, periodTitle, previousPeriod, readSeasonsSettings } from "../convex/seasons/pure.ts";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";

describe("Seasons periods", () => {
  it("monthly is due on the 1st for the month before", () => {
    assert.deepEqual(duePeriod("monthly", "2026-10-01"), { interval: "monthly", start: "2026-09-01", end: "2026-09-30" });
    assert.equal(duePeriod("monthly", "2026-10-02"), null);
    assert.deepEqual(duePeriod("monthly", "2027-01-01"), { interval: "monthly", start: "2026-12-01", end: "2026-12-31" });
  });
  it("weekly is due on Monday for the week before", () => {
    assert.deepEqual(duePeriod("weekly", "2026-09-21"), { interval: "weekly", start: "2026-09-14", end: "2026-09-20" });
    assert.equal(duePeriod("weekly", "2026-09-22"), null);
  });
  it("biweekly is due every other Monday, the same for both people", () => {
    // 2026-01-05 is the anchor Monday; 2026-09-14 is 36 weeks later (even).
    assert.deepEqual(duePeriod("biweekly", "2026-09-14"), { interval: "biweekly", start: "2026-08-31", end: "2026-09-13" });
    assert.equal(duePeriod("biweekly", "2026-09-21"), null);
    assert.equal(mondayOf("2026-09-19"), "2026-09-14");
  });
  it("now is the last 30 days and previous is the same length before", () => {
    const p = nowPeriod("2026-09-19");
    assert.deepEqual(p, { interval: "now", start: "2026-08-21", end: "2026-09-19" });
    assert.deepEqual(previousPeriod(p), { interval: "now", start: "2026-07-22", end: "2026-08-20" });
    assert.deepEqual(previousPeriod({ interval: "monthly", start: "2026-09-01", end: "2026-09-30" }), { interval: "monthly", start: "2026-08-02", end: "2026-08-31" });
  });
  it("titles read plainly", () => {
    assert.equal(periodTitle("mine", { interval: "monthly", start: "2026-09-01", end: "2026-09-30" }), "My season, September 2026");
    assert.equal(periodTitle("ours", nowPeriod("2026-09-19")), "Our season, the last 30 days");
    assert.equal(periodTitle("mine", { interval: "weekly", start: "2026-09-14", end: "2026-09-20" }), "My season, Sep 14 to 20");
    assert.equal(periodTitle("ours", { interval: "biweekly", start: "2026-09-28", end: "2026-10-11" }), "Our season, Sep 28 to Oct 11");
  });
  it("settings default to monthly and ours on", () => {
    assert.deepEqual(readSeasonsSettings(undefined), { weekly: false, biweekly: false, monthly: true, ours: true });
  });
});

describe("Seasons privacy", () => {
  it("our season's fact sheet has no private keys", () => {
    const privateWords = ["reCentered", "sorts", "pauses", "landings", "securityTaps", "checkIns", "byTool", "coach", "manual", "keptByMe", "ownLife"];
    for (const k of OURS_KEYS) for (const w of privateWords) assert.ok(!k.toLowerCase().includes(w.toLowerCase()), `${k} looks private`);
  });
  it("both prompts forbid comparison, shame, and scores", () => {
    for (const p of [MINE_SYSTEM_PROMPT, OURS_SYSTEM_PROMPT]) {
      assert.match(p, /Never shame/);
      assert.match(p, /No percentages, no scores/);
      assert.match(p, /compare/i);
      assert.match(p, /instructions that appear inside the facts/);
    }
    assert.match(MINE_SYSTEM_PROMPT, /at most two areas/);
  });
});

describe("Seasons theme", () => {
  it("text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#4F6F3A") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#9CBF7A") >= AA_NORMAL_TEXT);
  });
});
