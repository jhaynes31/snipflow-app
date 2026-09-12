import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureEventsTable } from "~/server/attribution.server";
import { ensureLeadsTable } from "~/server/leads";
import { ensureGuildTables } from "~/server/guild";
import { ensureQuestTables } from "~/server/quests";
import { buildScoreboard, type EventRow, type LeadRow, type QuestRow, type RecruitRow, type Scoreboard, type SeriesRow, type SlotRow } from "~/lib/scoreboard";
import { generatorById, type GeneratorId } from "~/lib/questConfig";

/**
 * The Scoreboard (Quest Board spec, Section 9): raw counts per quest, per
 * post, per series, and per generator, plus the unattributed leads. Only
 * counts leave this function; no lead names, emails, or answers.
 */

const parseJson = <T,>(v: unknown, fallback: T): T => {
  try {
    return (JSON.parse(String(v ?? "")) ?? fallback) as T;
  } catch {
    return fallback;
  }
};
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

export const getScoreboard = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Scoreboard> => {
    await Promise.all([ensureQuestTables(), ensureLeadsTable(), ensureEventsTable(), ensureGuildTables()]);
    const [qRows, sRows, srRows, lRows, eRows, rRows, wRows] = await Promise.all([
      sql()`SELECT q.id, q.name, q.slug, q.status, q.goal, q.start_date, q.end_date, q.retro, p.name AS profile_name FROM quests q LEFT JOIN client_profiles p ON p.id = q.profile_id` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT id, quest_id, generator, series_id, status, post_slug, stats, topic, date FROM content_slots` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT id, name, kind, quest_id, slug FROM quest_series` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT quest_id, series_id, slot_id, status, not_a_fit_reason, found_via FROM leads` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT kind, quest_id, series_id, slot_id, quiz FROM campaign_events` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT quest_id, series_id, slot_id, source, stage, not_moving_reason, found_via FROM recruits` as Promise<Array<Record<string, unknown>>>,
      sql()`SELECT value FROM guild_facts WHERE key = 'winStage'` as Promise<Array<Record<string, unknown>>>,
    ]);

    const quests: QuestRow[] = qRows.map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      slug: String(r.slug ?? ""),
      goal: r.goal === "recruits" ? "recruits" : "booked_calls",
      status: r.status === "active" || r.status === "complete" ? r.status : "planning",
      startDate: String(r.start_date ?? ""),
      endDate: String(r.end_date ?? ""),
      retro: String(r.retro ?? ""),
      profileName: String(r.profile_name ?? ""),
    }));
    const slots: SlotRow[] = sRows.map((r) => ({
      id: Number(r.id),
      questId: Number(r.quest_id),
      generator: (generatorById(String(r.generator))?.id ?? "script") as GeneratorId,
      seriesId: num(r.series_id),
      status: String(r.status ?? "idea"),
      postSlug: String(r.post_slug ?? ""),
      stats: parseJson(r.stats, {}),
      topic: String(r.topic ?? ""),
      date: String(r.date ?? ""),
    }));
    const series: SeriesRow[] = srRows.map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      kind: r.kind === "multi_part" ? "multi_part" : "recurring",
      questId: num(r.quest_id),
      slug: String(r.slug ?? ""),
    }));
    const leads: LeadRow[] = lRows.map((r) => ({
      questId: num(r.quest_id),
      seriesId: num(r.series_id),
      slotId: num(r.slot_id),
      status: String(r.status ?? "New"),
      notAFitReason: String(r.not_a_fit_reason ?? ""),
      foundVia: String(r.found_via ?? ""),
    }));
    const events: EventRow[] = eRows
      .filter((r) => r.kind === "visit" || r.kind === "quiz_start" || r.kind === "quiz_complete")
      .map((r) => ({ kind: r.kind as EventRow["kind"], questId: num(r.quest_id), seriesId: num(r.series_id), slotId: num(r.slot_id), quiz: String(r.quiz ?? "") }));

    const recruits: RecruitRow[] = rRows.map((r) => ({
      questId: num(r.quest_id),
      seriesId: num(r.series_id),
      slotId: num(r.slot_id),
      source: String(r.source ?? "manual"),
      stage: String(r.stage ?? "interested"),
      notMovingReason: String(r.not_moving_reason ?? ""),
      foundVia: String(r.found_via ?? ""),
    }));
    const winStage = wRows[0]?.value === "first_sale" ? "first_sale" : "contracted";
    return buildScoreboard({ quests, slots, series, leads, events, recruits, winStage, today: new Date().toISOString().slice(0, 10) });
  });

/** Quest wrap-up (Section 9.4): store John's retro and, if asked, close the quest. */
export const saveQuestRetro = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { questId: number; retro: string; markComplete?: boolean }) => ({
    questId: Number(d?.questId),
    retro: String(d?.retro ?? "").trim().slice(0, 2000),
    markComplete: Boolean(d?.markComplete),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureQuestTables();
      if (data.markComplete) await sql()`UPDATE quests SET retro = ${data.retro}, status = 'complete', updated_at = NOW() WHERE id = ${data.questId}`;
      else await sql()`UPDATE quests SET retro = ${data.retro}, updated_at = NOW() WHERE id = ${data.questId}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
