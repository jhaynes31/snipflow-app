import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compass, daysBetween, haloRead, LAYERS, moveCheck, safeRead, WAYS } from "../convex/orchard/pure.ts";

describe("the orchard", () => {
  it("has five layers with rising minimum days and full content", () => {
    assert.equal(LAYERS.length, 5);
    for (let i = 1; i < LAYERS.length; i++) assert.ok(LAYERS[i].minDays > LAYERS[i - 1].minDays);
    for (const l of LAYERS) assert.ok(l.access.length && l.expect.length && l.earnedBy.length && l.exitSignals.length, l.name);
    assert.ok(WAYS.length >= 6);
  });
  it("says the slow-trust rule and when someone is ready", () => {
    assert.equal(daysBetween("2026-09-01", "2026-09-22"), 21);
    const c = moveCheck("2026-09-01", "2026-09-22", 2);
    assert.equal(c.ok, false);
    assert.equal(c.needed, 60);
    assert.equal(c.readyOn, "2026-10-31");
    assert.equal(moveCheck("2026-09-01", "2026-09-22", 1).ok, true);
    assert.equal(moveCheck("2025-01-01", "2026-09-22", 4).ok, true);
  });
  it("reads the halo back honestly", () => {
    assert.match(haloRead(5, 3), /ahead of the evidence/);
    assert.match(haloRead(5, 90), /facts list/);
    assert.match(haloRead(2, 10), /Steady/);
  });
  it("reads give and take without a verdict on the person", () => {
    const all = (v: "yes" | "no" | "unsure") => Object.fromEntries(["reach", "ask", "no", "gave", "drained", "stopped", "others", "secrets"].map((k) => [k, v]));
    assert.equal(safeRead(all("yes")).level, "steady");
    assert.equal(safeRead({ ...all("yes"), reach: "no", no: "no" }).level, "mixed");
    assert.equal(safeRead(all("no")).level, "oneWay");
    assert.equal(safeRead(all("unsure")).untested.length, 8);
  });
  it("points the compass", () => {
    const base = { times: "first" as const, said: "no" as const, safety: false, expect: "unknown" as const, repaired: "untested" as const, feel: "mixed" as const };
    assert.equal(compass(base).call, "raise");
    assert.ok(compass(base).script);
    assert.equal(compass({ ...base, times: "second", said: "yes", expect: "repair" }).call, "raiseThenAdjust");
    assert.equal(compass({ ...base, times: "pattern", said: "yes", expect: "punish" }).call, "adjust");
    assert.equal(compass({ ...base, times: "pattern", said: "yes", expect: "punish", feel: "drained" }).call, "stepBack");
    assert.equal(compass({ ...base, times: "pattern", safety: true }).call, "leave");
    assert.equal(compass({ ...base, safety: true }).call, "raiseThenAdjust");
    assert.equal(compass({ ...base, times: "pattern", said: "no" }).call, "raise");
    assert.equal(compass({ ...base, times: "pattern", said: "yes", expect: "repair", repaired: "yes" }).call, "raiseThenAdjust");
  });
});
