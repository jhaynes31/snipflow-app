import { QUEST_CONFIG, generatorById, type GeneratorId } from "~/lib/questConfig";
import { foundViaLabel, reasonLabel } from "~/lib/attribution";
import { RECRUIT_STAGES, heardAboutLabel, reasonLabelRecruit, stageLabel } from "~/lib/guildConfig";

/**
 * Scoreboard arithmetic (Quest Board spec, Section 9). Pure functions over
 * plain rows so the counting can be unit tested and the server function
 * only has to fetch. Bookings are the north star: every ranking here is by
 * bookings first, then sales.
 */

// ── Raw rows the server hands in ──────────────────────────────────

export interface QuestRow {
  id: number;
  name: string;
  slug: string;
  /** Client quests count booked calls; recruiting quests count recruits reaching the win stage. */
  goal: "booked_calls" | "recruits";
  status: "planning" | "active" | "complete";
  startDate: string;
  endDate: string;
  retro: string;
  profileName: string;
}

export interface SlotRow {
  id: number;
  questId: number;
  generator: GeneratorId;
  seriesId: number | null;
  status: string;
  postSlug: string;
  stats: Partial<Record<"views" | "likes" | "comments" | "shares" | "saves", number>>;
  topic: string;
  date: string;
}

export interface SeriesRow {
  id: number;
  name: string;
  kind: "multi_part" | "recurring";
  questId: number | null;
  slug: string;
}

export interface LeadRow {
  questId: number | null;
  seriesId: number | null;
  slotId: number | null;
  status: string;
  notAFitReason: string;
  foundVia: string;
}

export interface EventRow {
  kind: "visit" | "quiz_start" | "quiz_complete";
  questId: number | null;
  seriesId: number | null;
  slotId: number | null;
}

export interface RecruitRow {
  questId: number | null;
  seriesId: number | null;
  slotId: number | null;
  source: string;
  stage: string;
  notMovingReason: string;
  foundVia: string;
}

export interface ScoreboardInput {
  quests: QuestRow[];
  slots: SlotRow[];
  series: SeriesRow[];
  leads: LeadRow[];
  events: EventRow[];
  /** Recruit records (recruiting spec, Section 7.2). */
  recruits?: RecruitRow[];
  /** John's win stage from the Guild facts; defaults to contracted. */
  winStage?: "contracted" | "first_sale";
  /** ISO date (YYYY-MM-DD) for "today", so wrap-up prompts are testable. */
  today: string;
}

// ── Shapes the UI reads ───────────────────────────────────────────

export interface Funnel {
  leads: number;
  booked: number;
  showed: number;
  sold: number;
  notAFit: number;
  /** Not-a-fit reasons, most common first. */
  reasons: Array<{ reason: string; label: string; count: number }>;
}

export interface Engagement {
  posts: number;
  views: number;
  /** Likes + comments + shares + saves. */
  engagement: number;
  /** True when at least one posted slot has any stat typed in. */
  hasStats: boolean;
}

export interface Traffic {
  visits: number;
  quizStarts: number;
  quizCompletes: number;
}

export interface QuestScore extends Funnel, Engagement, Traffic {
  questId: number;
  name: string;
  slug: string;
  status: QuestRow["status"];
  startDate: string;
  endDate: string;
  profileName: string;
  /** Rates shown only with enough leads (Section 9.2). */
  rates: { visitsToLeads: string; leadsToBooked: string; tooEarly: boolean };
  perPost: PostScore[];
}

export interface PostScore extends Funnel, Traffic {
  slotId: number;
  postSlug: string;
  topic: string;
  date: string;
  generator: GeneratorId;
  views: number;
  engagement: number;
}

export interface GroupScore extends Engagement {
  id: string;
  name: string;
  /** Booking numbers exist only when links made them trackable. */
  tracked: boolean;
  leads: number;
  booked: number;
  sold: number;
  note: string;
}

export interface UnattributedRow {
  foundVia: string;
  label: string;
  leads: number;
  booked: number;
  sold: number;
}

/** One recruiting quest's numbers (recruiting spec, Section 7.2). */
export interface RecruitQuestScore extends Engagement, Traffic {
  questId: number;
  name: string;
  slug: string;
  status: QuestRow["status"];
  profileName: string;
  recruits: number;
  forms: number;
  texts: number;
  fitQuiz: number;
  /** Counts of recruits who reached at least each stage, in pipeline order. */
  reached: Array<{ stage: string; label: string; count: number }>;
  notMoving: number;
  reasons: Array<{ reason: string; label: string; count: number }>;
  /** Recruits at or past John's win stage. */
  wins: number;
  winLabel: string;
  /** First sales, shown as a bonus when the win stage is contracted. */
  firstSales: number;
  rates: { visitsToRecruits: string; recruitsToWins: string; tooEarly: boolean };
}

export interface UnattributedRecruitRow {
  foundVia: string;
  label: string;
  recruits: number;
  wins: number;
}

export interface WrapUpPrompt {
  questId: number;
  name: string;
  endDate: string;
  status: QuestRow["status"];
}

export interface Scoreboard {
  /** Client quests only; recruiting quests never mix with them (Section 7.2). */
  quests: QuestScore[];
  recruitQuests: RecruitQuestScore[];
  unattributedRecruits: UnattributedRecruitRow[];
  unattributedRecruitsTotal: number;
  winStage: "contracted" | "first_sale";
  unattributed: UnattributedRow[];
  unattributedTotal: number;
  series: GroupScore[];
  generators: GroupScore[];
  wrapUps: WrapUpPrompt[];
  minLeadsForRates: number;
  /** True when no quest has any activity yet, so the UI can show the empty state. */
  empty: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────

/** Booked counts anyone who got at least that far; sold is the end of the road. */
export function funnelOf(leads: LeadRow[]): Funnel {
  const booked = leads.filter((l) => l.status === "Booked" || l.status === "Showed" || l.status === "Sold").length;
  const showed = leads.filter((l) => l.status === "Showed" || l.status === "Sold").length;
  const sold = leads.filter((l) => l.status === "Sold").length;
  const nf = leads.filter((l) => l.status === "Not a fit");
  const counts = new Map<string, number>();
  for (const l of nf) counts.set(l.notAFitReason || "other", (counts.get(l.notAFitReason || "other") ?? 0) + 1);
  const reasons = [...counts.entries()]
    .map(([reason, count]) => ({ reason, label: reasonLabel(reason) || "Other", count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { leads: leads.length, booked, showed, sold, notAFit: nf.length, reasons };
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function engagementOf(slots: SlotRow[]): Engagement {
  const posted = slots.filter((s) => s.status === "posted");
  let views = 0;
  let engagement = 0;
  let hasStats = false;
  for (const s of posted) {
    const st = s.stats ?? {};
    const parts = [st.views, st.likes, st.comments, st.shares, st.saves];
    if (parts.some((p) => p !== undefined && p !== null)) hasStats = true;
    views += n(st.views);
    engagement += n(st.likes) + n(st.comments) + n(st.shares) + n(st.saves);
  }
  return { posts: posted.length, views, engagement, hasStats };
}

export function trafficOf(events: EventRow[]): Traffic {
  return {
    visits: events.filter((e) => e.kind === "visit").length,
    quizStarts: events.filter((e) => e.kind === "quiz_start").length,
    quizCompletes: events.filter((e) => e.kind === "quiz_complete").length,
  };
}

/** "12%" or "Too early to tell" (Section 9.2). */
export function rateText(numerator: number, denominator: number, leads: number, min = QUEST_CONFIG.minLeadsForRates): string {
  if (leads < min) return "Too early to tell";
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

/** Bookings first, then sales, then leads, then name (Sections 2.1 and 9.2). */
export function rankByBookings<T extends { booked: number; sold: number; leads: number; name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.booked - a.booked || b.sold - a.sold || b.leads - a.leads || a.name.localeCompare(b.name));
}

/** Pipeline stages in order, without the exit stage. */
const PIPELINE = RECRUIT_STAGES.filter((s) => s.id !== "not_moving_forward").map((s) => s.id);
const stageIndex = (stage: string) => PIPELINE.indexOf(stage as (typeof PIPELINE)[number]);

/** Counts of recruits at or past each stage, plus wins and exits. */
export function recruitFunnel(rows: RecruitRow[], winStage: "contracted" | "first_sale") {
  const active = rows.filter((r) => r.stage !== "not_moving_forward");
  const reached = PIPELINE.slice(1).map((stage) => ({ stage, label: stageLabel(stage), count: active.filter((r) => stageIndex(r.stage) >= stageIndex(stage)).length }));
  const winIdx = stageIndex(winStage);
  const wins = active.filter((r) => stageIndex(r.stage) >= winIdx).length;
  const firstSales = active.filter((r) => r.stage === "first_sale").length;
  const exits = rows.filter((r) => r.stage === "not_moving_forward");
  const counts = new Map<string, number>();
  for (const r of exits) counts.set(r.notMovingReason || "other", (counts.get(r.notMovingReason || "other") ?? 0) + 1);
  const reasons = [...counts.entries()].map(([reason, count]) => ({ reason, label: reasonLabelRecruit(reason) || "Other", count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return { reached, wins, firstSales, notMoving: exits.length, reasons };
}

// -- The whole board --------------------------------------------------

export function buildScoreboard(input: ScoreboardInput): Scoreboard {
  const { slots, series, leads, events, today } = input;
  const recruits = input.recruits ?? [];
  const winStage = input.winStage ?? "contracted";
  const min = QUEST_CONFIG.minLeadsForRates;
  const slotById = new Map(slots.map((s) => [s.id, s]));
  const clientQuests = input.quests.filter((q) => q.goal !== "recruits");
  const recruitingQuests = input.quests.filter((q) => q.goal === "recruits");
  const quests = clientQuests;

  // Recruiting quests (Section 7.2), ranked by the win stage.
  const recruitScores: RecruitQuestScore[] = recruitingQuests.map((q) => {
    const rows = recruits.filter((r) => r.questId === q.id);
    const f = recruitFunnel(rows, winStage);
    const traffic = trafficOf(events.filter((e) => e.questId === q.id));
    const eng = engagementOf(slots.filter((s) => s.questId === q.id));
    const tooEarly = rows.length < min;
    return {
      questId: q.id,
      name: q.name,
      slug: q.slug,
      status: q.status,
      profileName: q.profileName,
      ...eng,
      ...traffic,
      recruits: rows.length,
      forms: rows.filter((r) => r.source === "interest_form").length,
      texts: rows.filter((r) => r.source === "text" || r.source === "manual").length,
      fitQuiz: rows.filter((r) => r.source === "fit_quiz").length,
      reached: f.reached,
      notMoving: f.notMoving,
      reasons: f.reasons,
      wins: f.wins,
      winLabel: stageLabel(winStage),
      firstSales: f.firstSales,
      rates: { visitsToRecruits: rateText(rows.length, traffic.visits, rows.length, min), recruitsToWins: rateText(f.wins, rows.length, rows.length, min), tooEarly },
    };
  });
  const rankedRecruit = [...recruitScores].sort((a, b) => b.wins - a.wins || b.firstSales - a.firstSales || b.recruits - a.recruits || a.name.localeCompare(b.name));
  const unRecruits = recruits.filter((r) => r.questId == null);
  const byHeard = new Map<string, RecruitRow[]>();
  for (const r of unRecruits) byHeard.set(r.foundVia || "", [...(byHeard.get(r.foundVia || "") ?? []), r]);
  const unattributedRecruits: UnattributedRecruitRow[] = [...byHeard.entries()]
    .map(([foundVia, rows]) => ({ foundVia, label: foundVia ? heardAboutLabel(foundVia) : "No answer", recruits: rows.length, wins: recruitFunnel(rows, winStage).wins }))
    .sort((a, b) => b.wins - a.wins || b.recruits - a.recruits || a.label.localeCompare(b.label));

  const questScores: QuestScore[] = quests.map((q) => {
    const qSlots = slots.filter((s) => s.questId === q.id);
    const qLeads = leads.filter((l) => l.questId === q.id);
    const qEvents = events.filter((e) => e.questId === q.id);
    const funnel = funnelOf(qLeads);
    const traffic = trafficOf(qEvents);
    const eng = engagementOf(qSlots);
    const tooEarly = funnel.leads < min;
    const perPost: PostScore[] = qSlots
      .filter((s) => s.postSlug)
      .map((s) => {
        const pl = qLeads.filter((l) => l.slotId === s.id);
        const pe = qEvents.filter((e) => e.slotId === s.id);
        const st = s.stats ?? {};
        return {
          slotId: s.id,
          postSlug: s.postSlug,
          topic: s.topic,
          date: s.date,
          generator: s.generator,
          views: n(st.views),
          engagement: n(st.likes) + n(st.comments) + n(st.shares) + n(st.saves),
          ...funnelOf(pl),
          ...trafficOf(pe),
        };
      });
    return {
      questId: q.id,
      name: q.name,
      slug: q.slug,
      status: q.status,
      startDate: q.startDate,
      endDate: q.endDate,
      profileName: q.profileName,
      ...funnel,
      ...eng,
      ...traffic,
      rates: {
        visitsToLeads: rateText(funnel.leads, traffic.visits, funnel.leads, min),
        leadsToBooked: rateText(funnel.booked, funnel.leads, funnel.leads, min),
        tooEarly,
      },
      perPost: rankByBookings(perPost.map((p) => ({ ...p, name: p.postSlug }))).map(({ name: _n, ...rest }) => {
        void _n;
        return rest;
      }),
    };
  });

  // Unattributed leads, grouped by what the person said (Section 9.2).
  const un = leads.filter((l) => l.questId == null);
  const byVia = new Map<string, LeadRow[]>();
  for (const l of un) {
    const k = l.foundVia || "";
    byVia.set(k, [...(byVia.get(k) ?? []), l]);
  }
  const unattributed: UnattributedRow[] = rankByBookings(
    [...byVia.entries()].map(([foundVia, rows]) => {
      const f = funnelOf(rows);
      return { foundVia, label: foundVia ? foundViaLabel(foundVia) : "No answer", name: foundVia ? foundViaLabel(foundVia) : "No answer", leads: f.leads, booked: f.booked, sold: f.sold };
    }),
  ).map(({ name: _n, ...rest }) => {
    void _n;
    return rest;
  });

  // By series (Section 9.3). Recurring shows total across quests naturally,
  // because their slots all point at the one series row.
  const seriesScores: GroupScore[] = series
    .map((s) => {
      const sSlots = slots.filter((x) => x.seriesId === s.id);
      const eng = engagementOf(sSlots);
      const tracked = Boolean(s.slug);
      const sLeads = tracked ? leads.filter((l) => l.seriesId === s.id) : [];
      const f = funnelOf(sLeads);
      return {
        id: `series:${s.id}`,
        name: s.kind === "recurring" ? `${s.name} (show)` : s.name,
        ...eng,
        tracked,
        leads: f.leads,
        booked: f.booked,
        sold: f.sold,
        note: tracked ? "" : "Bookings not tracked separately. Add a series link to compare.",
      };
    })
    .filter((g) => g.posts > 0 || g.leads > 0);

  // By generator. Bookings can only be split per generator through per-post
  // links, since a lead's slot tells us which generator made the post.
  const genScores: GroupScore[] = QUEST_CONFIG.generators
    .map((g) => {
      const gSlots = slots.filter((s) => s.generator === g.id);
      const eng = engagementOf(gSlots);
      const gLeads = leads.filter((l) => l.slotId != null && slotById.get(l.slotId)?.generator === g.id);
      const tracked = gSlots.some((s) => s.postSlug);
      const f = funnelOf(gLeads);
      return {
        id: `generator:${g.id}`,
        name: generatorById(g.id)?.label ?? g.id,
        ...eng,
        tracked,
        leads: f.leads,
        booked: f.booked,
        sold: f.sold,
        note: tracked ? "" : "Bookings not tracked separately. Add a post link to compare.",
      };
    })
    .filter((g) => g.posts > 0 || g.leads > 0);

  // Wrap-up prompts (Section 9.4): the end date has passed and there is no retro yet.
  const wrapUps: WrapUpPrompt[] = input.quests
    .filter((q) => q.endDate && q.endDate < today && !q.retro.trim() && q.status !== "planning")
    .map((q) => ({ questId: q.id, name: q.name, endDate: q.endDate, status: q.status }))
    .sort((a, b) => b.endDate.localeCompare(a.endDate));

  // Groups with booking data rank first; engagement-only rows sit below them.
  const rankGroups = (rows: GroupScore[]) => [...rankByBookings(rows.filter((r) => r.tracked)), ...rankByBookings(rows.filter((r) => !r.tracked))];
  const ranked = rankByBookings(questScores);
  return {
    quests: ranked,
    recruitQuests: rankedRecruit,
    unattributedRecruits,
    unattributedRecruitsTotal: unRecruits.length,
    winStage,
    unattributed,
    unattributedTotal: un.length,
    series: rankGroups(seriesScores),
    generators: rankGroups(genScores),
    wrapUps,
    minLeadsForRates: min,
    empty: ranked.every((q) => q.leads === 0 && q.visits === 0 && q.posts === 0) && un.length === 0 && rankedRecruit.every((q) => q.recruits === 0 && q.visits === 0 && q.posts === 0) && unRecruits.length === 0,
  };
}
