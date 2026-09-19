import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocate, compare, describe as describeSchedule, monthLabel, simulate, STARTER_LINES } from "../convex/storehouse/pure.ts";
import { AVOID, REBUILDING, RESOURCES } from "../core/storehouse/lifeboat.ts";
import { findBanned } from "../core/copy/banned.mjs";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";

const debts = [
  { id: "a", name: "Visa", balance: 4200, apr: 24.99, minimum: 120, kind: "card" },
  { id: "b", name: "Car", balance: 9800, apr: 7.5, minimum: 260, kind: "auto" },
  { id: "c", name: "Hospital", balance: 650, apr: 0, minimum: 50, kind: "medical" },
];

describe("payoff math", () => {
  it("finishes, and more extra finishes sooner with less interest", () => {
    const slow = simulate(debts, 0, "avalanche");
    const fast = simulate(debts, 300, "avalanche");
    assert.ok(slow.months > fast.months);
    assert.ok(slow.totalInterest > fast.totalInterest);
    assert.equal(slow.stuck, false);
    for (const d of fast.debts) assert.ok(d.paidMonth >= 1 && d.paidMonth <= fast.months);
  });
  it("snowball pays the smallest first; avalanche pays the highest rate first", () => {
    const snow = simulate(debts, 200, "snowball");
    const ava = simulate(debts, 200, "avalanche");
    const first = (s: typeof snow) => s.debts.slice().sort((a, b) => a.paidMonth - b.paidMonth)[0].name;
    assert.equal(first(snow), "Hospital");
    assert.equal(first(ava), "Hospital"); // 0% but tiny; it clears on minimums before the Visa
    assert.ok(ava.totalInterest <= snow.totalInterest);
  });
  it("flags a minimum that can't cover the interest", () => {
    const s = simulate([{ id: "x", name: "Stuck", balance: 10000, apr: 30, minimum: 100 }], 0, "avalanche");
    assert.equal(s.stuck, true);
    assert.match(describeSchedule(s, "2026-09"), /Lifeboat/);
  });
  it("the counseling estimate lowers card rates and charges a fee", () => {
    const cards = [{ id: "a", name: "Visa", balance: 6000, apr: 26, minimum: 150, kind: "card" }];
    const plain = simulate(cards, 100, "avalanche");
    const dmp = simulate(cards, 100, "dmp");
    assert.ok(dmp.totalInterest < plain.totalInterest);
    assert.equal(compare(cards, 100).length, 4);
  });
  it("describes in sentences with a month and a dollar amount, never a percent of progress", () => {
    const s = simulate(debts, 200, "blend");
    const text = describeSchedule(s, "2026-09");
    assert.match(text, /done in [A-Z][a-z]+ \d{4}/);
    assert.match(text, /\$[\d,]+ in interest/);
    assert.doesNotMatch(text, /%/);
    assert.equal(monthLabel("2026-09", 3), "December 2026");
    assert.equal(monthLabel("2026-11", 2), "January 2027");
  });
});

describe("allocation", () => {
  it("says the truth about the month in plain words", () => {
    assert.match(allocate(4000, 4000).sentence, /Every dollar has a job/);
    assert.match(allocate(4000, 3500).sentence, /\$500 still needs a job/);
    assert.match(allocate(4000, 4300).sentence, /\$300 more is planned/);
    assert.doesNotMatch(allocate(4000, 4300).sentence, /over budget|failed/i);
  });
  it("starter lines cover the groups", () => {
    for (const g of ["giving", "needs", "savings", "fun", "buffer"]) assert.ok(STARTER_LINES.some((l) => l.group === g), g);
  });
});

describe("Lifeboat copy", () => {
  it("has the counseling line and the 211 line, and no shame language", () => {
    assert.ok(RESOURCES.some((r) => r.contact === "800-388-2227"));
    assert.ok(RESOURCES.some((r) => r.contact === "211"));
    const text = [...RESOURCES.flatMap((r) => [r.title, r.who, r.what, r.how, r.script ?? ""]), ...AVOID, ...REBUILDING].join("\n");
    assert.deepEqual(findBanned(text), []);
    assert.doesNotMatch(text, /bankruptcy is/i);
  });
  it("theme text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#7A5C2E") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#D4B27A") >= AA_NORMAL_TEXT);
  });
});
