import { describe, expect, test } from "bun:test";
import { buildScoreboard, funnelOf, rankByBookings, rateText, recruitFunnel, type LeadRow, type RecruitRow, type ScoreboardInput } from "./scoreboard";

const lead = (over: Partial<LeadRow>): LeadRow => ({ questId: 1, seriesId: null, slotId: null, status: "New", notAFitReason: "", foundVia: "", ...over });

const base = (): ScoreboardInput => ({
  today: "2026-10-01",
  quests: [
    { id: 1, name: "New Parent Armor", slug: "baby", goal: "booked_calls", status: "active", startDate: "2026-09-01", endDate: "2026-09-21", retro: "", profileName: "New Parents" },
    { id: 2, name: "Money Check", slug: "money", goal: "booked_calls", status: "complete", startDate: "2026-08-01", endDate: "2026-08-21", retro: "Learned a lot", profileName: "Job Changers" },
    { id: 3, name: "Planned", slug: "plan", goal: "booked_calls", status: "planning", startDate: "2026-11-01", endDate: "2026-11-21", retro: "", profileName: "" },
    { id: 4, name: "Join the Guild", slug: "join", goal: "recruits", status: "active", startDate: "2026-09-01", endDate: "2026-09-30", retro: "", profileName: "Career Changer" },
  ],
  recruits: [
    { questId: 4, seriesId: null, slotId: null, source: "interest_form", stage: "contracted", notMovingReason: "", foundVia: "flyer" },
    { questId: 4, seriesId: null, slotId: null, source: "text", stage: "first_sale", notMovingReason: "", foundVia: "" },
    { questId: 4, seriesId: null, slotId: null, source: "interest_form", stage: "interviewed", notMovingReason: "", foundVia: "tiktok" },
    { questId: 4, seriesId: null, slotId: null, source: "text", stage: "not_moving_forward", notMovingReason: "no_response", foundVia: "" },
    { questId: null, seriesId: null, slotId: null, source: "interest_form", stage: "interested", notMovingReason: "", foundVia: "flyer" },
  ] as RecruitRow[],
  winStage: "contracted",
  series: [
    { id: 10, name: "Armor Series", kind: "multi_part", questId: 1, slug: "armor" },
    { id: 11, name: "Trap or Treasure Tuesday", kind: "recurring", questId: null, slug: "" },
  ],
  slots: [
    { id: 100, questId: 1, generator: "script", seriesId: 10, status: "posted", postSlug: "baby2", stats: { views: 1000, likes: 50, comments: 5 }, topic: "Work coverage", date: "2026-09-02" },
    { id: 101, questId: 1, generator: "meme", seriesId: null, status: "posted", postSlug: "", stats: { views: 400, likes: 10 }, topic: "Payday", date: "2026-09-04" },
    { id: 102, questId: 1, generator: "carousel", seriesId: 11, status: "drafted", postSlug: "", stats: {}, topic: "Myth", date: "2026-09-08" },
    { id: 103, questId: 2, generator: "script", seriesId: 11, status: "posted", postSlug: "", stats: { views: 200 }, topic: "Budget", date: "2026-08-04" },
  ],
  leads: [
    lead({ status: "Sold", slotId: 100, seriesId: 10 }),
    lead({ status: "Booked" }),
    lead({ status: "Showed" }),
    lead({ status: "Not a fit", notAFitReason: "just_curious" }),
    lead({ status: "Not a fit", notAFitReason: "just_curious" }),
    lead({ status: "Not a fit", notAFitReason: "price" }),
    lead({ questId: 2, status: "Booked" }),
    lead({ questId: null, foundVia: "friend", status: "Booked" }),
    lead({ questId: null, foundVia: "friend" }),
    lead({ questId: null, foundVia: "" }),
  ],
  events: [
    { kind: "visit", questId: 1, seriesId: null, slotId: null },
    { kind: "visit", questId: 1, seriesId: 10, slotId: null },
    { kind: "visit", questId: 1, seriesId: null, slotId: 100 },
    { kind: "quiz_start", questId: 1, seriesId: null, slotId: 100 },
    { kind: "quiz_complete", questId: 1, seriesId: null, slotId: 100 },
    { kind: "visit", questId: 2, seriesId: null, slotId: null },
  ],
});

describe("funnel", () => {
  test("booked counts everyone who got at least that far", () => {
    const f = funnelOf([lead({ status: "Booked" }), lead({ status: "Showed" }), lead({ status: "Sold" }), lead({ status: "Contacted" })]);
    expect(f).toMatchObject({ leads: 4, booked: 3, showed: 2, sold: 1, notAFit: 0 });
  });
  test("not-a-fit reasons are ranked, most common first", () => {
    const f = funnelOf(base().leads.filter((l) => l.questId === 1));
    expect(f.reasons.map((r) => `${r.label}:${r.count}`)).toEqual(["Just curious:2", "Price:1"]);
  });
});

describe("rates", () => {
  test("hide behind Too early to tell until there are enough leads", () => {
    expect(rateText(5, 50, 5)).toBe("Too early to tell");
    expect(rateText(5, 50, 20)).toBe("10%");
    expect(rateText(5, 0, 20)).toBe("—");
  });
  test("ranking is bookings, then sales, then leads", () => {
    const r = rankByBookings([
      { name: "c", booked: 1, sold: 0, leads: 9 },
      { name: "a", booked: 2, sold: 0, leads: 2 },
      { name: "b", booked: 2, sold: 1, leads: 1 },
    ]);
    expect(r.map((x) => x.name)).toEqual(["b", "a", "c"]);
  });
});

describe("buildScoreboard", () => {
  const sb = buildScoreboard(base());
  const baby = sb.quests.find((q) => q.questId === 1)!;

  test("per quest counts posts, traffic, leads, and outcomes", () => {
    expect(sb.quests[0].questId).toBe(1);
    expect(baby).toMatchObject({ posts: 2, views: 1400, engagement: 65, visits: 3, quizStarts: 1, quizCompletes: 1, leads: 6, booked: 3, showed: 2, sold: 1, notAFit: 3 });
    expect(baby.rates.tooEarly).toBe(true);
    expect(baby.rates.visitsToLeads).toBe("Too early to tell");
  });

  test("per-post rows appear only for slots with their own link", () => {
    expect(baby.perPost.map((p) => p.postSlug)).toEqual(["baby2"]);
    expect(baby.perPost[0]).toMatchObject({ leads: 1, sold: 1, visits: 1, quizCompletes: 1, views: 1000 });
  });

  test("unattributed leads are grouped by what the person said", () => {
    expect(sb.unattributedTotal).toBe(3);
    expect(sb.unattributed[0]).toMatchObject({ label: "A friend or family member", leads: 2, booked: 1 });
    expect(sb.unattributed[1]).toMatchObject({ label: "No answer", leads: 1 });
  });

  test("series with a link get bookings; others get engagement and a note", () => {
    const armor = sb.series.find((s) => s.id === "series:10")!;
    const show = sb.series.find((s) => s.id === "series:11")!;
    expect(armor).toMatchObject({ tracked: true, posts: 1, leads: 1, sold: 1, note: "" });
    expect(show.tracked).toBe(false);
    expect(show.posts).toBe(1); // totals across quests, drafted slot not counted
    expect(show.note).toContain("Add a series link");
  });

  test("generators split bookings only through per-post links", () => {
    const script = sb.generators.find((g) => g.id === "generator:script")!;
    const meme = sb.generators.find((g) => g.id === "generator:meme")!;
    expect(script).toMatchObject({ posts: 2, views: 1200, tracked: true, leads: 1, sold: 1 });
    expect(meme).toMatchObject({ posts: 1, tracked: false, leads: 0 });
    expect(meme.note).toContain("Add a post link");
  });

  test("wrap-up prompts only for ended quests without a retro", () => {
    expect(sb.wrapUps.map((w) => w.questId)).toEqual([4, 1]);
    expect(buildScoreboard({ ...base(), today: "2026-09-10" }).wrapUps).toEqual([]);
  });

  test("an untouched board is flagged empty", () => {
    const b = base();
    expect(buildScoreboard({ ...b, slots: [], leads: [], events: [], recruits: [] }).empty).toBe(true);
    expect(sb.empty).toBe(false);
  });

  test("recruiting quests stay out of the client table and rank by the win stage", () => {
    expect(sb.quests.map((q) => q.questId)).not.toContain(4);
    const rq = sb.recruitQuests[0];
    expect(rq.questId).toBe(4);
    expect(rq).toMatchObject({ recruits: 4, forms: 2, texts: 2, wins: 2, firstSales: 1, notMoving: 1, winLabel: "Contracted" });
    expect(rq.reached.find((r) => r.stage === "interviewed")?.count).toBe(3);
    expect(rq.reasons[0]).toMatchObject({ label: "No response", count: 1 });
    expect(rq.rates.tooEarly).toBe(true);
    expect(sb.unattributedRecruits[0]).toMatchObject({ label: "A flyer", recruits: 1 });
  });

  test("win stage first_sale counts only first sales as wins", () => {
    const f = recruitFunnel(base().recruits!.filter((r) => r.questId === 4), "first_sale");
    expect(f.wins).toBe(1);
  });
});
