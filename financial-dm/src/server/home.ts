import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { ensureLeadsTable, quizTypeLabel } from "~/server/leads";
import { ensureGuildTables } from "~/server/guild";
import { ensureQuestTables } from "~/server/quests";
import { parseStatusHistory } from "~/lib/attribution";
import { needsNudge, parseQuestLog, stageIndex } from "~/lib/questLog";
import { sourceLabel } from "~/lib/guildConfig";
import { SHELL_CONFIG } from "~/lib/adminShell";
import { EMPTY_CARD, daysUntil, dayWord, isCold, todayYmd, waitingFor, weekStartIso, type HomeCard, type HomeItem } from "~/lib/home";

/**
 * The Tavern Keeper's Morning, data side (spec, Sections 5 and 6). One
 * small server function per card so the page loads them in parallel and
 * shows each as it arrives (Rule 2.6). Every query is capped. Read-only:
 * nothing here changes a record (Rule 2.3), and nothing goes to an AI
 * model (Rule 2.5). Cards show names and which quiz, never dollar figures
 * or individual answers.
 */

const LIMIT = SHELL_CONFIG.cardItemLimit;
const n = (v: unknown) => Number(v ?? 0);
const s = (v: unknown) => String(v ?? "");

/** Card 1: leads at New, newest first. */
export const getHomeNewLeads = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    await ensureLeadsTable();
    const [c] = (await sql()`SELECT count(*)::int AS n FROM leads WHERE status = 'New'`) as Array<{ n: number }>;
    const count = n(c?.n);
    if (!count) return EMPTY_CARD;
    const rows = (await sql()`SELECT id, name, quiz_type, quiz_result, created_at FROM leads WHERE status = 'New' ORDER BY created_at DESC LIMIT ${LIMIT}`) as Array<Record<string, unknown>>;
    const now = new Date();
    return {
      count,
      href: "/admin/leads",
      items: rows.map((r) => ({
        id: n(r.id),
        title: s(r.name),
        meta: [quizTypeLabel(s(r.quiz_type)), s(r.quiz_result), `waiting ${waitingFor(s(r.created_at), now)}`].filter(Boolean).join(" · "),
        href: `/admin/leads?lead=${n(r.id)}`,
      })),
    };
  });

/** Card 6: leads at Contacted with no status change for the cold threshold. Oldest first. */
export const getHomeColdLeads = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    await ensureLeadsTable();
    const rows = (await sql()`SELECT id, name, quiz_type, status_history, created_at FROM leads WHERE status = 'Contacted' ORDER BY created_at ASC LIMIT 200`) as Array<Record<string, unknown>>;
    const now = new Date();
    const cold = rows
      .map((r) => {
        const h = parseStatusHistory(r.status_history);
        const last = h.length ? h[h.length - 1].at : s(r.created_at);
        return { r, last };
      })
      .filter((x) => isCold(x.last, now))
      .sort((a, b) => Date.parse(a.last) - Date.parse(b.last));
    if (!cold.length) return EMPTY_CARD;
    return {
      count: cold.length,
      href: "/admin/leads",
      items: cold.slice(0, LIMIT).map(({ r, last }) => ({
        id: n(r.id),
        title: s(r.name),
        meta: `${quizTypeLabel(s(r.quiz_type))} · contacted ${waitingFor(last, now)} ago`,
        href: `/admin/leads?lead=${n(r.id)}`,
      })),
    };
  });

/** Card 3: recruits at Interested, plus anyone whose Quest Log has gone quiet. */
export const getHomeRecruits = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    await ensureGuildTables();
    const now = new Date();
    const waiting = (await sql()`SELECT id, name, source, created_at FROM recruits WHERE stage = 'interested' ORDER BY created_at DESC LIMIT 50`) as Array<Record<string, unknown>>;
    const logs = (await sql()`SELECT id, name, quest_log FROM recruits WHERE quest_log IS NOT NULL AND stage <> 'not_moving_forward' LIMIT 200`) as Array<Record<string, unknown>>;
    const stalled = logs.filter((r) => {
      const log = parseQuestLog(r.quest_log);
      return log && needsNudge(log, now);
    });
    const count = waiting.length + stalled.length;
    if (!count) return EMPTY_CARD;
    const items: HomeItem[] = [
      ...waiting.map((r) => ({ id: n(r.id), title: s(r.name), meta: `${sourceLabel(s(r.source))} · waiting ${waitingFor(s(r.created_at), now)}`, href: "/admin/guild?view=recruits" })),
      ...stalled.map((r) => ({ id: n(r.id), title: s(r.name), meta: "Quest Log quiet for a week", href: "/admin/guild?view=questlogs", tag: "stalled" })),
    ];
    return { count, href: "/admin/guild?view=recruits", items: items.slice(0, LIMIT) };
  });

/** Card 5: approved posts due within the film window, and approved posts whose date has passed unposted. */
export const getHomeFilmNext = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    await ensureQuestTables();
    const today = todayYmd();
    const horizon = new Date(Date.parse(`${today}T12:00:00Z`) + SHELL_CONFIG.filmWindowDays * 86_400_000).toISOString().slice(0, 10);
    const [c] = (await sql()`SELECT count(*)::int AS n FROM content_slots WHERE status = 'approved' AND date <= ${horizon}`) as Array<{ n: number }>;
    const count = n(c?.n);
    if (!count) return EMPTY_CARD;
    const rows = (await sql()`
      SELECT sl.id, sl.quest_id, sl.topic, sl.date, sl.platform, q.name FROM content_slots sl LEFT JOIN quests q ON q.id = sl.quest_id
      WHERE sl.status = 'approved' AND sl.date <= ${horizon} ORDER BY sl.date ASC LIMIT ${LIMIT}`) as Array<Record<string, unknown>>;
    return {
      count,
      href: "/admin/quests?section=quests",
      items: rows.map((r) => {
        const missed = daysUntil(s(r.date), today) < 0;
        return {
          id: n(r.id),
          title: s(r.topic) || "Untitled post",
          meta: [s(r.name), s(r.platform), missed ? `was due ${dayWord(s(r.date), today)}` : `post ${dayWord(s(r.date), today)}`].filter(Boolean).join(" · "),
          href: `/admin/quests?section=quests&quest=${n(r.quest_id)}`,
          ...(missed ? { tag: "missed" } : {}),
        };
      }),
    };
  });

export interface QuestStatusCard extends HomeCard {
  /** End dates of active quests ending within a week, for the day line. */
  endingSoon: string[];
  needsRetro: number;
}

/** Card 7: each active quest's days left, posts out of planned, and bookings; plus ended quests without a wrap-up. */
export const getHomeQuestStatus = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<QuestStatusCard> => {
    await Promise.all([ensureQuestTables(), ensureLeadsTable()]);
    const today = todayYmd();
    const active = (await sql()`SELECT id, name, end_date FROM quests WHERE status = 'active' ORDER BY end_date ASC LIMIT 20`) as Array<Record<string, unknown>>;
    const slotRows = (await sql()`SELECT sl.quest_id, sl.status FROM content_slots sl JOIN quests q ON q.id = sl.quest_id WHERE q.status = 'active'`) as Array<Record<string, unknown>>;
    const bookRows = (await sql()`SELECT l.quest_id, count(*)::int AS n FROM leads l JOIN quests q ON q.id = l.quest_id WHERE q.status = 'active' AND l.status IN ('Booked', 'Showed', 'Sold') GROUP BY l.quest_id`) as Array<Record<string, unknown>>;
    const retro = (await sql()`SELECT id, name, end_date FROM quests WHERE (status = 'complete' OR (status = 'active' AND end_date <> '' AND end_date < ${today})) AND (retro IS NULL OR retro = '') ORDER BY end_date DESC LIMIT 10`) as Array<Record<string, unknown>>;
    const planned = new Map<number, number>();
    const posted = new Map<number, number>();
    for (const r of slotRows) {
      const q = n(r.quest_id);
      if (s(r.status) !== "skipped") planned.set(q, (planned.get(q) ?? 0) + 1);
      if (s(r.status) === "posted") posted.set(q, (posted.get(q) ?? 0) + 1);
    }
    const booked = new Map(bookRows.map((r) => [n(r.quest_id), n(r.n)]));
    const endingSoon: string[] = [];
    const items: HomeItem[] = active.map((r) => {
      const id = n(r.id);
      const end = s(r.end_date);
      const left = end ? daysUntil(end, today) : null;
      if (left !== null && left >= 0 && left <= 7) endingSoon.push(end);
      const leftText = left === null ? "no end date" : left < 0 ? `ended ${dayWord(end, today)}` : left === 0 ? "ends today" : `${left} day${left === 1 ? "" : "s"} left`;
      const b = booked.get(id) ?? 0;
      return { id, title: s(r.name), meta: `${leftText} · ${posted.get(id) ?? 0} of ${planned.get(id) ?? 0} posts published · ${b} booked`, href: `/admin/quests?section=quests&quest=${id}` };
    });
    const activeIds = new Set(items.map((i) => i.id));
    const retroItems: HomeItem[] = retro
      .filter((r) => !activeIds.has(n(r.id)) || true)
      .map((r) => ({ id: n(r.id), title: s(r.name), meta: "Ended. Write the wrap-up so the next quest starts smarter.", href: "/admin/quests?section=scoreboard", tag: "wrap-up" }));
    const all = [...items, ...retroItems];
    if (!all.length) return { ...EMPTY_CARD, endingSoon: [], needsRetro: 0 };
    return { count: all.length, href: "/admin/quests?section=quests", items: all.slice(0, Math.max(LIMIT, items.length)), endingSoon, needsRetro: retroItems.length };
  });

export interface HomeNumbers {
  weekStart: string;
  newLeads: number;
  booked: number;
  sold: number;
  postsPublished: number;
  activeQuests: number;
  recruitsWon: number;
  recruitsInProgress: number;
  winStage: "contracted" | "first_sale";
}

/** Section 6.1: raw counts for this week and the pipeline. No rates. */
export const getHomeNumbers = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeNumbers> => {
    await Promise.all([ensureLeadsTable(), ensureQuestTables(), ensureGuildTables()]);
    const weekStart = weekStartIso();
    const weekDate = weekStart.slice(0, 10);
    const [nl] = (await sql()`SELECT count(*)::int AS n FROM leads WHERE created_at >= ${weekStart}`) as Array<{ n: number }>;
    const moved = (await sql()`SELECT status_history FROM leads WHERE status IN ('Booked', 'Showed', 'Sold') ORDER BY created_at DESC LIMIT 500`) as Array<Record<string, unknown>>;
    let booked = 0;
    let sold = 0;
    const since = Date.parse(weekStart);
    for (const r of moved) {
      const h = parseStatusHistory(r.status_history);
      if (h.some((x) => x.status === "Booked" && Date.parse(x.at) >= since)) booked += 1;
      if (h.some((x) => x.status === "Sold" && Date.parse(x.at) >= since)) sold += 1;
    }
    const [pp] = (await sql()`SELECT count(*)::int AS n FROM content_slots WHERE status = 'posted' AND date >= ${weekDate}`) as Array<{ n: number }>;
    const [aq] = (await sql()`SELECT count(*)::int AS n FROM quests WHERE status = 'active'`) as Array<{ n: number }>;
    const [ws] = (await sql()`SELECT value FROM guild_facts WHERE key = 'winStage'`) as Array<{ value: string }>;
    const winStage = ws?.value === "first_sale" ? "first_sale" : "contracted";
    const stages = (await sql()`SELECT stage, count(*)::int AS n FROM recruits GROUP BY stage`) as Array<Record<string, unknown>>;
    const winIdx = stageIndex(winStage);
    let recruitsWon = 0;
    let recruitsInProgress = 0;
    for (const r of stages) {
      const st = s(r.stage);
      if (st === "not_moving_forward") continue;
      const idx = stageIndex(st);
      if (idx >= winIdx) recruitsWon += n(r.n);
      else recruitsInProgress += n(r.n);
    }
    return { weekStart, newLeads: n(nl?.n), booked, sold, postsPublished: n(pp?.n), activeQuests: n(aq?.n), recruitsWon, recruitsInProgress, winStage };
  });
