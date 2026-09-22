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

import { initiationRead, SIGNALS, signalsFor, tally } from "../convex/orchard/signals.ts";

describe("my signals", () => {
  it("holds Jen's list in full, each with a tell, a test, a response and a twin", () => {
    assert.ok(SIGNALS.length >= 18);
    for (const s of SIGNALS) for (const f of ["tell", "test", "response", "twin"] as const) assert.ok(s[f].length > 10, `${s.key} ${f}`);
    for (const k of ["neverInitiates", "gossip", "confidence", "wontBeHelped", "asksDoesntShare", "bypassing", "godScapegoat", "avoidant"]) assert.ok(SIGNALS.some((s) => s.key === k), k);
    assert.ok(SIGNALS.find((s) => s.key === "gossip")?.hardLine);
  });
  it("lets each person switch some off and add their own", () => {
    const list = signalsFor({ off: ["gossip"], custom: [{ key: "own-1", name: "Mine", tell: "t", test: "t", response: "r", twin: "w" }] });
    assert.ok(!list.some((s) => s.key === "gossip"));
    assert.ok(list.some((s) => s.key === "own-1"));
    assert.equal(signalsFor(undefined).length, SIGNALS.length);
  });
  it("tallies sightings and reads the ledger", () => {
    const t = tally([{ signal: "taker", day: "2026-09-02" }, { day: "2026-09-03" }, { signal: "taker", day: "2026-09-01" }, { signal: "gossip", day: "2026-09-04" }]);
    assert.deepEqual(t[0], { key: "taker", count: 2, days: ["2026-09-01", "2026-09-02"] });
    const r = initiationRead([{ by: "me", day: "2026-09-01" }, { by: "me", day: "2026-09-05" }, { by: "them", day: "2026-09-03" }]);
    assert.deepEqual(r, { me: 2, them: 1, lastBy: "me", lastDay: "2026-09-05" });
  });
  it("the compass treats repeat sightings as a pattern and hard lines as access changes", () => {
    const base = { times: "first" as const, said: "no" as const, safety: false, expect: "unknown" as const, repaired: "untested" as const, feel: "mixed" as const };
    assert.equal(compass({ ...base, signal: "taker", priorSightings: 2 }).call, "raise", "pattern but never said: still one honest sentence");
    assert.equal(compass({ ...base, said: "yes", expect: "punish", signal: "taker", priorSightings: 2 }).call, "adjust");
    assert.equal(compass({ ...base, signal: "gossip", hardLine: true }).call, "adjust");
    assert.equal(compass({ ...base, signal: "gossip", hardLine: true, feel: "drained" }).call, "stepBack");
  });
});
