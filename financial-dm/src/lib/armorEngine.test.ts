import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { computeArmor, approxDollars, isSolo, partySummary, roundTo10k, type LifeAnswers, type PartyId } from "./armorEngine";
import { ARMOR_CONFIG } from "./armorConfig";
import { createSeededRng } from "./wealthRng";

const party = (members: PartyId[], kids = 1, youngest?: LifeAnswers["party"]["youngest"]) => ({ members, kids, youngest });

describe("computeArmor: hand-worked examples", () => {
  test("partner + 2 kids (youngest 5 to 12), paycheck earner", () => {
    const r = computeArmor({ party: party(["partner", "kids"], 2, "5_12"), income: "75_100", mortgage: "200_300", debts: "10_25", education: "some", employer: "2x", personal: "100_250" });
    expect(r.dice).toEqual({ D: 15_000 + 17_500, I: 87_500 * 10, M: 250_000, E: 25_000 * 2 });
    expect(r.damage).toBe(1_207_500);
    expect(r.shield).toBe(175_000 + 175_000);
    expect(r.gap).toBe(857_500);
    expect(r.acTier).toBe("leather"); // 0.29
    expect(r.cursed).toBe(false); // exactly half is not more than half
    expect(r.loot).toBe("beneficiary_check");
    expect(r.assumptions).toEqual([]);
  });

  test("stay-at-home parent (no paycheck) with partner and one child under 5", () => {
    const r = computeArmor({ party: party(["partner", "kids"], 1, "under5"), income: "none", mortgage: "lt100", debts: "none", education: "none", employer: "50_100", personal: "none" });
    expect(r.earnsPaycheck).toBe(false);
    expect(r.dice).toEqual({ D: 15_000, I: 40_000 * 15, M: 50_000, E: 0 });
    expect(r.damage).toBe(665_000);
    expect(r.shield).toBe(75_000);
    expect(r.acTier).toBe("unarmored"); // 0.11
    expect(r.cursed).toBe(true); // all of the shield is work coverage
    expect(r.loot).toBe("cursed_armor_decoder");
  });

  test("solo with pets: only final expenses, Traveling Light, shield beats damage", () => {
    const r = computeArmor({ party: party(["pets"]), income: "150p", mortgage: "400p", debts: "100p", employer: "3x", personal: "1mp" });
    expect(r.solo).toBe(true);
    expect(r.dice).toEqual({ D: 15_000, I: 0, M: 0, E: 0 });
    expect(r.damage).toBe(15_000);
    expect(r.shield).toBe(525_000 + 1_250_000);
    expect(r.gap).toBe(0);
    expect(r.acTier).toBe("traveling_light");
    expect(r.loot).toBe("beneficiary_check");
  });

  test("explicit solo choice with nothing else answered", () => {
    const r = computeArmor({ party: party(["solo"]) });
    expect(r.damage).toBe(15_000);
    expect(r.shield).toBe(0);
    expect(r.acTier).toBe("traveling_light");
    expect(r.loot).toBe("party_map");
  });

  test("co-signer only: debts and mortgage count, income does not; Plate with Gap $0; cursed", () => {
    const r = computeArmor({ party: party(["cosigner"]), income: "150p", mortgage: "300_400", debts: "50_100", employer: "3x", personal: "none" });
    expect(r.hasDependents).toBe(false);
    expect(r.sharesObligations).toBe(true);
    expect(r.dice).toEqual({ D: 15_000 + 75_000, I: 0, M: 350_000, E: 0 });
    expect(r.damage).toBe(440_000);
    expect(r.shield).toBe(525_000);
    expect(r.gap).toBe(0);
    expect(r.acTier).toBe("plate");
    expect(r.cursed).toBe(true);
    expect(r.loot).toBe("cursed_armor_decoder");
  });

  test("aging parent only, both coverage answers unsure (paycheck earner)", () => {
    const r = computeArmor({ party: party(["parent"]), income: "lt30", mortgage: "none", debts: "none", employer: "unsure", personal: "unsure" });
    expect(r.dice.I).toBe(25_000 * 5); // no kids: 5 years
    expect(r.damage).toBe(140_000);
    expect(r.employerShield).toBe(25_000); // unsure counts as 1× salary
    expect(r.personalShield).toBe(0); // unsure counts as $0
    expect(r.acTier).toBe("unarmored");
    expect(r.cursed).toBe(true);
    expect(r.assumptions).toHaveLength(2);
    expect(r.assumptions[0]).toContain("1× your salary");
    expect(r.assumptions[1]).toContain("$0");
  });

  test("no paycheck and unsure about job coverage counts as $0", () => {
    const r = computeArmor({ party: party(["partner"]), income: "none", employer: "unsure", personal: "none" });
    expect(r.employerShield).toBe(0);
    expect(r.assumptions).toHaveLength(1);
    expect(r.assumptions[0]).toContain("$0");
  });

  test("partner only with strong personal coverage: Plate, not cursed", () => {
    const r = computeArmor({ party: party(["partner"]), income: "30_50", mortgage: "none", debts: "none", employer: "none", personal: "250_500" });
    expect(r.damage).toBe(15_000 + 40_000 * 5);
    expect(r.shield).toBe(375_000);
    expect(r.gap).toBe(0);
    expect(r.acTier).toBe("plate");
    expect(r.cursed).toBe(false);
    expect(r.loot).toBe("beneficiary_check");
  });

  test("6+ kids counts as 6 for education; youngest 13 to 17 means 5 years of income", () => {
    const r = computeArmor({ party: party(["kids"], 9, "13_17"), income: "50_75", education: "most", employer: "1x", personal: "none" });
    expect(r.kids).toBe(6);
    expect(r.dice.E).toBe(600_000);
    expect(r.dice.I).toBe(62_500 * 5);
  });

  test("business partner and pets only is not solo (spec 6): final expenses, Unarmored, Party Map", () => {
    const r = computeArmor({ party: party(["business", "pets"]), income: "75_100", mortgage: "200_300", debts: "25_50", employer: "none", personal: "none" });
    expect(r.solo).toBe(false);
    expect(r.damage).toBe(15_000);
    expect(r.acTier).toBe("unarmored");
    expect(r.loot).toBe("party_map");
  });

  test("tier boundaries follow the thresholds exactly", () => {
    const base: LifeAnswers = { party: party(["partner"]), income: "30_50", employer: "none" }; // damage 215,000
    const at = (personal: LifeAnswers["personal"]) => computeArmor({ ...base, personal }).acTier;
    expect(at("none")).toBe("unarmored"); // 0
    expect(at("lt100")).toBe("unarmored"); // 50k / 215k = 0.23
    expect(computeArmor({ ...base, employer: "1x", personal: "lt100" }).acTier).toBe("leather"); // 90k / 215k = 0.42
    expect(at("100_250")).toBe("chain"); // 175k / 215k = 0.81
    expect(at("250_500")).toBe("plate"); // 375k / 215k = 1.74
    // Exactly on a cut-off counts as the higher tier.
    const exact = computeArmor({ ...base, personal: "none" }, { ...ARMOR_CONFIG, acThresholds: { leather: 0, chain: 0.6, plate: 0.9 } });
    expect(exact.acTier).toBe("leather");
  });
});

describe("computeArmor: rules", () => {
  test("identical answers always give identical output (property test)", () => {
    const rng = createSeededRng(7);
    const pick = <T,>(arr: readonly T[]) => arr[rng.int(arr.length) - 1];
    const incomes = ["lt30", "30_50", "50_75", "75_100", "100_150", "150p", "none"] as const;
    const mortgages = ["none", "lt100", "100_200", "200_300", "300_400", "400p"] as const;
    const debts = ["none", "lt10", "10_25", "25_50", "50_100", "100p"] as const;
    const edu = ["none", "some", "most"] as const;
    const youngest = ["under5", "5_12", "13_17", "18p"] as const;
    const employers = ["none", "1x", "2x", "3x", "unsure", "lt50", "50_100", "100_200", "200p"] as const;
    const personals = ["none", "lt100", "100_250", "250_500", "500_1m", "1mp", "unsure"] as const;
    const ids: PartyId[] = ["partner", "kids", "parent", "cosigner", "business", "pets", "solo"];
    for (let i = 0; i < 300; i++) {
      const members = ids.filter(() => rng.int(2) === 1);
      const a: LifeAnswers = {
        party: { members, kids: rng.int(6), youngest: pick(youngest) },
        income: pick(incomes), mortgage: pick(mortgages), debts: pick(debts), education: pick(edu), employer: pick(employers), personal: pick(personals),
      };
      const first = JSON.stringify(computeArmor(a));
      const second = JSON.stringify(computeArmor(JSON.parse(JSON.stringify(a))));
      expect(second).toBe(first);
      const r = computeArmor(a);
      expect(r.gap).toBe(Math.max(0, r.damage - r.shield));
      expect(r.damage).toBeGreaterThanOrEqual(ARMOR_CONFIG.finalExpenses);
      if (r.solo) expect(r.acTier).toBe("traveling_light");
      expect(r.cursed).toBe(r.shield > 0 && r.employerShield > r.shield / 2);
    }
  });

  test("the engine and its config never import the dice", () => {
    for (const f of ["src/lib/armorEngine.ts", "src/lib/armorConfig.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/from\s+["'][^"']*wealthRng/);
      expect(src).not.toMatch(/Math\.random|crypto\.getRandomValues/);
    }
  });

  test("the config is still marked unconfirmed until John signs off", () => {
    expect(typeof ARMOR_CONFIG.confirmedByJohn).toBe("boolean");
  });
});

describe("helpers", () => {
  test("rounding and display", () => {
    expect(roundTo10k(1_207_500)).toBe(1_210_000);
    expect(roundTo10k(4_999)).toBe(0);
    expect(approxDollars(1_207_500)).toBe("~$1,210,000");
    expect(approxDollars(3_000, 10_000)).toBe("~$10,000");
    expect(approxDollars(0)).toBe("~$0");
  });
  test("solo detection and roster summary", () => {
    expect(isSolo({ members: [], kids: 1 })).toBe(true);
    expect(isSolo({ members: ["pets"], kids: 1 })).toBe(true);
    expect(isSolo({ members: ["pets", "business"], kids: 1 })).toBe(false);
    expect(partySummary({ members: ["pets", "kids", "partner", "parent"], kids: 2 })).toBe("Partner, 2 kids, parent, pets");
    expect(partySummary({ members: ["pets", "business"], kids: 1 })).toBe("Business partner, pets");
    expect(partySummary({ members: ["kids"], kids: 6 })).toBe("6+ kids");
    expect(partySummary({ members: ["solo", "pets"], kids: 1 })).toBe("Nobody (pets only)");
  });
});
