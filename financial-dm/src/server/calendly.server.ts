import { SHELL_CONFIG } from "~/lib/adminShell";

/**
 * Reads John's upcoming Calendly appointments (Tavern Keeper's Morning
 * spec, Section 5.1). Read-only: this never books, moves, or cancels
 * anything. It needs CALENDLY_TOKEN, a personal access token with the
 * scheduled-events read and users read scopes; without it the card stays
 * hidden. Only the invitee's name, email (for matching a lead), and start
 * time are used; question answers are never read or stored.
 */

const API = "https://api.calendly.com";
const TTL_MS = 60_000;

export interface CalendlyAppointment {
  id: string;
  startIso: string;
  endIso: string;
  eventName: string;
  inviteeName: string;
  inviteeEmail: string;
  joinUrl: string;
}

export interface CalendlyResult {
  available: boolean;
  error?: string;
  appointments: CalendlyAppointment[];
}

export function calendlyAvailable(): boolean {
  return Boolean(process.env.CALENDLY_TOKEN);
}

let cache: { at: number; value: CalendlyResult } | null = null;

/** Which token scope each call needs, so a refusal can say exactly what to tick. */
function scopeFor(path: string): string {
  if (path.startsWith("/users/me")) return "User management: read the current user (users:read)";
  if (path.includes("/invitees")) return "Scheduling: read invitees (invitees:read)";
  return "Scheduling: read scheduled events (scheduled_events:read)";
}

async function call<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  if (!res.ok) {
    const step = path.split("?")[0];
    if (res.status === 401) throw new Error("Calendly rejected the token. Check CALENDLY_TOKEN in Vercel.");
    if (res.status === 403) throw new Error(`Calendly refused the ${step} call. The token needs this scope: ${scopeFor(path)}. Add it to the token in Calendly (or make a new token with it) and update CALENDLY_TOKEN.`);
    throw new Error(`Calendly answered ${res.status} on ${step}.`);
  }
  return (await res.json()) as T;
}

/** The start of today in John's time zone, and the end of tomorrow, as ISO strings. */
function window(now: Date): { min: string; max: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", { timeZone: SHELL_CONFIG.weekStart.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const parts = Object.fromEntries(dtf.formatToParts(now).map((p) => [p.type, p.value]));
  const localMidnightAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const nowLocalAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
  const offsetMs = nowLocalAsUtc - Math.floor(now.getTime() / 60_000) * 60_000;
  const start = localMidnightAsUtc - offsetMs;
  return { min: new Date(start).toISOString(), max: new Date(start + 2 * 86_400_000 - 1000).toISOString() };
}

/** Today's and tomorrow's active appointments, cached for a minute so Home stays instant. */
export async function upcomingAppointments(now: Date = new Date()): Promise<CalendlyResult> {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) return { available: false, appointments: [] };
  if (cache && now.getTime() - cache.at < TTL_MS) return cache.value;
  try {
    const me = await call<{ resource: { uri: string } }>("/users/me", token);
    const { min, max } = window(now);
    const q = new URLSearchParams({ user: me.resource.uri, min_start_time: min, max_start_time: max, status: "active", sort: "start_time:asc", count: "20" });
    const events = await call<{ collection: Array<{ uri: string; name: string; start_time: string; end_time: string; location?: { join_url?: string } }> }>(`/scheduled_events?${q}`, token);
    const appointments: CalendlyAppointment[] = [];
    for (const ev of events.collection.slice(0, 10)) {
      const uuid = ev.uri.split("/").pop() ?? "";
      let inviteeName = "";
      let inviteeEmail = "";
      try {
        const inv = await call<{ collection: Array<{ name?: string; email?: string; status?: string }> }>(`/scheduled_events/${uuid}/invitees?count=1`, token);
        const first = inv.collection.find((i) => i.status !== "canceled") ?? inv.collection[0];
        inviteeName = String(first?.name ?? "");
        inviteeEmail = String(first?.email ?? "").toLowerCase();
      } catch {
        // The event still shows, just without a name.
      }
      appointments.push({ id: uuid, startIso: ev.start_time, endIso: ev.end_time, eventName: ev.name, inviteeName, inviteeEmail, joinUrl: ev.location?.join_url ?? "" });
    }
    const value = { available: true, appointments };
    cache = { at: now.getTime(), value };
    return value;
  } catch (e) {
    return { available: true, error: e instanceof Error ? e.message : String(e), appointments: [] };
  }
}

/** For tests and after a token change. */
export function resetCalendlyCache(): void {
  cache = null;
}
