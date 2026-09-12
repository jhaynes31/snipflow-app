import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { isAuthenticated } from "~/server/auth.server";
import { currentAttribution } from "~/server/attribution.server";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";
import { verifyMailDomain } from "~/server/mailDomain.server";
import { ensureQuestTables } from "~/server/quests";
import {
  GUILD_FACT_FIELDS,
  GUILD_FAQ,
  checkInterest,
  guildIsLive,
  isRecruitStage,
  missingFacts,
  publicFactKeys,
  publicFacts,
  NOT_MOVING_REASONS,
  RECRUIT_SOURCES,
  type GuildFacts,
  type InterestInput,
  type RecruitSource,
  type RecruitStage,
} from "~/lib/guildConfig";
import { parseStatusHistory, type StatusChange } from "~/lib/attribution";
import { parseQuestLog, type QuestLog } from "~/lib/questLog";
import { GUILD_STARTER_ANSWERS } from "~/lib/guildStarterAnswers";

/**
 * The Guild, Phase 1 (recruiting spec, Section 5, trust-first amendment):
 * John's facts about the role in two tiers, the public interest form, and
 * recruit records. Presentation-tier facts never leave the server. Recruits are kept
 * apart from client leads, and nothing here ever reaches an AI model.
 */

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const KNOWN_KEYS = new Set([...GUILD_FACT_FIELDS.map((f) => f.key), ...GUILD_FAQ.map((f) => f.key)]);

let ready: Promise<void> | null = null;
function ensureTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`
        CREATE TABLE IF NOT EXISTS guild_facts (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL DEFAULT '',
          confirmed BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Rule 2.5: only these fields. No birth dates, SSNs, background or
      // health details, protected traits, or financial accounts, ever.
      await sql()`
        CREATE TABLE IF NOT EXISTS recruits (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT DEFAULT '',
          phone TEXT DEFAULT '',
          state TEXT DEFAULT '',
          best_time TEXT DEFAULT '',
          note TEXT DEFAULT '',
          confirmed_18 BOOLEAN NOT NULL DEFAULT FALSE,
          source TEXT NOT NULL DEFAULT 'manual',
          quest_id INTEGER,
          series_id INTEGER,
          slot_id INTEGER,
          campaign_slug TEXT DEFAULT '',
          campaign_platform TEXT DEFAULT '',
          found_via TEXT DEFAULT '',
          fit_class TEXT DEFAULT '',
          fit_level TEXT DEFAULT '',
          stage TEXT NOT NULL DEFAULT 'interested',
          stage_history TEXT NOT NULL DEFAULT '[]',
          pursuing_investment BOOLEAN NOT NULL DEFAULT FALSE,
          not_moving_reason TEXT DEFAULT '',
          email_consent BOOLEAN NOT NULL DEFAULT FALSE,
          quest_log_token TEXT,
          seen_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      // Phase 5: the Quest Log lives on the recruit row (older databases get the columns here).
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS quest_log TEXT`;
      await sql()`ALTER TABLE recruits ADD COLUMN IF NOT EXISTS quest_log_token TEXT`;
      // John's relayed answers fill facts that have never been saved. A row that exists is left alone,
      // even empty, unless it still holds one of the earlier "TODO(John)" drafts from this file.
      for (const a of GUILD_STARTER_ANSWERS) {
        await sql()`INSERT INTO guild_facts (key, value, confirmed) VALUES (${a.key}, ${a.value}, ${a.confirmed}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, confirmed = EXCLUDED.confirmed WHERE guild_facts.value LIKE '%TODO(John)%'`;
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export function ensureGuildTables(): Promise<void> {
  return ensureTables();
}

async function loadFacts(): Promise<GuildFacts> {
  await ensureTables();
  const rows = (await sql()`SELECT key, value, confirmed FROM guild_facts`) as Array<{ key: string; value: string; confirmed: boolean }>;
  const out: GuildFacts = {};
  for (const r of rows) if (KNOWN_KEYS.has(r.key)) out[r.key] = { key: r.key, value: String(r.value ?? ""), confirmed: Boolean(r.confirmed) };
  return out;
}

// ── Facts (admin) ─────────────────────────────────────────────────

export const getGuildFacts = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<{ facts: GuildFacts; missing: string[]; live: boolean }> => {
    const facts = await loadFacts();
    return { facts, missing: missingFacts(facts), live: guildIsLive(facts) };
  });

export const saveGuildFacts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { facts: Array<{ key: string; value: string; confirmed: boolean }> }) => ({
    facts: (Array.isArray(d?.facts) ? d.facts : [])
      .filter((f) => KNOWN_KEYS.has(String(f?.key)))
      .map((f) => ({ key: String(f.key), value: text(f.value, 4000), confirmed: Boolean(f.confirmed) })),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; missing?: string[]; live?: boolean }> => {
    try {
      await ensureTables();
      for (const f of data.facts) {
        // An empty answer can never be confirmed.
        const confirmed = f.confirmed && f.value.length > 0;
        await sql()`
          INSERT INTO guild_facts (key, value, confirmed, updated_at) VALUES (${f.key}, ${f.value}, ${confirmed}, NOW())
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, confirmed = EXCLUDED.confirmed, updated_at = NOW()`;
      }
      const facts = await loadFacts();
      return { ok: true, missing: missingFacts(facts), live: guildIsLive(facts) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Public page data ──────────────────────────────────────────────

export interface GuildPublic {
  /** Every required fact is confirmed: the page may show to the public. */
  live: boolean;
  /** Signed-in admin or a dev build: show the page with placeholders and a warning. */
  preview: boolean;
  /** True for John (signed in) and in development: unpublished things like the unapproved fit quiz may be shown with a warning, even once the Guild Hall is live. */
  canPreview: boolean;
  facts: Record<string, string>;
  missing: string[];
}

export const getGuildPublic = createServerFn().handler(async (): Promise<GuildPublic> => {
  const facts = await loadFacts();
  const live = guildIsLive(facts);
  const dev = process.env.NODE_ENV !== "production";
  let admin = false;
  try {
    admin = await isAuthenticated();
  } catch {
    admin = false;
  }
  const canPreview = dev || admin;
  const preview = !live && canPreview;
  if (live) return { live, preview: false, canPreview, facts: publicFacts(facts), missing: [] };
  if (!preview) return { live, preview, canPreview, facts: {}, missing: [] };
  // Preview: public keys only, confirmed or not, so John can see the draft. Presentation facts never leave the server.
  const allowed = new Set(publicFactKeys());
  return {
    live,
    preview,
    canPreview,
    facts: Object.fromEntries(Object.values(facts).filter((f) => allowed.has(f.key)).map((f) => [f.key, f.value])),
    missing: missingFacts(facts),
  };
});

// ── Interest form (public) ────────────────────────────────────────

const MAX_INTEREST = 5;
const INTEREST_WINDOW_MS = 60 * 60 * 1000;

export const submitGuildInterest = createServerFn({ method: "POST" })
  .validator((d: Partial<InterestInput> & { source?: string; fitResult?: { guildClass?: string; fitLevel?: string } }) => ({
    check: checkInterest(d),
    // Section 8.4: the fit quiz's contact step creates a recruit with its result attached.
    source: (d?.source === "fit_quiz" ? "fit_quiz" : "interest_form") as "fit_quiz" | "interest_form",
    fitClass: text(d?.fitResult?.guildClass, 20),
    fitLevel: text(d?.fitResult?.fitLevel, 30),
  }))
  .handler(async ({ data: input }): Promise<{ ok: boolean; error?: string; field?: string }> => {
    const data = input.check;
    if (!data.ok) {
      const [field, message] = Object.entries(data.errors)[0] ?? ["form", "Please check the form."];
      return { ok: false, error: message, field };
    }
    const c = data.clean;
    if (c.email) {
      const domainOk = await verifyMailDomain(c.email.split("@")[1]);
      if (!domainOk) return { ok: false, error: "That email's domain doesn't receive mail. Check the spelling after the @.", field: "email" };
    }
    if (!allowRequest(`guild:${clientAddress()}`, MAX_INTEREST, INTEREST_WINDOW_MS)) {
      return { ok: false, error: "Too many submissions. Please try again in a little while, or text INTERVIEW instead." };
    }
    try {
      await ensureTables();
      const attr = currentAttribution()?.tag ?? null;
      const history: StatusChange[] = [{ status: "interested", at: new Date().toISOString() }];
      await sql()`
        INSERT INTO recruits (name, email, phone, state, best_time, note, confirmed_18, source, quest_id, series_id, slot_id, campaign_slug, campaign_platform, found_via, fit_class, fit_level, stage, stage_history, email_consent)
        VALUES (${c.name}, ${c.email}, ${c.phone}, ${c.state}, ${c.bestTime}, ${c.note}, ${c.confirmed18}, ${input.source},
          ${attr?.questId ?? null}, ${attr?.seriesId ?? null}, ${attr?.slotId ?? null}, ${attr?.slug ?? ""}, ${attr?.platform ?? ""}, ${c.heardAbout},
          ${input.source === "fit_quiz" ? input.fitClass : ""}, ${input.source === "fit_quiz" ? input.fitLevel : ""},
          'interested', ${JSON.stringify(history)}, ${c.emailConsent})`;
      return { ok: true };
    } catch (e) {
      console.error("[guild] interest insert failed:", e);
      return { ok: false, error: "Something went wrong on our end. Please try again, or text INTERVIEW." };
    }
  });

// ── Recruits (admin) ──────────────────────────────────────────────

export interface Recruit {
  id: number;
  name: string;
  email: string;
  phone: string;
  state: string;
  bestTime: string;
  note: string;
  confirmed18: boolean;
  source: RecruitSource;
  questId: number | null;
  questName: string;
  campaignSlug: string;
  foundVia: string;
  fitClass: string;
  fitLevel: string;
  stage: RecruitStage;
  stageHistory: StatusChange[];
  pursuingInvestment: boolean;
  notMovingReason: string;
  emailConsent: boolean;
  questLog: QuestLog | null;
  questLogToken: string;
  isNew: boolean;
  createdAt: string;
}

function rowToRecruit(r: Record<string, unknown>): Recruit {
  const source = String(r.source ?? "manual");
  const stage = String(r.stage ?? "interested");
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    state: String(r.state ?? ""),
    bestTime: String(r.best_time ?? ""),
    note: String(r.note ?? ""),
    confirmed18: Boolean(r.confirmed_18),
    source: (RECRUIT_SOURCES.some((s) => s.id === source) ? source : "manual") as RecruitSource,
    questId: r.quest_id == null ? null : Number(r.quest_id),
    questName: String(r.quest_name ?? ""),
    campaignSlug: String(r.campaign_slug ?? ""),
    foundVia: String(r.found_via ?? ""),
    fitClass: String(r.fit_class ?? ""),
    fitLevel: String(r.fit_level ?? ""),
    stage: (isRecruitStage(stage) ? stage : "interested") as RecruitStage,
    stageHistory: parseStatusHistory(r.stage_history),
    pursuingInvestment: Boolean(r.pursuing_investment),
    notMovingReason: String(r.not_moving_reason ?? ""),
    emailConsent: Boolean(r.email_consent),
    questLog: parseQuestLog(r.quest_log),
    questLogToken: String(r.quest_log_token ?? ""),
    isNew: r.seen_at == null,
    createdAt: String(r.created_at ?? ""),
  };
}

export const getRecruits = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Recruit[]> => {
    await Promise.all([ensureTables(), ensureQuestTables()]);
    const rows = (await sql()`SELECT r.*, q.name AS quest_name FROM recruits r LEFT JOIN quests q ON q.id = r.quest_id ORDER BY r.created_at DESC`) as Array<Record<string, unknown>>;
    return rows.map(rowToRecruit);
  });

/** Count for the navigation badge: recruits John has not looked at yet. */
export const getGuildBadge = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<{ newRecruits: number; live: boolean }> => {
    await ensureTables();
    const [row] = (await sql()`SELECT count(*)::int AS n FROM recruits WHERE seen_at IS NULL`) as Array<{ n: number }>;
    const facts = await loadFacts();
    return { newRecruits: Number(row?.n ?? 0), live: guildIsLive(facts) };
  });

export const markRecruitsSeen = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async (): Promise<{ ok: boolean }> => {
    await ensureTables();
    await sql()`UPDATE recruits SET seen_at = NOW() WHERE seen_at IS NULL`;
    return { ok: true };
  });

/** Quick add (Section 5.4): someone who texted John. Name, phone, and where they came from. */
export const quickAddRecruit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { name: string; phone?: string; email?: string; source?: string; questId?: number | null; foundVia?: string; note?: string }) => ({
    name: text(d?.name, 120),
    phone: text(d?.phone, 40),
    email: text(d?.email, 200),
    source: (RECRUIT_SOURCES.some((s) => s.id === d?.source) ? d!.source : "text") as RecruitSource,
    questId: Number(d?.questId) > 0 ? Number(d?.questId) : null,
    foundVia: text(d?.foundVia, 40),
    note: text(d?.note, 500),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; id?: number }> => {
    if (!data.name) return { ok: false, error: "A name is needed." };
    try {
      await ensureTables();
      const history: StatusChange[] = [{ status: "interested", at: new Date().toISOString() }];
      const rows = (await sql()`
        INSERT INTO recruits (name, phone, email, source, quest_id, found_via, note, confirmed_18, stage, stage_history, seen_at)
        VALUES (${data.name}, ${data.phone}, ${data.email}, ${data.source}, ${data.questId}, ${data.foundVia}, ${data.note}, FALSE, 'interested', ${JSON.stringify(history)}, NOW())
        RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** Every stage change is timestamped (Section 5.4). Only John moves stages; nothing here is automatic. */
export const setRecruitStage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; stage: string; reason?: string }) => ({
    id: Number(d?.id),
    stage: (isRecruitStage(d?.stage) ? d!.stage : "interested") as RecruitStage,
    reason: NOT_MOVING_REASONS.some((r) => r.id === d?.reason) ? String(d?.reason) : "",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; history?: StatusChange[] }> => {
    try {
      await ensureTables();
      const rows = (await sql()`SELECT stage, stage_history FROM recruits WHERE id = ${data.id}`) as Array<{ stage: string; stage_history: string }>;
      if (!rows.length) return { ok: false, error: "That recruit no longer exists." };
      const history = parseStatusHistory(rows[0].stage_history);
      if (history[history.length - 1]?.status !== data.stage) history.push({ status: data.stage, at: new Date().toISOString() });
      const reason = data.stage === "not_moving_forward" ? data.reason : "";
      await sql()`UPDATE recruits SET stage = ${data.stage}, stage_history = ${JSON.stringify(history.slice(-40))}, not_moving_reason = ${reason} WHERE id = ${data.id}`;
      return { ok: true, history };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const updateRecruit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; note?: string; pursuingInvestment?: boolean; questId?: number | null }) => ({
    id: Number(d?.id),
    note: d?.note === undefined ? undefined : text(d.note, 500),
    pursuingInvestment: d?.pursuingInvestment === undefined ? undefined : Boolean(d.pursuingInvestment),
    questId: d?.questId === undefined ? undefined : Number(d.questId) > 0 ? Number(d.questId) : null,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      if (data.note !== undefined) await sql()`UPDATE recruits SET note = ${data.note} WHERE id = ${data.id}`;
      if (data.pursuingInvestment !== undefined) await sql()`UPDATE recruits SET pursuing_investment = ${data.pursuingInvestment} WHERE id = ${data.id}`;
      if (data.questId !== undefined) await sql()`UPDATE recruits SET quest_id = ${data.questId} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteRecruit = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureTables();
      await sql()`DELETE FROM recruits WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
