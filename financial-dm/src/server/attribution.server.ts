import { getCookie } from "@tanstack/react-start/server";
import { sql } from "~/db";
import {
  CAMPAIGN_COOKIE,
  CAMPAIGN_MARKER_COOKIE,
  decodeCampaignCookie,
  encodeCampaignCookie,
  pushTag,
  tagIsFresh,
  type CampaignCookie,
  type CampaignTag,
} from "~/lib/attribution";
import { QUEST_CONFIG, type QuizId } from "~/lib/questConfig";
import { normalizeSlug } from "~/lib/questPlan";
import { ensureQuestTables } from "~/server/quests";

/**
 * Server half of campaign attribution (Quest Board spec, Section 8).
 *
 *  - `handleCampaignLink` turns thefinancialdm.com/<slug> into a redirect to
 *    the right quiz and remembers the visit in a first-party cookie.
 *  - `currentAttribution` reads that cookie when a lead is saved.
 *  - `recordCampaignEvent` keeps the raw counts the scoreboard needs.
 *
 * Server only: import from server functions and route handlers, never from
 * component code.
 */

export type CampaignEventKind = "visit" | "quiz_start" | "quiz_complete";

// ── Events table ──────────────────────────────────────────────────

let eventsReady: Promise<void> | null = null;
export function ensureEventsTable(): Promise<void> {
  if (!eventsReady) {
    eventsReady = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS campaign_events (
          id SERIAL PRIMARY KEY,
          kind TEXT NOT NULL,
          quest_id INTEGER,
          series_id INTEGER,
          slot_id INTEGER,
          slug TEXT DEFAULT '',
          platform TEXT DEFAULT '',
          quiz TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
    })().catch((e) => {
      eventsReady = null;
      throw e;
    });
  }
  return eventsReady;
}

/** Never throws: a counting failure must not break a redirect or a lead save. */
export async function recordCampaignEvent(kind: CampaignEventKind, tag: CampaignTag, quiz: QuizId | "" = ""): Promise<void> {
  try {
    await ensureEventsTable();
    await sql()`
      INSERT INTO campaign_events (kind, quest_id, series_id, slot_id, slug, platform, quiz)
      VALUES (${kind}, ${tag.questId}, ${tag.seriesId ?? null}, ${tag.slotId ?? null}, ${tag.slug}, ${tag.platform}, ${quiz})
    `;
  } catch (e) {
    console.warn("[campaign] event not recorded:", e);
  }
}

// ── Slug lookup ───────────────────────────────────────────────────

export interface ResolvedLink {
  tag: Omit<CampaignTag, "at">;
  /** The quiz the link leads to, or "" for a recruiting quest. */
  quiz: QuizId | "";
  /** Where the redirect goes: a quiz, the Guild Hall, or the fit quiz. */
  dest: string;
}

type QuestRowLite = { id: number; platforms: string; offer_quiz: string; goal?: string | null; recruit_offer?: string | null };

/** A recruiting quest sends people to the Guild Hall (or the fit quiz); a client quest to its quiz (recruiting spec, Section 7.1). */
function destinationOf(q: QuestRowLite | null): { quiz: QuizId | ""; dest: string } {
  if (q?.goal === "recruits") return { quiz: "", dest: q.recruit_offer === "fit_quiz" ? "/guild/quiz" : "/guild" };
  const quiz: QuizId = q?.offer_quiz === "financial" ? "financial" : "life_insurance";
  return { quiz, dest: QUEST_CONFIG.quizzes[quiz].path };
}

const parseList = <T,>(v: unknown, fallback: T): T => {
  try {
    return (JSON.parse(String(v ?? "")) ?? fallback) as T;
  } catch {
    return fallback;
  }
};

const firstPlatform = (platforms: unknown): string => parseList<string[]>(platforms, ["tiktok"])[0] ?? "tiktok";

/**
 * Which quest, series, or post a slug belongs to. Quest links come first,
 * then series links, then per-post links. Retired quests keep resolving, so
 * an old video that still sends people keeps getting the credit.
 */
export async function resolveCampaignSlug(raw: string): Promise<ResolvedLink | null> {
  const slug = normalizeSlug(raw);
  if (!slug || slug.length > 40) return null;
  await ensureQuestTables();

  const quests = (await sql()`SELECT id, platforms, offer_quiz, goal, recruit_offer FROM quests WHERE slug = ${slug} ORDER BY id DESC LIMIT 1`) as QuestRowLite[];
  if (quests.length) {
    const q = quests[0];
    return { tag: { questId: Number(q.id), slug, platform: firstPlatform(q.platforms) }, ...destinationOf(q) };
  }

  const series = (await sql()`SELECT id, quest_id FROM quest_series WHERE slug = ${slug} ORDER BY id DESC LIMIT 1`) as Array<{ id: number; quest_id: number | null }>;
  if (series.length) {
    const s = series[0];
    let questRow: QuestRowLite | null = null;
    if (s.quest_id != null) {
      const rows = (await sql()`SELECT id, platforms, offer_quiz, goal, recruit_offer FROM quests WHERE id = ${s.quest_id}`) as QuestRowLite[];
      questRow = rows[0] ?? null;
    } else {
      // A recurring show spans quests: credit the active quest that runs it,
      // or the newest one that ever did.
      const rows = (await sql()`SELECT id, platforms, offer_quiz, goal, recruit_offer, status, show_ids FROM quests ORDER BY (status = 'active') DESC, id DESC`) as Array<QuestRowLite & { status: string; show_ids: string }>;
      questRow = rows.find((r) => parseList<number[]>(r.show_ids, []).map(Number).includes(Number(s.id))) ?? null;
    }
    return {
      tag: { questId: questRow ? Number(questRow.id) : null, slug, platform: questRow ? firstPlatform(questRow.platforms) : "tiktok", seriesId: Number(s.id) },
      ...destinationOf(questRow),
    };
  }

  const slots = (await sql()`
    SELECT cs.id, cs.quest_id, cs.series_id, cs.platform, q.offer_quiz, q.goal, q.recruit_offer
    FROM content_slots cs LEFT JOIN quests q ON q.id = cs.quest_id
    WHERE cs.post_slug = ${slug} ORDER BY cs.id DESC LIMIT 1
  `) as Array<{ id: number; quest_id: number; series_id: number | null; platform: string; offer_quiz: string | null; goal: string | null; recruit_offer: string | null }>;
  if (slots.length) {
    const p = slots[0];
    return {
      tag: { questId: Number(p.quest_id), slug, platform: p.platform || "tiktok", slotId: Number(p.id), seriesId: p.series_id == null ? undefined : Number(p.series_id) },
      ...destinationOf({ id: Number(p.quest_id), platforms: "", offer_quiz: p.offer_quiz ?? "", goal: p.goal, recruit_offer: p.recruit_offer }),
    };
  }
  return null;
}

// ── The redirect ──────────────────────────────────────────────────

function cookieFromHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** The same look as the app's not-found page, served straight from the handler. */
function notFoundResponse(): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found · The Financial DM</title></head>
<body style="margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0d1520;font-family:Georgia,serif">
<div style="text-align:center;padding:24px"><p style="color:#c08020;font-size:22px;margin:0 0 12px">Page not found</p><a href="/" style="color:#a0a0a0;font-size:14px">Back to The Financial DM</a></div></body></html>`;
  return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/**
 * Handle GET /<slug>. A campaign link redirects to its quiz; any other word
 * gets the not-found page.
 */
export async function handleCampaignLink(rawSlug: string, request: Request): Promise<Response> {
  let resolved: ResolvedLink | null = null;
  try {
    resolved = await resolveCampaignSlug(rawSlug);
  } catch (e) {
    console.warn("[campaign] link lookup failed:", e);
    return notFoundResponse();
  }
  if (!resolved) return notFoundResponse();

  const url = new URL(request.url);
  // Optional platform override for the same link on another network: /baby?p=youtube
  const p = normalizeSlug(url.searchParams.get("p") ?? "");
  const platform = QUEST_CONFIG.platforms.some((x) => x.id === p) ? p : resolved.tag.platform;
  const tag: CampaignTag = { ...resolved.tag, platform, at: new Date().toISOString() };

  const existing = decodeCampaignCookie(cookieFromHeader(request.headers.get("cookie"), CAMPAIGN_COOKIE));
  const next = pushTag(existing, tag);

  await recordCampaignEvent("visit", tag, resolved.quiz);

  const maxAge = QUEST_CONFIG.attributionWindowDays * 86_400;
  const secure = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const flags = `Path=/; Max-Age=${maxAge}; SameSite=Lax${secure ? "; Secure" : ""}`;
  const headers = new Headers();
  headers.append("Set-Cookie", `${CAMPAIGN_COOKIE}=${encodeCampaignCookie(next)}; ${flags}; HttpOnly`);
  headers.append("Set-Cookie", `${CAMPAIGN_MARKER_COOKIE}=1; ${flags}`);
  headers.set("Cache-Control", "no-store");
  const target = new URL(resolved.dest, url.origin);
  target.searchParams.set("via", tag.slug);
  headers.set("Location", target.pathname + target.search);
  return new Response(null, { status: 302, headers });
}

// ── Reading the cookie on the server ──────────────────────────────

/** The visitor's current campaign tag, when there is one inside the window. */
export function currentAttribution(): { cookie: CampaignCookie; tag: CampaignTag } | null {
  try {
    const cookie = decodeCampaignCookie(getCookie(CAMPAIGN_COOKIE));
    if (!cookie || !tagIsFresh(cookie.current)) return null;
    return { cookie, tag: cookie.current };
  } catch {
    return null;
  }
}
