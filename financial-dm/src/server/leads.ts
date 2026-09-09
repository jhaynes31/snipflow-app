import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";

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
}

export interface Lead extends LeadData {
  id: number;
  quiz_type: string;
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

/** Idempotent schema setup: create the table if missing and add quiz_type
 *  to tables created before that column existed. Cheap no-op after the first
 *  run, safe to call before every insert. */
async function ensureLeadsTable() {
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
}

export const saveLead = createServerFn()
  .validator((d: LeadData) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await ensureLeadsTable();
      await sql()`
        INSERT INTO leads (name, email, phone, age_range, dependents, has_insurance, biggest_concern, timeline, coverage_amount, health, tobacco, monthly_budget, household_income, utm_source, utm_medium, utm_campaign, quiz_type)
        VALUES (${data.name}, ${data.email}, ${data.phone}, ${data.age_range}, ${data.dependents}, ${data.has_insurance}, ${data.biggest_concern}, ${data.timeline}, ${data.coverage_amount || ""}, ${data.health || ""}, ${data.tobacco || ""}, ${data.monthly_budget || ""}, ${data.household_income || ""}, ${data.utm_source}, ${data.utm_medium}, ${data.utm_campaign}, ${data.quiz_type || "insurance"})
      `;
      return { ok: true };
    } catch (e) {
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
