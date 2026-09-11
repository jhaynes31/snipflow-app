import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dealMyths, feedbackLine, mythScore, mythSummary, parseDebugMyths } from "./lifeMyths";
import { ALWAYS_DEALT, MYTH_DECK, RIGHT_LINES, WRONG_LINES } from "../components/life/mythDeck";
import { createSeededRng } from "./wealthRng";

describe("dealMyths", () => {
  test("always deals work_coverage plus two distinct others, across many seeds", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 500; seed++) {
      const hand = dealMyths(createSeededRng(seed));
      expect(hand).toHaveLength(3);
      expect(hand[0]).toBe(ALWAYS_DEALT);
      expect(new Set(hand).size).toBe(3);
      for (const id of hand) expect(MYTH_DECK.some((c) => c.id === id)).toBe(true);
      hand.slice(1).forEach((id) => seen.add(id));
    }
    // Every other card in the deck shows up somewhere.
    expect(seen.size).toBe(MYTH_DECK.length - 1);
  });

  test("the debug list pins the hand, keeps work_coverage, drops unknowns, and fills the rest", () => {
    expect(dealMyths(createSeededRng(1), ["work_coverage", "taxes", "conversion"])).toEqual(["work_coverage", "taxes", "conversion"]);
    expect(dealMyths(createSeededRng(1), ["taxes", "conversion"])).toEqual(["work_coverage", "taxes", "conversion"]);
    const filled = dealMyths(createSeededRng(3), ["bogus", "taxes"]);
    expect(filled[0]).toBe("work_coverage");
    expect(filled[1]).toBe("taxes");
    expect(filled).toHaveLength(3);
    expect(new Set(filled).size).toBe(3);
    // Too many pins: only three are dealt.
    expect(dealMyths(createSeededRng(1), ["taxes", "conversion", "stay_home", "too_expensive"])).toEqual(["work_coverage", "taxes", "conversion"]);
  });

  test("the deck has eight cards, one always dealt, each with a reveal", () => {
    expect(MYTH_DECK).toHaveLength(8);
    expect(MYTH_DECK.some((c) => c.id === ALWAYS_DEALT)).toBe(true);
    for (const c of MYTH_DECK) {
      expect(c.reveal.length).toBeGreaterThan(20);
      expect(["trap", "treasure"]).toContain(c.answer);
    }
  });
});

describe("score, feedback, summary", () => {
  test("score counts correct calls only", () => {
    const game = { roll: 7, cards: ["work_coverage", "taxes", "conversion"], guesses: { work_coverage: "trap" as const, taxes: "treasure" as const } };
    expect(mythScore(game)).toBe(1);
    expect(mythScore({ ...game, guesses: { work_coverage: "trap", taxes: "trap", conversion: "treasure" } })).toBe(3);
    expect(mythScore(undefined)).toBe(0);
  });
  test("feedback lines rotate by position", () => {
    expect(feedbackLine(true, 0)).toBe(RIGHT_LINES[0]);
    expect(feedbackLine(true, 1)).toBe(RIGHT_LINES[1]);
    expect(feedbackLine(false, 2)).toBe(WRONG_LINES[2]);
    expect(feedbackLine(false, 3)).toBe(WRONG_LINES[0]);
  });
  test("summary lists each card with the call and whether it was right", () => {
    const game = { roll: 1, cards: ["work_coverage", "taxes"], guesses: { work_coverage: "treasure" as const } };
    expect(mythSummary(game)).toEqual([
      { id: "work_coverage", guess: "treasure", correct: false },
      { id: "taxes", guess: null, correct: null },
    ]);
  });
  test("debug param parsing", () => {
    expect(parseDebugMyths("?debugMyths=work_coverage,taxes,%20conversion")).toEqual(["work_coverage", "taxes", "conversion"]);
    expect(parseDebugMyths("?debugMyths=nope")).toEqual([]);
    expect(parseDebugMyths("")).toEqual([]);
  });
  test("the estimate engine knows nothing about myth cards", () => {
    const src = readFileSync("src/lib/armorEngine.ts", "utf8");
    expect(src).not.toMatch(/myth/i);
  });
});
