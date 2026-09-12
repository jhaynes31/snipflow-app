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
import { EMPTY_CARD, clockTime, daysUntil, dayWord, isCold, todayYmd, waitingFor, weekStartIso, ymdInZone, type HomeCard, type HomeItem } from "~/lib/home";
import { calendlyAvailable, upcomingAppointments } from "~/server/calendly.server";
import { isDismissed, loadDismissals, type Dismissals } from "~/server/homeState";
import { collectApprovals } from "~/server/approvals";

/**
 * The Tavern Keeper's Morning, data side (spec, Sections 5 and 6). One
 * small server function per card so the page loads them in parallel and
 * shows each as it arrives (Rule 2.6). Every query is capped. Read-only:
 * nothing here changes a record (Rule 2.3), and nothing goes to an AI
 * model (Rule 2.5). Cards show names and which quiz, never dollar figures
 * or individual answers.
 */

const LIMIT = SHELL_CONFIG.cardItemLimit;
/** Rows fetched per card before dismissals are applied, so the count stays honest at John's volumes. */
const WINDOW = 50;
const n = (v: unknown) => Number(v ?? 0);
const s = (v: unknown) => String(v ?? "");

/** Drops dismissed items (whose state has not changed) and builds the card from what is left. */
function finish(items: HomeItem[], href: string, d: Dismissals, extra?: Record<string, unknown>): HomeCard & Record<string, unknown> {
  const live = items.filter((it) => !isDismissed(d, it.key, it.sig));
  if (!live.length) return { ...EMPTY_CARD, ...(extra ?? {}) };
  return { count: live.length, href, items: live.slice(0, LIMIT), ...(extra ?? {}) };
}

/** Card 1: leads at New, newest first. */
export const getHomeNewLeads = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    const [d] = await Promise.all([loadDismissals(), ensureLeadsTable()]);
    const rows = (await sql()`SELECT id, name, quiz_type, quiz_result, created_at FROM leads WHERE status = 'New' ORDER BY created_at DESC LIMIT ${WINDOW}`) as Array<Record<string, unknown>>;
    const now = new Date();
    return finish(
      rows.map((r) => ({
        id: n(r.id),
        title: s(r.name),
        meta: [quizTypeLabel(s(r.quiz_type)), s(r.quiz_result), `waiting ${waitingFor(s(r.created_at), now)}`].filter(Boolean).join(" · "),
        href: `/admin/leads?lead=${n(r.id)}`,
        key: `lead:${n(r.id)}`,
        sig: `New|${s(r.created_at)}`,
      })),
      "/admin/leads",
      d,
    );
  });

/** Card 6: leads at Contacted with no status change for the cold threshold. Oldest first. */
export const getHomeColdLeads = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    const [d] = await Promise.all([loadDismissals(), ensureLeadsTable()]);
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
    return finish(
      cold.map(({ r, last }) => ({
        id: n(r.id),
        title: s(r.name),
        meta: `${quizTypeLabel(s(r.quiz_type))} · contacted ${waitingFor(last, now)} ago`,
        href: `/admin/leads?lead=${n(r.id)}`,
        key: `lead:${n(r.id)}`,
        sig: `Contacted|${last}`,
      })),
      "/admin/leads",
      d,
    );
  });

/** Card 3: recruits at Interested, plus anyone whose Quest Log has gone quiet. */
export const getHomeRecruits = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    const [d] = await Promise.all([loadDismissals(), ensureGuildTables()]);
    const now = new Date();
    const waiting = (await sql()`SELECT id, name, source, created_at FROM recruits WHERE stage = 'interested' ORDER BY created_at DESC LIMIT 50`) as Array<Record<string, unknown>>;
    const logs = (await sql()`SELECT id, name, quest_log FROM recruits WHERE quest_log IS NOT NULL AND stage <> 'not_moving_forward' LIMIT 200`) as Array<Record<string, unknown>>;
    const stalled = logs
      .map((r) => ({ r, log: parseQuestLog(r.quest_log) }))
      .filter((x) => x.log && needsNudge(x.log, now));
    const items: HomeItem[] = [
      ...waiting.map((r) => ({ id: n(r.id), title: s(r.name), meta: `${sourceLabel(s(r.source))} · waiting ${waitingFor(s(r.created_at), now)}`, href: "/admin/guild?view=recruits", key: `recruit:${n(r.id)}`, sig: `interested|${s(r.created_at)}` })),
      ...stalled.map(({ r, log }) => ({ id: n(r.id), title: s(r.name), meta: `Quest Log quiet for ${SHELL_CONFIG.stallDays} days`, href: "/admin/guild?view=questlogs", tag: "stalled", key: `recruitlog:${n(r.id)}`, sig: `stalled|${log!.lastProgressAt}` })),
    ];
    return finish(items, "/admin/guild?view=recruits", d);
  });

/** Card 5: approved posts due within the film window, and approved posts whose date has passed unposted. */
export const getHomeFilmNext = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    const [d] = await Promise.all([loadDismissals(), ensureQuestTables()]);
    const today = todayYmd();
    const horizon = new Date(Date.parse(`${today}T12:00:00Z`) + SHELL_CONFIG.filmWindowDays * 86_400_000).toISOString().slice(0, 10);
    const rows = (await sql()`
      SELECT sl.id, sl.quest_id, sl.topic, sl.date, sl.platform, q.name FROM content_slots sl LEFT JOIN quests q ON q.id = sl.quest_id
      WHERE sl.status = 'approved' AND sl.date <= ${horizon} ORDER BY sl.date ASC LIMIT ${WINDOW}`) as Array<Record<string, unknown>>;
    return finish(
      rows.map((r) => {
        const missed = daysUntil(s(r.date), today) < 0;
        return {
          id: n(r.id),
          title: s(r.topic) || "Untitled post",
          meta: [s(r.name), s(r.platform), missed ? `was due ${dayWord(s(r.date), today)}` : `post ${dayWord(s(r.date), today)}`].filter(Boolean).join(" · "),
          href: `/admin/quests?section=quests&quest=${n(r.quest_id)}`,
          ...(missed ? { tag: "missed" } : {}),
          key: `slot:${n(r.id)}`,
          sig: `approved|${s(r.date)}`,
        };
      }),
      "/admin/quests?section=quests",
      d,
    );
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
    const [d] = await Promise.all([loadDismissals(), ensureQuestTables(), ensureLeadsTable()]);
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
      const p = posted.get(id) ?? 0;
      return { id, title: s(r.name), meta: `${leftText} · ${p} of ${planned.get(id) ?? 0} posts published · ${b} booked`, href: `/admin/quests?section=quests&quest=${id}`, key: `quest:${id}`, sig: `active|${end}|${p}|${b}` };
    });
    const retroItems: HomeItem[] = retro.map((r) => ({ id: n(r.id), title: s(r.name), meta: "Ended. Write the wrap-up so the next quest starts smarter.", href: "/admin/quests?section=scoreboard", tag: "wrap-up", key: `questretro:${n(r.id)}`, sig: "needs-retro" }));
    const live = [...items, ...retroItems].filter((it) => !isDismissed(d, it.key, it.sig));
    if (!live.length) return { ...EMPTY_CARD, endingSoon: [], needsRetro: 0 };
    const liveActive = live.filter((it) => !it.tag).length;
    return { count: live.length, href: "/admin/quests?section=quests", items: live.slice(0, Math.max(LIMIT, liveActive)), endingSoon, needsRetro: live.length - liveActive };
  });

export interface AppointmentsCard extends HomeCard {
  /** False when no booking source is connected: the card does not render (Rule 2.2). */
  available: boolean;
  error?: string;
  today: number;
}

/** Card 2: today's and tomorrow's Calendly appointments, matched to leads by email where possible. */
export const getHomeAppointments = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<AppointmentsCard> => {
    if (!calendlyAvailable()) return { ...EMPTY_CARD, available: false, today: 0 };
    const [d, cal] = await Promise.all([loadDismissals(), upcomingAppointments()]);
    if (cal.error) return { ...EMPTY_CARD, available: true, error: cal.error, today: 0 };
    await ensureLeadsTable();
    const emails = cal.appointments.map((a) => a.inviteeEmail).filter(Boolean);
    const leads = new Map<string, { id: number; quiz: string; result: string }>();
    if (emails.length) {
      // One query per email keeps the shim and Postgres both happy at these volumes.
      for (const e of Array.from(new Set(emails)).slice(0, 20)) {
        const rows = (await sql()`SELECT id, quiz_type, quiz_result FROM leads WHERE lower(email) = ${e} ORDER BY created_at DESC LIMIT 1`) as Array<Record<string, unknown>>;
        if (rows[0]) leads.set(e, { id: n(rows[0].id), quiz: quizTypeLabel(s(rows[0].quiz_type)), result: s(rows[0].quiz_result) });
      }
    }
    const today = todayYmd();
    const items: HomeItem[] = cal.appointments.map((a) => {
      const day = ymdInZone(a.startIso) === today ? "today" : "tomorrow";
      const lead = a.inviteeEmail ? leads.get(a.inviteeEmail) : undefined;
      return {
        id: 0,
        title: a.inviteeName || a.eventName || "Appointment",
        meta: [`${clockTime(a.startIso)} ${day}`, a.eventName, lead ? [lead.quiz, lead.result].filter(Boolean).join(", ") : "not from a quiz"].filter(Boolean).join(" · "),
        href: lead ? `/admin/leads?lead=${lead.id}` : "/admin/leads",
        key: `appt:${a.id}`,
        sig: a.startIso,
        ...(day === "today" ? { tag: "today" } : {}),
      };
    });
    const live = items.filter((it) => !isDismissed(d, it.key, it.sig));
    const todayCount = live.filter((it) => it.tag === "today").length;
    if (!live.length) return { ...EMPTY_CARD, available: true, today: 0 };
    return { count: live.length, href: "/admin/leads", items: live.slice(0, LIMIT), available: true, today: todayCount };
  });

/** Card 4: counts by type from the shared approvals registry, linking to the queue. */
export const getHomeApprovals = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<HomeCard> => {
    const [d, sum] = await Promise.all([loadDismissals(), collectApprovals()]);
    const items: HomeItem[] = sum.groups.map((g, i) => ({
      id: i + 1,
      title: `${g.count} ${g.type}`,
      meta: `${g.tool}${g.blocking ? " · blocking until done" : ""}`,
      href: g.href,
      ...(g.blocking ? { tag: "blocking" } : {}),
      key: `approvals:${g.id}`,
      sig: `${g.count}`,
    }));
    const live = items.filter((it) => !isDismissed(d, it.key, it.sig));
    if (!live.length) return EMPTY_CARD;
    const count = sum.groups.filter((g) => live.some((it) => it.key === `approvals:${g.id}`)).reduce((t, g) => t + g.count, 0);
    return { count, href: "/admin/approvals", items: live.slice(0, LIMIT) };
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
