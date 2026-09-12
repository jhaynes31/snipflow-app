import { describe, expect, test } from "bun:test";
import { RUBRIC_SEEDS, normalizeRubric, saidByJohn, scanJohnLines, validateDebrief } from "./practiceDebrief";

describe("practice debrief", () => {
  test("flags quote John's line and name the rule, for coverage and recruiting", () => {
    const cov = scanJohnLines(["You're guaranteed to be approved, and the rate is locked.", "Tell me about your family first."], "coverage");
    expect(cov.length).toBe(1);
    expect(cov[0].quote).toBe("You're guaranteed to be approved, and the rate is locked.");
    expect(cov[0].ruleId).toBe("guarantee");
    expect(cov[0].rule).toMatch(/guarantees/i);
    const rec = scanJohnLines(["Honestly, unlimited income if you work it.", "Our top people make $8,000 a month.", "We want young energetic people.", "I'm a financial advisor."], "recruiting");
    expect([...new Set(rec.map((f) => f.ruleId))].sort()).toEqual(["hiring", "income", "pay_figure", "title"]);
    expect(rec.every((f) => f.quote.length > 0 && f.rule.length > 0)).toBe(true);
  });

  test("the persona's lines are never scanned, only John's", () => {
    expect(scanJohnLines([], "recruiting")).toEqual([]);
  });

  test("rubric seeds are labeled examples and normalize cleanly", () => {
    for (const items of Object.values(RUBRIC_SEEDS)) for (const i of items) expect(i.startsWith("Example: edit or delete")).toBe(true);
    expect(normalizeRubric("one\n\n  two  \n")).toEqual(["one", "two"]);
    expect(normalizeRubric(["a".repeat(300)])[0].length).toBe(200);
  });

  test("the AI's evidence must be John's actual words, and scores are stripped", () => {
    const john = ["Tell me about your family first.", "It's life insurance, and interviewing is free."];
    expect(saidByJohn("tell me about your family", john)).toBe(true);
    expect(saidByJohn("You did great, 9/10", john)).toBe(false);
    const v = validateDebrief(
      {
        summary: "Went well, score 8/10.",
        concernAddressed: true,
        concernNote: "He asked about the kids.",
        rubric: [
          { item: "Asked about their family before presenting anything", met: "yes", evidence: "Tell me about your family first." },
          { item: "Named the industry", met: "yes", evidence: "I said insurance is great" },
          { item: "Invented item", met: "yes", evidence: "whatever" },
        ],
        dodges: [{ quote: "that's for the interview", question: "costs" }, { quote: "It's life insurance, and interviewing is free.", question: "costs" }],
        tryNext: "Try naming the company sooner. Grade: A.",
      },
      ["Asked about their family before presenting anything", "Named the industry"],
      john,
    );
    expect(v.summary).toBe("Went well, .");
    expect(v.rubric.length).toBe(2);
    expect(v.rubric[0].evidence).toBe("Tell me about your family first.");
    expect(v.rubric[1].evidence).toBe("");
    expect(v.dodges.length).toBe(1);
    expect(v.dodges[0].ruleId).toBe("dodge");
    expect(v.tryNext).not.toMatch(/grade/i);
  });
});
