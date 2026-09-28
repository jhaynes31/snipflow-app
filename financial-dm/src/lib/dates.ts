/**
 * One clock for the whole app: John's, in Eastern time. Every date a person
 * reads comes through here, so a timestamp never shifts a day depending on
 * where the server or the phone happens to be.
 */
import { SHELL_CONFIG } from "./adminShell";

export const EASTERN = SHELL_CONFIG.weekStart.timeZone;

function parse(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Sep 28, 2026" */
export function fmtDay(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: EASTERN }) : "";
}

/** "Sep 28" */
export function fmtShortDay(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: EASTERN }) : "";
}

/** "Sep 28, 2026, 3:05 PM" */
export function fmtDateTime(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: EASTERN }) : "";
}

/** "Sep 28, 3:05 PM" */
export function fmtShortDateTime(iso: string | Date | null | undefined): string {
  const d = parse(iso);
  return d ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: EASTERN }) : "";
}

/** A date-only string like "2026-09-28" shown as "Sep 28, 2026", with no day shift. */
export function fmtYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  if (!m) return ymd || "";
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
