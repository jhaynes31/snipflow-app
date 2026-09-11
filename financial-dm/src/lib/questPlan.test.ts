import { describe, expect, test } from "bun:test";
import { checkPlan, defaultEndDate, enforcePlan, groupByWeek, partOrderWarnings, scheduleDates, slugProblem, suggestSlug, targetMix, weekStart, weekdayOf, type PlannedSlot } from "./questPlan";
import { QUEST_CONFIG } from "./questConfig";

describe("slugs", () => {
  test("accepts short spoken words and rejects lookalikes, reserved words, and duplicates", () => {
    expect(slugProblem("baby")).toBeNull();
    expect(slugProblem("Armor ")).toBeNull();
    expect(slugProblem("loot")).toMatch(/already a page/);
    expect(slugProblem("quiz")).toMatch(/already a page/);
    expect(slugProblem("hello")).toBeNull();
    expect(slugProblem("b0ss")).toMatch(/digits 0 and 1/);
    expect(slugProblem("l1fe")).toMatch(/digits 0 and 1/);
    expect(slugProblem("baby", ["Baby"])).toMatch(/already used/);
    expect(slugProblem("")).toMatch(/short word/);
    expect(slugProblem("averyveryverylongslugname")).toMatch(/16 characters/);
  });
  test("suggests a slug from a name", () => {
    expect(suggestSlug("New Parents")).toBe("new");
    expect(suggestSlug("Job Changers")).toBe("job");
    expect(suggestSlug("The Armor Quest")).toBe("armor");
  });
});

describe("dates", () => {
  test("weekday, week start, default end", () => {
    expect(weekdayOf("2026-09-15")).toBe("Tuesday");
    expect(weekStart("2026-09-15")).toBe("2026-09-14");
    expect(weekStart("2026-09-13")).toBe("2026-09-07"); // Sunday belongs to the week before
    expect(defaultEndDate("2026-09-14")).toBe("2026-10-04"); // 3 weeks
  });
  test("three posts a week land Mon, Wed, Fri inside the quest window", () => {
    const dates = scheduleDates("2026-09-14", "2026-10-04", 3);
    expect(dates).toHaveLength(9);
    expect(dates.slice(0, 3)).toEqual(["2026-09-14", "2026-09-16", "2026-09-18"]);
    expect(dates.every((d) => ["Monday", "Wednesday", "Friday"].includes(weekdayOf(d)))).toBe(true);
  });
  test("recurring shows claim their weekdays first", () => {
    const dates = scheduleDates("2026-09-14", "2026-09-20", 3, ["Tuesday", "Friday"]);
    expect(dates.map(weekdayOf)).toEqual(["Tuesday", "Friday", "Monday"].sort((a, b) => dates.findIndex((d) => weekdayOf(d) === a) - dates.findIndex((d) => weekdayOf(d) === b)));
    expect(dates.map(weekdayOf).sort()).toEqual(["Friday", "Monday", "Tuesday"]);
    // One post a week with a Tuesday show: Tuesday wins.
    expect(scheduleDates("2026-09-14", "2026-09-20", 1, ["Tuesday"]).map(weekdayOf)).toEqual(["Tuesday"]);
    // More shows than posts: only the first weekdays are used, never more than the cadence.
    expect(scheduleDates("2026-09-14", "2026-09-20", 2, ["Monday", "Wednesday", "Friday"])).toHaveLength(2);
  });
  test("a start mid-week skips days before the start", () => {
    const dates = scheduleDates("2026-09-17", "2026-09-27", 3);
    expect(dates[0]).toBe("2026-09-18");
    expect(dates.every((d) => d >= "2026-09-17" && d <= "2026-09-27")).toBe(true);
  });
  test("groups by week from the quest start", () => {
    const g = groupByWeek([{ date: "2026-09-16" }, { date: "2026-09-23" }, { date: "2026-09-14" }], "2026-09-14");
    expect(g.map((w) => w.label)).toEqual(["Week 1", "Week 2"]);
    expect(g[0].items.map((i) => i.date)).toEqual(["2026-09-14", "2026-09-16"]);
  });
});

const slot = (over: Partial<PlannedSlot>): PlannedSlot => ({ date: "2026-09-14", platform: "tiktok", generator: "script", generatorReason: "r", topic: "t", painPoint: "p", hookAngle: "h", ...over });

describe("plan rules", () => {
  test("target mix follows the format mix and caps memes", () => {
    const mix = targetMix(9);
    expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBe(9);
    expect(mix.script).toBeGreaterThanOrEqual(5);
    expect(mix.meme).toBeLessThanOrEqual(Math.floor(QUEST_CONFIG.memeMaxShare * 9));
  });
  test("checkPlan flags too many memes and too many multi-part series", () => {
    const bad = [slot({ generator: "meme" }), slot({ generator: "meme" }), slot({}), slot({ seriesName: "A", seriesKind: "multi_part", partNumber: 1 }), slot({ seriesName: "B", seriesKind: "multi_part", partNumber: 1 })];
    const c = checkPlan(bad);
    expect(c.ok).toBe(false);
    expect(c.problems.join(" ")).toMatch(/Memes are 40%/);
    expect(c.problems.join(" ")).toMatch(/2 multi-part series/);
    expect(checkPlan([slot({ generator: "insight_card" })]).unavailable).toEqual(["insight_card"]);
  });
  test("enforcePlan fixes unknown generators, extra series, and meme overflow", () => {
    const messy = [slot({ generator: "podcast" as never }), slot({ generator: "meme" }), slot({ generator: "meme" }), slot({ seriesName: "A", seriesKind: "multi_part", partNumber: 1 }), slot({ seriesName: "B", seriesKind: "multi_part", partNumber: 1 }), slot({}), slot({})];
    const { slots, changes } = enforcePlan(messy);
    expect(checkPlan(slots).ok).toBe(true);
    expect(slots.filter((s) => s.generator === "meme").length).toBeLessThanOrEqual(Math.floor(QUEST_CONFIG.memeMaxShare * slots.length));
    expect(slots.some((s) => s.seriesName === "B")).toBe(false);
    expect(changes.length).toBeGreaterThanOrEqual(3);
  });
});

describe("part order warnings", () => {
  test("warns when parts are out of date order or posted out of order, not otherwise", () => {
    const base = { generator: "script" as const, seriesId: 1, seriesName: "Armor", seriesKind: "multi_part" as const, totalParts: 3 };
    const fine = [{ ...base, partNumber: 1, date: "2026-09-14", status: "posted" as const }, { ...base, partNumber: 2, date: "2026-09-16", status: "idea" as const }];
    expect(partOrderWarnings(fine)).toEqual([]);
    const moved = [{ ...base, partNumber: 1, date: "2026-09-18", status: "idea" as const }, { ...base, partNumber: 2, date: "2026-09-16", status: "idea" as const }];
    expect(partOrderWarnings(moved)[0]).toMatch(/Part 2 is scheduled before Part 1/);
    const posted = [{ ...base, partNumber: 1, date: "2026-09-14", status: "approved" as const }, { ...base, partNumber: 2, date: "2026-09-16", status: "posted" as const }];
    expect(partOrderWarnings(posted)[0]).toMatch(/Part 2 is marked posted but Part 1 isn't/);
  });
});
