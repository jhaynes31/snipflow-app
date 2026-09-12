import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";

/**
 * Home's only writes (Tavern Keeper's Morning spec, Rules 2.3 and 2.4):
 * dismiss or snooze records for its own items, and John's sign-offs on
 * file-based config shown read-only under Settings. Neither touches any
 * source record. A dismissal carries a signature of the item's underlying
 * state, so when a lead moves stage or a post changes date the item comes
 * back on its own (Section 6.4).
 */

let ready: Promise<void> | null = null;
export function ensureHomeStateTables(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql()`CREATE TABLE IF NOT EXISTS home_dismissals (item_key TEXT PRIMARY KEY, state_sig TEXT NOT NULL DEFAULT '', until_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`;
      await sql()`CREATE TABLE IF NOT EXISTS admin_signoffs (key TEXT PRIMARY KEY, signed_at TIMESTAMPTZ DEFAULT NOW(), note TEXT DEFAULT '')`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export type Dismissals = Record<string, { sig: string; until: string }>;

/** Live dismissals only: expired rows are ignored (and cleaned up now and then). */
export async function loadDismissals(): Promise<Dismissals> {
  await ensureHomeStateTables();
  const rows = (await sql()`SELECT item_key, state_sig, until_at FROM home_dismissals WHERE until_at > NOW()`) as Array<Record<string, unknown>>;
  return Object.fromEntries(rows.map((r) => [String(r.item_key), { sig: String(r.state_sig ?? ""), until: String(r.until_at ?? "") }]));
}

/** True when this item was dismissed and its state has not changed since. */
export function isDismissed(d: Dismissals, key: string, sig: string): boolean {
  const rec = d[key];
  return Boolean(rec && rec.sig === sig);
}

export type SnoozeLength = "day" | "week" | "gone";
const DAYS: Record<SnoozeLength, number> = { day: 1, week: 7, gone: 3650 };

export const dismissHomeItem = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { key: string; sig: string; length: SnoozeLength }) => ({
    key: String(d?.key ?? "").slice(0, 120),
    sig: String(d?.sig ?? "").slice(0, 200),
    length: (d?.length === "day" || d?.length === "week" ? d.length : "gone") as SnoozeLength,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!data.key) return { ok: false, error: "Nothing to dismiss." };
    try {
      await ensureHomeStateTables();
      const until = new Date(Date.now() + DAYS[data.length] * 86_400_000).toISOString();
      await sql()`INSERT INTO home_dismissals (item_key, state_sig, until_at) VALUES (${data.key}, ${data.sig}, ${until})
        ON CONFLICT (item_key) DO UPDATE SET state_sig = EXCLUDED.state_sig, until_at = EXCLUDED.until_at, created_at = NOW()`;
      await sql()`DELETE FROM home_dismissals WHERE until_at < NOW() - interval '30 days'`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

// ── Sign-offs on read-only config ───────────────────────────────────

export type Signoffs = Record<string, string>;

export async function loadSignoffs(): Promise<Signoffs> {
  await ensureHomeStateTables();
  const rows = (await sql()`SELECT key, signed_at FROM admin_signoffs`) as Array<Record<string, unknown>>;
  return Object.fromEntries(rows.map((r) => [String(r.key), String(r.signed_at ?? "")]));
}

export const getSignoffs = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<Signoffs> => loadSignoffs());

/** John marks a config view as reviewed (or takes it back). Only the sign-off record changes. */
export const setSignoff = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { key: string; signed: boolean }) => ({ key: String(d?.key ?? "").slice(0, 80), signed: Boolean(d?.signed) }))
  .handler(async ({ data }): Promise<{ ok: boolean; signedAt?: string; error?: string }> => {
    if (!data.key) return { ok: false, error: "Nothing to sign." };
    try {
      await ensureHomeStateTables();
      if (!data.signed) {
        await sql()`DELETE FROM admin_signoffs WHERE key = ${data.key}`;
        return { ok: true };
      }
      const rows = (await sql()`INSERT INTO admin_signoffs (key, signed_at) VALUES (${data.key}, NOW()) ON CONFLICT (key) DO UPDATE SET signed_at = NOW() RETURNING signed_at`) as Array<Record<string, unknown>>;
      return { ok: true, signedAt: String(rows[0]?.signed_at ?? new Date().toISOString()) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
