import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLACES, SOURCES } from "../core/crossroads/places.ts";
import { agreements, combinedImportance, differences, fitFor, fitWords, rank, FACTOR_LABEL, QUESTIONS, type Factor } from "../core/crossroads/pure.ts";
import { STAGES, STEPS } from "../core/crossroads/steps.ts";
import { findBanned } from "../core/copy/banned.mjs";
import { contrastRatio, AA_NORMAL_TEXT } from "../core/theme/contrast.ts";

const FACTORS = Object.keys(FACTOR_LABEL) as Factor[];

describe("The Crossroads content", () => {
  it("every place rates every factor 1 to 5, and every question factor exists", () => {
    for (const p of PLACES) for (const f of FACTORS) assert.ok(p.ratings[f] >= 1 && p.ratings[f] <= 5, `${p.name} ${f}`);
    for (const q of QUESTIONS) if (q.factor) assert.ok(FACTORS.includes(q.factor), q.key);
    assert.ok(PLACES.filter((p) => p.kind === "country").length >= 10);
    assert.ok(PLACES.filter((p) => p.kind === "state").length >= 5);
  });
  it("steps are ordered by stage and each names a path", () => {
    let last = 0;
    for (const s of STEPS) {
      const i = STAGES.indexOf(s.stage);
      assert.ok(i >= last, `${s.key} out of order`);
      last = i;
      assert.ok(s.paths.length > 0, s.key);
    }
    assert.ok(STEPS.some((s) => s.key === "passports" && /DS-11/.test(s.details) && /\$130/.test(s.cost ?? "")));
    assert.equal(STEPS[0].key, "decide");
  });
  it("uses no shame language", () => {
    const text = [
      ...QUESTIONS.flatMap((q) => [q.text, q.hint ?? ""]),
      ...PLACES.flatMap((p) => [p.line, p.fits, p.watch, p.path]),
      ...STEPS.flatMap((s) => [s.title, s.details]),
      ...SOURCES.map((s) => s.what),
    ].join("\n");
    assert.deepEqual(findBanned(text), []);
  });
});

describe("fit math", () => {
  const jen = [{ key: "water", importance: 5 }, { key: "faithCommunity", importance: 5 }, { key: "safety", importance: 4 }, { key: "cost", importance: 3 }];
  const john = [{ key: "water", importance: 5 }, { key: "faithCommunity", importance: 3 }, { key: "safety", importance: 4 }, { key: "internet", importance: 5 }];
  it("averages importance where both answered and keeps one person's where only one did", () => {
    const c = combinedImportance(jen, john);
    assert.equal(c.water, 5);
    assert.equal(c.faithCommunity, 4);
    assert.equal(c.cost, 3);
    assert.equal(c.internet, 5);
  });
  it("ranks places by weighted rating and names strong and thin factors", () => {
    const c = combinedImportance(jen, john);
    const fits = rank(PLACES, c);
    assert.ok(fits[0].score >= fits[fits.length - 1].score);
    const czech = fitFor(PLACES.find((p) => p.key === "czechia")!, c);
    assert.ok(czech.weak.includes("faithCommunity"));
    assert.match(fitWords(4.5), /strong fit/);
    assert.match(fitWords(0), /Answer/);
  });
  it("finds agreements and differences", () => {
    assert.deepEqual(agreements(jen, john), ["safety", "water"]);
    const d = differences(jen, john);
    assert.ok(d.some((x) => x.key === "faithCommunity" && x.a === 5 && x.b === 3));
  });
});

describe("The Crossroads theme", () => {
  it("text passes AA on the accent in both modes", () => {
    assert.ok(contrastRatio("#FFFFFF", "#5B6B3A") >= AA_NORMAL_TEXT);
    assert.ok(contrastRatio("#1F261C", "#A9BC7A") >= AA_NORMAL_TEXT);
  });
});
