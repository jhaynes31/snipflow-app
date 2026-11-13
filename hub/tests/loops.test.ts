import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_STAGES, ENCOURAGEMENT, EXIT_LIBRARY, HEALTHIER, NEEDS, TEMPLATES } from "../core/loops/content.ts";
import { cardsForStage, LEARN_CARDS, LEARN_MAP, pairedSets } from "../core/loops/learn.ts";
import { growthLine, levelFor, patterns, rampWeight, tripwireDue, visibilityFor } from "../convex/loops/pure.ts";

describe("Loop Map content", () => {
  it("ships the eight default stages with exits for every kind, and needs with healthier ways", () => {
    assert.equal(DEFAULT_STAGES.length, 8);
    for (const s of DEFAULT_STAGES) assert.ok((EXIT_LIBRARY[s.key] ?? []).length >= 2, s.key);
    for (const t of TEMPLATES) assert.ok(t.stages.length >= 3 && t.stages.length <= 10, t.key);
    for (const n of NEEDS) assert.ok((HEALTHIER[n] ?? []).length >= 2, n);
    assert.ok(ENCOURAGEMENT.length >= 7);
  });
  it("has twelve brain, twelve psychology, and fifteen faith cards, every faith card with a passage and a prayer", () => {
    assert.equal(LEARN_CARDS.filter((c) => c.lens === "brain").length, 12);
    assert.equal(LEARN_CARDS.filter((c) => c.lens === "mind").length, 12);
    assert.equal(LEARN_CARDS.filter((c) => c.lens === "faith").length, 15);
    for (const c of LEARN_CARDS) {
      assert.ok(c.body.split(/\s+/).length <= 130, `${c.key} is too long`);
      assert.ok(c.soWhat.length > 10, c.key);
      if (c.lens === "faith") assert.ok(c.ref && c.passage && c.pray && c.slug && c.chapter, c.key);
      if (c.lens === "mind") assert.ok(c.from, c.key);
      for (const p of c.pairs ?? []) assert.ok(LEARN_MAP[p], `${c.key} pairs with missing ${p}`);
    }
    assert.ok(pairedSets().length >= 4);
    const body = cardsForStage("body", true);
    assert.deepEqual(body.map((c) => c.lens), ["brain", "mind", "faith"]);
    assert.equal(cardsForStage("body", false).length, 2);
  });
});

describe("Loop Map helpers", () => {
  it("maps sharing levels to visibility and back", () => {
    assert.equal(visibilityFor("private"), "private");
    assert.equal(visibilityFor("nameOnly"), "sharedSummary");
    assert.equal(visibilityFor("signal"), "shared");
    assert.equal(levelFor("shared"), "signal");
    assert.equal(levelFor("sharedSummary"), "nameOnly");
  });
  it("makes early exit ramps wider", () => {
    assert.ok(rampWeight(0, 8) > rampWeight(3, 8) && rampWeight(3, 8) > rampWeight(7, 8));
    assert.equal(rampWeight(0, 1), 1);
  });
  it("counts catches, early catches, recovery, and the month-over-month mode", () => {
    const stages = DEFAULT_STAGES.map((s) => ({ id: s.key, key: s.key, name: s.name }));
    const day = 86_400_000;
    const now = 100 * day;
    const checks = [
      { at: now - 45 * day, stageId: "urge", firstNoticedStageId: "urge", outcome: "around" as const, resolvedAt: now - 45 * day + 3_600_000 },
      { at: now - 40 * day, stageId: "urge", firstNoticedStageId: "urge", outcome: "out" as const, exitedStageId: "urge", resolvedAt: now - 40 * day + 1_800_000 },
      { at: now - 5 * day, stageId: "body", firstNoticedStageId: "body", outcome: "out" as const, exitedStageId: "story", resolvedAt: now - 5 * day + 600_000 },
      { at: now - 2 * day, stageId: "body", firstNoticedStageId: "body", outcome: "out" as const, exitedStageId: "body", resolvedAt: now - 2 * day + 900_000 },
    ];
    const p = patterns(stages, checks, now);
    assert.equal(p.catches.length, 4);
    assert.equal(p.earlyCount, 4);
    assert.equal(p.medianRecoveryMin, 15);
    assert.equal(p.lastMonthMode, "The Urge");
    assert.equal(p.thisMonthMode, "Body Signal");
    assert.match(growthLine(p, stages) ?? "", /Body Signal.*real growth/);
    assert.equal(p.totalPasses, 1);
  });
  it("fires a tripwire at its hour on its days, once a day, unless snoozed", () => {
    const g = { schedule: { days: [0, 3], hour: 20 } };
    assert.equal(tripwireDue(g, 20, 0, 1000), true);
    assert.equal(tripwireDue(g, 19, 0, 1000), false);
    assert.equal(tripwireDue(g, 20, 1, 1000), false);
    assert.equal(tripwireDue({ ...g, lastFiredAt: 1000 - 3_600_000 }, 20, 0, 1000), false);
    assert.equal(tripwireDue({ ...g, snoozedUntil: 5000 }, 20, 0, 1000), false);
    assert.equal(tripwireDue({}, 20, 0, 1000), false);
  });
});
