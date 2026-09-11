import { describe, expect, test } from "bun:test";
import { computeProfile, statRanges } from "./wealthProfile";
import { WEALTH_QUESTIONS } from "../components/WealthReport";
import { createSeededRng } from "./wealthRng";

const pick = (i: number) => Object.fromEntries(WEALTH_QUESTIONS.map((q) => [q.key, q.options[i % q.options.length].id]));

describe("computeProfile", () => {
  test("identical answers give identical output across 100 RNG seeds", () => {
    const answers = { ...pick(2), emergency_fund: WEALTH_QUESTIONS[0].options[0].id };
    const baseline = JSON.stringify(computeProfile(WEALTH_QUESTIONS, answers));
    for (let seed = 1; seed <= 100; seed++) {
      const rng = createSeededRng(seed);
      // Burn some rolls the way the quiz would, then prove they changed nothing.
      rng.d20(); rng.d20(); rng.d20(); rng.int(4);
      expect(JSON.stringify(computeProfile(WEALTH_QUESTIONS, answers))).toBe(baseline);
    }
  });

  test("stats are derived, so changing an answer never double counts", () => {
    const a = pick(0);
    const first = computeProfile(WEALTH_QUESTIONS, a);
    const changed = { ...a, budgeting: WEALTH_QUESTIONS[1].options[3].id };
    const second = computeProfile(WEALTH_QUESTIONS, changed);
    const back = computeProfile(WEALTH_QUESTIONS, a);
    expect(second.stats.DEX).toBeGreaterThan(first.stats.DEX);
    expect(back).toEqual(first);
  });

  test("every stat is active and lead score matches the original point scale", () => {
    const p = computeProfile(WEALTH_QUESTIONS, pick(3));
    expect(p.activeStats).toEqual(["CON", "DEX", "STR", "WIS", "INT"]);
    expect(p.leadScore).toBe(100);
    expect(computeProfile(WEALTH_QUESTIONS, pick(0)).leadScore).toBe(0);
    expect(computeProfile(WEALTH_QUESTIONS, {}).leadScore).toBe(0);
  });

  test("weakest stat tie break follows CON, STR, DEX, WIS, INT", () => {
    const p = computeProfile(WEALTH_QUESTIONS, {});
    expect(p.weakestStat).toBe("CON");
  });

  test("authored ranges stay close to -3..+3 before the twist", () => {
    const r = statRanges(WEALTH_QUESTIONS);
    for (const k of ["CON", "DEX", "STR", "WIS", "INT"] as const) {
      expect(r[k].min).toBeGreaterThanOrEqual(-3);
      expect(r[k].max).toBeLessThanOrEqual(3);
    }
  });
});

describe("class", () => {
  test("the strongest stat picks the class, WIS wins ties", () => {
    const p = computeProfile(WEALTH_QUESTIONS, pick(3));
    expect(p.classId).toBe("cleric");
    const debtFree = { ...pick(1), debt_burden: WEALTH_QUESTIONS[2].options[3].id };
    expect(computeProfile(WEALTH_QUESTIONS, debtFree).classId).toBe("fighter");
  });
});
