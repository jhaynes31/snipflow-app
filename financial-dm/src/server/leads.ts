import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { notifyJohn } from "~/server/mail.server";
import { newLeadEmail } from "~/lib/mailTemplates";
import { requireAdmin } from "~/server/auth";
import { allowRequest, clientAddress } from "~/server/rateLimit.server";
import { checkEmail, checkName, checkPhone } from "~/lib/contactValidation";
import { verifyMailDomain } from "~/server/mailDomain.server";
import { currentAttribution } from "~/server/attribution.server";
import { ensureQuestTables } from "~/server/quests";
import { isFoundVia, isLeadStatus, parseStatusHistory, type StatusChange } from "~/lib/attribution";

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
  // Life insurance quiz, loaded dice version (all optional, additive)
  /** Roster summary, e.g. "Partner, 2 kids, parent". */
  party?: string;
  youngest_age?: string;
  income_bracket?: string;
  mortgage_bracket?: string;
  debt_bracket?: string;
  education_choice?: string;
  employer_coverage?: string;
  personal_coverage?: string;
  /** Coverage estimate, rounded to the nearest $10,000. */
  est_damage?: number | null;
  est_shield?: number | null;
  est_gap?: number | null;
  /** Unarmored, Leather Armor, Chain Mail, Plate Armor, or Traveling Light. */
  armor_tier?: string;
  /** "yes" when work coverage is more than half of the shield. */
  armor_cursed?: string;
  /** Trap or Treasure: JSON list of {id, guess, correct} for the cards dealt. Context for John's call only. */
  myth_json?: string;
  /** Trap or Treasure: number right out of 3. */
  myth_score?: number | null;
  /** "Where did you find John?" (Quest Board spec, Section 8.3). Optional; never affects scoring. */
  found_via?: string;
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
  // Campaign attribution (Quest Board spec, Section 8). Additive only.
  quest_id: number | null;
  quest_name: string;
  series_id: number | null;
  slot_id: number | null;
  campaign_slug: string;
  campaign_platform: string;
  /** Every status change with its time, oldest first. */
  status_history: StatusChange[];
  /** John's own note, for leads he adds by hand. */
  note: string;
  not_a_fit_reason: string;
  product_type: string;
}

const QUIZ_TYPES: Record<string, string> = {
  "financial-health": "Financial Health",
  manual: "Added by John",
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
    found_via: isFoundVia(d?.found_via) ? d.found_via : "",
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
    party: text(d?.party, 120),
    youngest_age: text(d?.youngest_age, 20),
    income_bracket: text(d?.income_bracket, 80),
    mortgage_bracket: text(d?.mortgage_bracket, 40),
    debt_bracket: text(d?.debt_bracket, 40),
    education_choice: text(d?.education_choice, 80),
    employer_coverage: text(d?.employer_coverage, 80),
    personal_coverage: text(d?.personal_coverage, 40),
    est_damage: dollars(d?.est_damage),
    est_shield: dollars(d?.est_shield),
    est_gap: dollars(d?.est_gap),
    armor_tier: text(d?.armor_tier, 30),
    armor_cursed: text(d?.armor_cursed, 3),
    myth_json: text(d?.myth_json, 400),
    myth_score: (() => {
      const n = Number(d?.myth_score);
      return Number.isFinite(n) ? Math.max(0, Math.min(3, Math.round(n))) : null;
    })(),
  };
}

/** Whole dollars, capped well above any estimate the quiz can produce. */
function dollars(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100_000_000, Math.round(n))) : null;
}

let leadsTableReady: Promise<void> | null = null;

/** Idempotent schema setup: create the table if missing and add columns
 *  introduced later. Runs once per server instance (memoized) so a lead
 *  insert is a single query, not eight. */
export function ensureLeadsTable(): Promise<void> {
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
  await sql()`ALTER TABLE leads ADD COLUMN IF NOT EXISTS note TEXT DEFAULT ''`;
  // Campaign attribution and outcomes (Quest Board spec, Section 8).
  for (const col of ["quest_id", "series_id", "slot_id"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} INTEGER`);
  }
  for (const col of ["campaign_slug", "campaign_platform", "found_via", "status_history", "not_a_fit_reason", "product_type"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  for (const col of ["character_tier", "character_class", "weakest_stat", "loot_id", "stats_json", "twist_answer", "twist_scenario", "save_event", "save_outcome"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  // Life insurance quiz (loaded dice): answers as brackets, estimate as rounded dollars.
  for (const col of ["party", "youngest_age", "income_bracket", "mortgage_bracket", "debt_bracket", "education_choice", "employer_coverage", "personal_coverage", "armor_tier", "armor_cursed", "myth_json"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} TEXT`);
  }
  for (const col of ["est_damage", "est_shield", "est_gap", "myth_score"]) {
    await sql().query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col} INTEGER`);
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
      // Which campaign link, if any, brought this person here (Section 8.2).
      // Read from the first-party cookie on the server, so it cannot be faked
      // from the form. The visitor's own "where did you find John" answer is
      // stored beside it; neither ever overwrites the other.
      const attr = currentAttribution()?.tag ?? null;
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
          await sql()`
            UPDATE leads SET retakes = COALESCE(retakes, 0) + 1, loot_id = COALESCE(NULLIF(loot_id, ''), ${keep || null}),
              quest_id = COALESCE(quest_id, ${attr?.questId ?? null}), series_id = COALESCE(series_id, ${attr?.seriesId ?? null}), slot_id = COALESCE(slot_id, ${attr?.slotId ?? null}),
              campaign_slug = COALESCE(NULLIF(campaign_slug, ''), ${attr?.slug || null}), campaign_platform = COALESCE(NULLIF(campaign_platform, ''), ${attr?.platform || null}),
              found_via = COALESCE(NULLIF(found_via, ''), ${data.found_via || null})
            WHERE id = ${prior[0].id}`;
          console.log("[leads] repeat financial health claim for lead", prior[0].id);
          await linkCharacterSheet(data, prior[0].id);
          return { ok: true, lootId: keep || undefined, repeat: true };
        }
      }
      const inserted = (await sql()`
        INSERT INTO leads (name, email, phone, age_range, dependents, has_insurance, biggest_concern, timeline, coverage_amount, health, tobacco, monthly_budget, household_income, utm_source, utm_medium, utm_campaign, quiz_type, quiz_result, quiz_score, character_tier, character_class, weakest_stat, stats_json, twist_answer, twist_scenario, save_event, save_outcome, loot_id,
          party, youngest_age, income_bracket, mortgage_bracket, debt_bracket, education_choice, employer_coverage, personal_coverage, est_damage, est_shield, est_gap, armor_tier, armor_cursed, myth_json, myth_score,
          quest_id, series_id, slot_id, campaign_slug, campaign_platform, found_via, status_history)
        VALUES (${data.name}, ${data.email}, ${data.phone}, ${data.age_range}, ${data.dependents}, ${data.has_insurance}, ${data.biggest_concern}, ${data.timeline}, ${data.coverage_amount || ""}, ${data.health || ""}, ${data.tobacco || ""}, ${data.monthly_budget || ""}, ${data.household_income || ""}, ${data.utm_source}, ${data.utm_medium}, ${data.utm_campaign}, ${data.quiz_type || "insurance"}, ${data.quiz_result || ""}, ${
          typeof data.quiz_score === "number" && Number.isFinite(data.quiz_score) ? Math.round(data.quiz_score) : null
        }, ${data.character_tier || null}, ${data.character_class || null}, ${data.weakest_stat || null}, ${data.stats_json || null}, ${data.twist_answer || null}, ${data.twist_scenario || null}, ${data.save_event || null}, ${data.save_outcome || null}, ${data.loot_id || null},
          ${data.party || null}, ${data.youngest_age || null}, ${data.income_bracket || null}, ${data.mortgage_bracket || null}, ${data.debt_bracket || null}, ${data.education_choice || null}, ${data.employer_coverage || null}, ${data.personal_coverage || null}, ${data.est_damage ?? null}, ${data.est_shield ?? null}, ${data.est_gap ?? null}, ${data.armor_tier || null}, ${data.armor_cursed || null}, ${data.myth_json || null}, ${data.myth_score ?? null},
          ${attr?.questId ?? null}, ${attr?.seriesId ?? null}, ${attr?.slotId ?? null}, ${attr?.slug || null}, ${attr?.platform || null}, ${data.found_via || null}, ${JSON.stringify([{ status: "New", at: new Date().toISOString() }])})
        RETURNING id
      `) as Array<{ id: number }>;
      await linkCharacterSheet(data, inserted[0]?.id ?? null);
      // John's heads-up. Never blocks or fails the lead; quietly skipped when email is not set up.
      await notifyJohn({
        template: "new_lead",
        ...newLeadEmail({ id: Number(inserted[0]?.id ?? 0), name: data.name, phone: data.phone, email: data.email, quizLabel: quizTypeLabel(data.quiz_type ?? "insurance"), result: data.quiz_result || "", source: data.found_via || (attr?.slug ? `/${attr.slug}` : "") }),
      });
      return { ok: true, lootId: data.loot_id || undefined, repeat: false };
    } catch (e) {
      console.error("[leads] insert failed:", e);
      return { ok: false, error: String(e) };
    }
  });

/**
 * Cross-quiz link, server half (life insurance spec, Section 14.2): when the
 * same email or phone has done the other quiz, copy that quiz's tier name
 * onto this row and this row's tier onto theirs, so the dashboard shows John
 * the full character sheet. Additive only; never blocks the save.
 */
async function linkCharacterSheet(data: LeadData, newId: number | null): Promise<void> {
  try {
    const email = data.email.trim().toLowerCase();
    const phoneDigits = data.phone.replace(/\D/g, "");
    const mine = data.quiz_type === "financial-health" ? "financial-health" : "insurance";
    const theirs = mine === "financial-health" ? "insurance" : "financial-health";
    const other = (await sql()`
      SELECT id, character_tier, armor_tier FROM leads
      WHERE quiz_type = ${theirs}
        AND (lower(email) = ${email} OR (${phoneDigits.length >= 7} AND regexp_replace(phone, '[^0-9]', '', 'g') = ${phoneDigits}))
      ORDER BY created_at DESC LIMIT 1
    `) as Array<{ id: number; character_tier: string | null; armor_tier: string | null }>;
    if (!other.length) return;
    if (mine === "financial-health") {
      // Their armor tier onto my row; my character tier onto theirs.
      if (newId && other[0].armor_tier) await sql()`UPDATE leads SET armor_tier = COALESCE(NULLIF(armor_tier, ''), ${other[0].armor_tier}) WHERE id = ${newId}`;
      if (data.character_tier) await sql()`UPDATE leads SET character_tier = ${data.character_tier} WHERE id = ${other[0].id}`;
    } else {
      if (newId && other[0].character_tier) await sql()`UPDATE leads SET character_tier = COALESCE(NULLIF(character_tier, ''), ${other[0].character_tier}) WHERE id = ${newId}`;
      if (data.armor_tier) await sql()`UPDATE leads SET armor_tier = ${data.armor_tier} WHERE id = ${other[0].id}`;
    }
  } catch (e) {
    console.warn("[leads] character sheet link skipped:", e);
  }
}

export const MANUAL_LEAD_SOURCES = [
  { id: "call", label: "Called John" },
  { id: "text", label: "Texted John" },
  { id: "referral", label: "Referral" },
  { id: "in_person", label: "Met in person" },
  { id: "other", label: "Other" },
] as const;

/** A lead John types in himself: someone who called, texted, or was referred. Lands at New like any other. */
export const addLeadManually = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { name: string; phone?: string; email?: string; source?: string; note?: string }) => ({
    name: String(d?.name ?? "").trim().slice(0, 120),
    phone: String(d?.phone ?? "").trim().slice(0, 40),
    email: String(d?.email ?? "").trim().toLowerCase().slice(0, 200),
    source: (MANUAL_LEAD_SOURCES.some((x) => x.id === d?.source) ? String(d?.source) : "other"),
    note: String(d?.note ?? "").trim().slice(0, 500),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string; field?: string }> => {
    if (!data.name) return { ok: false, error: "A name is needed.", field: "name" };
    if (!data.phone && !data.email) return { ok: false, error: "A phone number or an email is needed.", field: "phone" };
    if (data.phone && data.phone.replace(/\D/g, "").length < 10) return { ok: false, error: "That phone number looks short.", field: "phone" };
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: "That email does not look right.", field: "email" };
    try {
      await ensureLeadsTable();
      const label = MANUAL_LEAD_SOURCES.find((x) => x.id === data.source)?.label ?? "Other";
      const rows = (await sql()`
        INSERT INTO leads (name, email, phone, quiz_type, quiz_result, status, found_via, note, status_history)
        VALUES (${data.name}, ${data.email}, ${data.phone}, 'manual', '', 'New', ${label}, ${data.note}, ${JSON.stringify([{ status: "New", at: new Date().toISOString() }])})
        RETURNING id`) as Array<{ id: number }>;
      return { ok: true, id: Number(rows[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const getLeads = createServerFn().middleware([requireAdmin]).handler(async (): Promise<Lead[]> => {
  await ensureLeadsTable();
  await ensureQuestTables();
  const rows = await sql()`SELECT l.*, q.name AS quest_name FROM leads l LEFT JOIN quests q ON q.id = l.quest_id ORDER BY l.created_at DESC`;
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
    party: r.party ? String(r.party) : undefined,
    youngest_age: r.youngest_age ? String(r.youngest_age) : undefined,
    income_bracket: r.income_bracket ? String(r.income_bracket) : undefined,
    mortgage_bracket: r.mortgage_bracket ? String(r.mortgage_bracket) : undefined,
    debt_bracket: r.debt_bracket ? String(r.debt_bracket) : undefined,
    education_choice: r.education_choice ? String(r.education_choice) : undefined,
    employer_coverage: r.employer_coverage ? String(r.employer_coverage) : undefined,
    personal_coverage: r.personal_coverage ? String(r.personal_coverage) : undefined,
    est_damage: r.est_damage === null || r.est_damage === undefined ? null : Number(r.est_damage),
    est_shield: r.est_shield === null || r.est_shield === undefined ? null : Number(r.est_shield),
    est_gap: r.est_gap === null || r.est_gap === undefined ? null : Number(r.est_gap),
    armor_tier: r.armor_tier ? String(r.armor_tier) : undefined,
    armor_cursed: r.armor_cursed ? String(r.armor_cursed) : undefined,
    myth_json: r.myth_json ? String(r.myth_json) : undefined,
    myth_score: r.myth_score === null || r.myth_score === undefined ? null : Number(r.myth_score),
    status: String(r.status ?? "New"),
    id: Number(r.id),
    created_at: String(r.created_at),
    found_via: r.found_via ? String(r.found_via) : "",
    quest_id: r.quest_id === null || r.quest_id === undefined ? null : Number(r.quest_id),
    quest_name: String(r.quest_name ?? ""),
    series_id: r.series_id === null || r.series_id === undefined ? null : Number(r.series_id),
    slot_id: r.slot_id === null || r.slot_id === undefined ? null : Number(r.slot_id),
    campaign_slug: String(r.campaign_slug ?? ""),
    campaign_platform: String(r.campaign_platform ?? ""),
    status_history: parseStatusHistory(r.status_history),
    note: String(r.note ?? ""),
    not_a_fit_reason: String(r.not_a_fit_reason ?? ""),
    product_type: String(r.product_type ?? ""),
  })) as Lead[];
});

/**
 * Lead outcomes (Quest Board spec, Section 8.4). The status column keeps its
 * original values and gains Showed, Sold, and Not a fit. Every change is
 * timestamped in the history; "Not a fit" carries a reason and "Sold" a
 * product type, never a dollar amount.
 */
export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number; status: string; reason?: string; productType?: string }) => ({
    id: Number(d?.id),
    status: isLeadStatus(d?.status) ? d.status : "New",
    reason: text(d?.reason, 40),
    productType: text(d?.productType, 40),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; history?: StatusChange[] }> => {
    try {
      await ensureLeadsTable();
      const rows = (await sql()`SELECT status, status_history FROM leads WHERE id = ${data.id}`) as Array<{ status: string; status_history: string | null }>;
      if (!rows.length) return { ok: false, error: "That lead no longer exists." };
      const history = parseStatusHistory(rows[0].status_history);
      if (!history.length && rows[0].status) history.push({ status: rows[0].status, at: "" });
      if (history[history.length - 1]?.status !== data.status) history.push({ status: data.status, at: new Date().toISOString() });
      const reason = data.status === "Not a fit" ? data.reason || null : null;
      const product = data.status === "Sold" ? data.productType || null : null;
      await sql()`
        UPDATE leads SET status = ${data.status}, status_history = ${JSON.stringify(history.slice(-30))},
          not_a_fit_reason = ${reason}, product_type = ${product}
        WHERE id = ${data.id}`;
      return { ok: true, history };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

export const deleteLead = createServerFn({ method: "POST" })
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
