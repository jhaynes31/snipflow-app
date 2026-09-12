import { describe, expect, test } from "bun:test";
import { FIT_MAX_POINTS, FIT_QUESTIONS, FIT_RESULT_COPY, isFitComplete, scoreFit } from "./fitQuiz";

const pick = (ids: string[]) => Object.fromEntries(FIT_QUESTIONS.map((q, i) => [q.id, ids[i]]));

describe("fit quiz", () => {
  test("seven work-style questions with three or four options each, none about protected traits", () => {
    expect(FIT_QUESTIONS.length).toBe(7);
    for (const q of FIT_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(3);
      expect(q.options.length).toBeLessThanOrEqual(4);
      expect(`${q.text} ${q.options.map((o) => o.text).join(" ")}`).not.toMatch(/\b(age|kids|children|married|health|credit|income|salary|religion|race|gender|disab)/i);
    }
    expect(FIT_MAX_POINTS).toBe(21);
  });

  test("the same answers always give the same result", () => {
    const answers = pick(["love", "ask", "own", "25plus", "bring_it", "family", "easy"]);
    const a = scoreFit(answers);
    const b = scoreFit(answers);
    expect(a).toEqual(b);
    expect(a.fitLevel).toBe("strong");
    expect(a.points).toBe(21);
  });

  test("levels follow the thresholds", () => {
    expect(scoreFit(pick(["avoid", "stop", "someone", "under5", "no", "people", "avoid"])).fitLevel).toBe("not_right_now");
    expect(scoreFit(pick(["reason", "next", "own_structure", "15to25", "with_plan", "understand", "practice"])).fitLevel).toBe("worth_a_conversation");
    expect(scoreFit(pick(["love", "next", "own", "15to25", "with_plan", "family", "practice"])).fitLevel).toBe("strong");
  });

  test("class follows the answers, with a stable tie-break", () => {
    expect(scoreFit(pick(["love", "ask", "own_structure", "25plus", "with_plan", "people", "practice"])).guildClass).toBe("bard");
    expect(scoreFit(pick(["reason", "next", "own", "25plus", "with_plan", "own_thing", "practice"])).guildClass).toBe("ranger");
    expect(scoreFit(pick(["reason", "bounce", "own_structure", "25plus", "with_plan", "family", "practice"])).guildClass).toBe("cleric");
    expect(scoreFit(pick(["recover", "next", "unsure", "25plus", "bring_it", "understand", "easy"])).guildClass).toBe("wizard");
    // No class points at all: the first class in the fixed order, every time.
    expect(scoreFit(pick(["avoid", "stop", "someone", "under5", "no", "people", "avoid"])).guildClass).toBe("bard");
  });

  test("completion needs every question answered with a real option", () => {
    expect(isFitComplete({})).toBe(false);
    expect(isFitComplete(pick(["love", "ask", "own", "25plus", "bring_it", "family", "nope"]))).toBe(false);
    expect(isFitComplete(pick(["love", "ask", "own", "25plus", "bring_it", "family", "easy"]))).toBe(true);
  });

  test("every result level keeps the door open and promises nothing about pay", () => {
    for (const c of Object.values(FIT_RESULT_COPY)) {
      expect(`${c.headline} ${c.body}`).not.toMatch(/\$|income|six figures|guarantee/i);
      expect(`${c.headline} ${c.body}`).toMatch(/talk|conversation/i);
    }
  });
});
