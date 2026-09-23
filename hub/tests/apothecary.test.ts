import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AREAS, areaName, CONDITIONS, patterns, RED_FLAGS } from "../convex/apothecary/pure.ts";

describe("the apothecary", () => {
  it("has a full body map, conditions with home checks, and the calf on the red-flag list", () => {
    assert.ok(AREAS.length >= 20);
    for (const a of AREAS) assert.ok(a.meridian.length > 10 && a.holds.length > 20, a.key);
    for (const c of CONDITIONS) assert.ok(c.homeChecks.length >= 1 && c.looksLike.length > 30, c.key);
    assert.ok(RED_FLAGS.some((r) => /one calf/.test(r.sign) && r.where === "today"));
    assert.ok(RED_FLAGS.some((r) => /Chest pain/.test(r.sign) && r.where === "now"));
    assert.equal(areaName("calves"), "Calves and shins");
  });
  it("finds the factors that ride with a symptom, and stays quiet with too little data", () => {
    const days = [];
    const entries = [];
    for (let i = 1; i <= 20; i++) {
      const day = `2026-09-${String(i).padStart(2, "0")}`;
      const standing = i % 2 === 0;
      const factors = [standing ? "long standing" : "calm day", i % 5 === 0 ? "low water" : "slept well"];
      days.push({ day, factors });
      if (standing && i <= 12) entries.push({ day, area: "calves" });
    }
    const lines = patterns(entries, days, areaName);
    assert.ok(lines.some((l) => l.area === "calves" && l.factor === "long standing"), JSON.stringify(lines));
    assert.ok(!lines.some((l) => l.factor === "slept well"));
    assert.deepEqual(patterns(entries, days.slice(0, 3), areaName), []);
    assert.deepEqual(patterns([{ day: "2026-09-02", area: "knees" }], days, areaName), []);
  });
});
