import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AGREEMENT_FIELDS, CATCH_ROLES, DANCE, MOVES, PRACTICES, SIDE_PROMPTS } from "../core/rooted/us.ts";

describe("Us: the loop in a marriage", () => {
  it("names the loop as the enemy and never a person", () => {
    const all = JSON.stringify({ DANCE, MOVES, PRACTICES, SIDE_PROMPTS });
    assert.match(DANCE.line, /The loop is the enemy/);
    assert.ok(!/\b(narciss|toxic|abuser|manipulat)/i.test(all));
    assert.ok(DANCE.sections.length >= 5);
  });
  it("gives moves to both roles, each with when, instead, say, why", () => {
    for (const r of ["pursuer", "withdrawer", "both"] as const) assert.ok(MOVES.filter((m) => m.role === r).length >= 3, r);
    for (const m of MOVES) for (const k of ["when", "insteadOf", "say", "why"] as const) assert.ok(m[k].length > 8, `${m.key}.${k}`);
  });
  it("asks each person only about their own part", () => {
    assert.ok(SIDE_PROMPTS.length >= 8);
    for (const p of SIDE_PROMPTS) assert.ok(/\b(I|my|me|mine)\b/.test(p.question), p.key);
    assert.ok(AGREEMENT_FIELDS.every((f) => f.starter.length > 3) && CATCH_ROLES.length === 5);
    assert.ok(PRACTICES.every((p) => p.steps.length >= 3));
  });
});
