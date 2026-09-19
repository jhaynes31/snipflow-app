import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, daysUntilTender, forecastFrom, inWindow, noticePatterns, type DayPoint } from "../convex/tend/patterns.ts";

describe("cycle forecast", () => {
  it("assumes 28 days with one start, and rolls forward past today", () => {
    const f = forecastFrom(["2026-08-01"], 5, 2, "2026-09-19");
    assert.ok(f);
    assert.equal(f.averageLength, 28);
    assert.equal(f.nextStart, "2026-09-26");
    assert.equal(f.tenderStart, "2026-09-21");
    assert.equal(f.tenderEnd, "2026-09-28");
    assert.equal(daysUntilTender("2026-09-19", f), 2);
  });
  it("learns the average from recent gaps and ignores wild ones", () => {
    const f = forecastFrom(["2026-05-01", "2026-05-31", "2026-06-29", "2026-09-01"], 5, 2, "2026-09-19");
    assert.ok(f);
    assert.equal(f.averageLength, 30); // 30, 29 kept; the 64-day gap ignored
    assert.equal(f.nextStart, "2026-10-01");
    assert.equal(inWindow("2026-09-27", f), true);
    assert.equal(inWindow("2026-09-19", f), false);
  });
  it("returns null with nothing logged", () => {
    assert.equal(forecastFrom([], 5, 2, "2026-09-19"), null);
  });
  it("adds days across month ends", () => {
    assert.equal(addDays("2026-09-29", 3), "2026-10-02");
  });
});

describe("pattern notices", () => {
  const day = (i: number, weather: number | null, energy: number | null, sleep: number | null): DayPoint => ({ day: addDays("2026-09-01", i), weather, energy, sleep });
  it("notices several low days in a row", () => {
    const pts = [day(0, 4, 3, 7), day(1, 2, 3, 7), day(2, 1, 2, 7), day(3, 2, 2, 7)];
    const n = noticePatterns(pts);
    assert.equal(n.length, 1);
    assert.equal(n[0].key, "lowRun");
    assert.ok(!/diagnos/i.test(n[0].text));
  });
  it("notices short sleep with rising energy", () => {
    const pts = [day(0, 4, 3, 7), day(1, 4, 4, 5), day(2, 4, 4, 5.5), day(3, 5, 5, 4)];
    const keys = noticePatterns(pts).map((x) => x.key);
    assert.ok(keys.includes("shortSleepHighEnergy"));
  });
  it("stays quiet on an ordinary stretch", () => {
    const pts = [day(0, 4, 3, 7), day(1, 3, 3, 8), day(2, 5, 4, 7), day(3, 2, 2, 7)];
    assert.deepEqual(noticePatterns(pts), []);
  });
});
