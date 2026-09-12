import { describe, expect, test } from "bun:test";
import { JOHN_RECRUITING_PRESENTATION, interruptionChance, midpointSeconds, normalizeSections, pickJumpTarget, presentationSummary } from "./practicePresentation";

describe("presentation practice", () => {
  test("John's outline: four sections, twelve points, his timings", () => {
    const s = JOHN_RECRUITING_PRESENTATION.sections;
    expect(s.map((x) => x.title)).toEqual(["Background and vibe check", "The company", "The house", "Getting started"]);
    expect(s.reduce((n, x) => n + x.points.length, 0)).toBe(12);
    expect(s[0].minMinutes).toBe(5); expect(s[0].maxMinutes).toBe(20);
    expect(s[2].points).toContain("John and Mary example");
  });

  test("sections normalize from typed input", () => {
    const n = normalizeSections([{ title: "The house", minMinutes: "5", maxMinutes: "3", points: "Goals\n\nWalls" }, { title: "" }, { title: "The house", points: [] }]);
    expect(n.length).toBe(2);
    expect(n[0]).toEqual({ id: "the_house", title: "The house", minMinutes: 5, maxMinutes: 5, points: ["Goals", "Walls"] });
    expect(n[1].id).toBe("the_house_2");
  });

  test("interruptions scale with difficulty and temperament; level 1 never interrupts", () => {
    expect(interruptionChance(1, "many_questions")).toEqual({ jump: 0, drift: 0 });
    expect(interruptionChance(2, "skeptical_opportunity").jump).toBeCloseTo(0.25);
    expect(interruptionChance(3, "many_questions").jump).toBeCloseTo(0.75);
    expect(interruptionChance(3, "distracted").drift).toBeGreaterThan(interruptionChance(3, "distracted").jump);
    expect(interruptionChance(4, "eager_opportunity").jump).toBeCloseTo(0.75);
  });

  test("jumps go to later sections, weighted toward the end", () => {
    const s = JOHN_RECRUITING_PRESENTATION.sections;
    expect(pickJumpTarget(s, 3, 0.5)).toBeNull();
    expect(pickJumpTarget(s, 0, 0.99)?.id).toBe("getting_started");
    expect(pickJumpTarget(s, 0, 0.0)?.id).toBe("company");
    expect(midpointSeconds(s[0])).toBe(100);
    expect(midpointSeconds(s[1])).toBe(40);
    expect(midpointSeconds(s[0], true)).toBe(2);
  });

  test("the summary reports covered, skipped, derailed and recovered, and pacing", () => {
    const s = JOHN_RECRUITING_PRESENTATION.sections;
    const sum = presentationSummary(s, [
      { sectionId: "background", startedAt: "", endedAt: "", seconds: 420, status: "delivered", said: "", interrupted: true, interruptKind: "jump", interruptTargetId: "getting_started", recovered: true },
      { sectionId: "company", startedAt: "", endedAt: "", seconds: 30, status: "skipped", said: "", interrupted: false, interruptKind: "", interruptTargetId: "", recovered: false },
      { sectionId: "house", startedAt: "", endedAt: "", seconds: 60, status: "delivered", said: "", interrupted: true, interruptKind: "drift", interruptTargetId: "", recovered: false },
    ]);
    expect(sum.covered).toEqual(["Background and vibe check", "The house"]);
    expect(sum.skipped).toEqual(["The company"]);
    expect(sum.notStarted).toEqual(["Getting started"]);
    expect(sum.derailed[0]).toEqual({ section: "Background and vibe check", kind: "jump", jumpedTo: "Getting started", recovered: true });
    expect(sum.pacing.find((p) => p.section === "The house")?.verdict).toBe("under");
    expect(sum.lines.join(" ")).toMatch(/came back to finish/);
    expect(sum.lines.join(" ")).not.toMatch(/score|grade/i);
  });
});
