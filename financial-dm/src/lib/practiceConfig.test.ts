import { describe, expect, test } from "bun:test";
import { DEFAULT_DIFFICULTY, DIFFICULTY_LEVELS, DIFFICULTY_NOTE, MAX_TURNS, TEMPERAMENTS, temperamentsFor } from "./practiceConfig";

describe("practice config", () => {
  test("nine temperaments, each with a path to softening and a way to stay dug in", () => {
    expect(TEMPERAMENTS.map((t) => t.id)).toEqual(["eager_opportunity", "eager_coverage", "skeptical_opportunity", "skeptical_coverage", "scam_burned", "many_questions", "think_about_it", "distracted", "already_covered"]);
    for (const t of TEMPERAMENTS) {
      expect(t.handledWell.length).toBeGreaterThan(40);
      expect(t.handledPoorly.length).toBeGreaterThan(30);
      expect(t.appliesTo.length).toBeGreaterThan(0);
    }
  });

  test("temperaments split by conversation as the spec says", () => {
    expect(temperamentsFor("recruiting").map((t) => t.id)).toEqual(["eager_opportunity", "skeptical_opportunity", "scam_burned", "many_questions", "think_about_it", "distracted"]);
    expect(temperamentsFor("coverage").map((t) => t.id)).toEqual(["eager_coverage", "skeptical_coverage", "scam_burned", "many_questions", "think_about_it", "distracted", "already_covered"]);
  });

  test("the scam-burned persona warms to transparency and not to charm", () => {
    const t = TEMPERAMENTS.find((x) => x.id === "scam_burned")!;
    expect(t.handledWell).toMatch(/industry named plainly/);
    expect(t.handledWell).toMatch(/full name/);
    expect(t.handledWell).toMatch(/license/);
    expect(t.handledWell).toMatch(/free/);
    expect(t.handledWell).toMatch(/costs/);
    expect(t.handledPoorly).toMatch(/Enthusiasm, urgency, charm/);
  });

  test("difficulty raises realism only, level 2 is the default, and the note says higher is not better", () => {
    expect(DIFFICULTY_LEVELS.map((d) => d.level)).toEqual([1, 2, 3, 4]);
    expect(DEFAULT_DIFFICULTY).toBe(2);
    expect(DIFFICULTY_LEVELS[3].behavior).toMatch(/still persuadable/);
    for (const d of DIFFICULTY_LEVELS) expect(d.behavior).not.toMatch(/never agree|refuse to be convinced|impossible/i);
    expect(DIFFICULTY_NOTE).toMatch(/Higher is not better/);
    expect(MAX_TURNS).toBe(30);
  });
});
