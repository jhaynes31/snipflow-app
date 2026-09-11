import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";
import { checkEmail, checkName, checkPhone } from "~/lib/contactValidation";
import { verifyMailDomain } from "~/server/mailDomain.server";

export interface LeadData {
  name: string;
  email: string;
  phone: string;
  age_range: string;
  dependents: string;
  has_insurance: string;
  biggest_concern: string;
  timeline: string;
  coverage_amount?: string;
  health?: string;
  tobacco?: string;
  monthly_budget?: string;
  household_income?: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  /** Defaults to "insurance" when the quiz does not send one. */
  quiz_type?: string;
  /** Short outcome shown on the dashboard: dragon tier or character class. */
  quiz_result?: string;
  /** Numeric score where the quiz has one (financial health: 0 to 100). */
  quiz_score?: number | null;
  // Financial health character sheet (all optional, additive; narrative only)
  /** Fresh Recruit, Seasoned Adventurer, or Legendary Hero. */
  character_tier?: string;
  /** Paladin, Rogue, Fighter, Cleric, or Wizard. */
  character_class?: string;
  weakest_stat?: string;
  /** JSON of the five stat values, e.g. {"CON":1,...}. */
  stats_json?: string;
  /** The twist answer option id (savings, card_payoff, card_carry, borrow, unsure). */
  twist_answer?: string;
  twist_scenario?: string;
  save_event?: string;
  /** "success" or "fail". */
  save_outcome?: string;
  /** The loot item this person was given (financial health quiz). Fixed on first claim. */
  loot_id?: string;
}

export interface SaveLeadResult {
  ok: boolean;
  error?: string;
  /** Which form field the error belongs to, when it is about one. */
  field?: "name" | "email" | "phone";
  /** The loot item this person owns: the first one they ever claimed. */
  lootId?: string;
  /** True when this email or phone already claimed loot; no new lead row was made. */
  repeat?: boolean;
}

export interface Lead extends LeadData {
  id: number;
  quiz_type: string;
  quiz_result: string;
  quiz_score: number | null;
  status: string;
  created_at: string;
}

const QUIZ_TYPES: Record<string, string> = {
  "financial-health": "Financial Health",
};

export function quizTypeLabel(quizType: string): string {
  return QUIZ_TYPES[quizType] || "Life Insurance";
}

export const initLeadsTable = createServerFn().middleware([requireAdmin]).handler(async () => {
  await ensureLeadsTable();
  return { ok: true };
});

const MAX_LEAD_SUBMISSIONS = 8;
const LEAD_WINDOW_MS = 10 * 60 * 1000;

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Coerce and clamp everything the public quiz form sends. */
function cleanLeadInput(d: Partial<LeadData> | undefined): LeadData {
  const score = Number(d?.quiz_score);
  return {
    name: text(d?.name, 120),
    email: text(d?.email, 200),
    phone: text(d?.phone, 40),
    age_range: text(d?.age_range, 40),
    dependents: text(d?.dependents, 40),
    has_insurance: text(d?.has_insurance, 40),
    biggest_concern: text(d?.biggest_concern, 80),
    timeline: text(d?.timeline, 80),
    coverage_amount: text(d?.coverage_amount, 80),
    health: text(d?.health, 40),
    tobacco: text(d?.tobacco, 40),
    monthly_budget: text(d?.monthly_budget, 80),
    household_income: text(d?.household_income, 80),
    utm_source: text(d?.utm_source, 120),
    utm_medium: text(d?.utm_medium, 120),
    utm_campaign: text(d?.utm_campaign, 120),
    quiz_type: text(d?.quiz_type, 40) || "insurance",
    quiz_result: text(d?.quiz_result, 120),
    character_tier: text(d?.character_tier, 60),
    character_class: text(d?.character_class, 40),
    weakest_stat: text(d?.weakest_stat, 8),
    stats_json: text(d?.stats_json, 200),
    twist_answer: text(d?.twist_answer, 40),
    twist_scenario: text(d?.twist_scenario, 40),
    save_event: text(d?.save_event, 40),
    save_outcome: text(d?.save_outcome, 12),
    loot_id: text(d?.loot_id, 40),
    quiz_score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null,
  };
}

let leadsTableReady: Promise<void> | null = null;

/** Idempotent schema setup: create the table if missing and add columns
 *  introduced later. Runs once per server instance (memoized) so a lead
 *  insert is a single query, not eight. */
function ensureLeadsTable(): Promise<void> {
  if (!leadsTableReady) {
    leadsTableReady = migrateLeadsTable().catch((e) => {
      leadsTableReady = null;
      throw e;
    });
  }
  return leadsTableReady;
}

async function migrateLeadsTable() {
  await sql()`
    CREATE TABLE IF NOT EXISTS leads (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      age_range TEXT,
      dependents TEXT,
      has_insurance TEXT,
      biggest_concern TEXT,
      timeline TEXT,
      utm_source TEXT DEFAULT '',
      utm_medium TEXT DEFAULT '',
      utm_campaign TEXT DEFAULT '',
      quiz_type TEXT NOT NULL DEFAULT 'insurance',
      status TEXT DEFAULT 'New',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'insurance'`;
  await sql()`UPDATE leads SET quiz_type = 'insurance' WHERE quiz_type IS NULL`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS coverage_amount TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS health TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS tobacco TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_budget TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS household_income TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quiz_result TEXT`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS quiz_score INTEGER`;
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS retakes INTEGER DEFAULT 0`;
  for (const col of ["character_tier", "character_class", "weakest_stat", "loot_id", "stats_json", "twist_answer", "twist_scenario", "save_event", "save_outcome"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
}

export const saveLead = createServerFn({ method: "POST" })
  .validator((d: LeadData) => cleanLeadInput(d))
  .handler(async ({ data }): Promise<SaveLeadResult> => {
    // The same checks the form runs, enforced here so they cannot be skipped,
    // plus a live lookup that the email's domain actually receives mail.
    const name = checkName(data.name);
    if (!name.ok) return { ok: false, error: name.message, field: "name" };
    const email = checkEmail(data.email);
    if (!email.ok) return { ok: false, error: email.message, field: "email" };
    const phone = checkPhone(data.phone);
    if (!phone.ok) return { ok: false, error: phone.message, field: "phone" };
    data = { ...data, name: name.value!, email: email.value!, phone: phone.value! };
    const domainOk = await verifyMailDomain(data.email.split("@")[1]);
    if (!domainOk) return { ok: false, error: "That email's domain doesn't receive mail. Check the spelling after the @.", field: "email" };
    if (!allowRequest(`lead:${clientAddress()}`, MAX_LEAD_SUBMISSIONS, LEAD_WINDOW_MS)) {
      console.warn("[leads] throttled submission from", clientAddress());
      return { ok: false, error: "Too many submissions. Please try again in a few minutes." };
    }
    try {
      await ensureLeadsTable();
      // Financial health quiz: the loot belongs to the person, not the run.
      // The same email or phone number gets the item it claimed first and no
      // second lead row; the existing row just counts the retake.
      if (data.quiz_type === "financial-health") {
        const email = data.email.trim().toLowerCase();
        const phoneDigits = data.phone.replace(/\D/g, "");
        const prior = (await sql()`
          SELECT id, loot_id FROM leads
          WHERE quiz_type = 'financial-health'
            AND (lower(email) = ${email} OR (${phoneDigits.length >= 7} AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneDigits}))
          ORDER BY created_at ASC LIMIT 1
        `) as Array<{ id: number; loot_id: string | null }>;
        if (prior.length) {
          const keep = prior[0].loot_id || data.loot_id || "";
          await sql()`UPDATE leads SET retakes = COALESCE(retakes, 0) + 1, loot_id = COALESCE(NULLIF(loot_id, ''), ${keep || null}) WHERE id = ${prior[0].id}`;
          console.log("[leads] repeat financial health claim for lead", prior[0].id);
          return { ok: true, lootId: keep || undefined, repeat: true };
        }
      }
      await sql()`
        INSERT INTO leads (name, email, phone, age_range, dependents, has_insurance, biggest_concern, timeline, coverage_amount, health, tobacco, monthly_budget, household_income, utm_source, utm_medium, utm_campaign, quiz_type, quiz_result, quiz_score, character_tier, character_class, weakest_stat, stats_json, twist_answer, twist_scenario, save_event, save_outcome, loot_id)
        VALUES (${data.name}, ${data.email}, ${data.phone}, ${data.age_range}, ${data.dependents}, ${data.has_insurance}, ${data.biggest_concern}, ${data.timeline}, ${data.coverage_amount || ""}, ${data.health || ""}, ${data.tobacco || ""}, ${data.monthly_budget || ""}, ${data.household_income || ""}, ${data.utm_source}, ${data.utm_medium}, ${data.utm_campaign}, ${data.quiz_type || "insurance"}, ${data.quiz_result || ""}, ${
          typeof data.quiz_score === "number" && Number.isFinite(data.quiz_score) ? Math.round(data.quiz_score) : null
        }, ${data.character_tier || null}, ${data.character_class || null}, ${data.weakest_stat || null}, ${data.stats_json || null}, ${data.twist_answer || null}, ${data.twist_scenario || null}, ${data.save_event || null}, ${data.save_outcome || null}, ${data.loot_id || null})
      `;
      return { ok: true, lootId: data.loot_id || undefined, repeat: false };
    } catch (e) {
      console.error("[leads] insert failed:", e);
      return { ok: false, error: String(e) };
    }
  });

export const getLeads = createServerFn().middleware([requireAdmin]).handler(async (): Promise<Lead[]> => {
  const rows = await sql()`SELECT * FROM leads ORDER BY created_at DESC`;
  return rows.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    phone: String(r.phone ?? ""),
    age_range: String(r.age_range ?? ""),
    dependents: String(r.dependents ?? ""),
    has_insurance: String(r.has_insurance ?? ""),
    biggest_concern: String(r.biggest_concern ?? ""),
    timeline: String(r.timeline ?? ""),
    coverage_amount: String(r.coverage_amount ?? ""),
    health: String(r.health ?? ""),
    tobacco: String(r.tobacco ?? ""),
    monthly_budget: String(r.monthly_budget ?? ""),
    household_income: String(r.household_income ?? ""),
    utm_source: String(r.utm_source ?? ""),
    utm_medium: String(r.utm_medium ?? ""),
    utm_campaign: String(r.utm_campaign ?? ""),
    quiz_type: String(r.quiz_type ?? "insurance"),
    quiz_result: String(r.quiz_result ?? ""),
    quiz_score: r.quiz_score === null || r.quiz_score === undefined ? null : Number(r.quiz_score),
    character_tier: r.character_tier ? String(r.character_tier) : undefined,
    character_class: r.character_class ? String(r.character_class) : undefined,
    weakest_stat: r.weakest_stat ? String(r.weakest_stat) : undefined,
    stats_json: r.stats_json ? String(r.stats_json) : undefined,
    twist_answer: r.twist_answer ? String(r.twist_answer) : undefined,
    twist_scenario: r.twist_scenario ? String(r.twist_scenario) : undefined,
    save_event: r.save_event ? String(r.save_event) : undefined,
    save_outcome: r.save_outcome ? String(r.save_outcome) : undefined,
    loot_id: r.loot_id ? String(r.loot_id) : undefined,
    status: String(r.status ?? "New"),
    id: Number(r.id),
    created_at: String(r.created_at),
  })) as Lead[];
});

export const updateLeadStatus = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number; status: string }) => ({ id: Number(d?.id), status: String(d?.status ?? "New") }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`UPDATE leads SET status = ${data.status} WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteLead = createServerFn()
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM leads WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
