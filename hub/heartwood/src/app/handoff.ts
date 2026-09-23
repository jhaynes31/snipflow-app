/**
 * The hand-off from The Shire. Its fitness page opens Heartwood at
 *   /fitness/app/?who=her|john&gentle=1&tender=1&weather=cloudy
 * `who` picks the person (each has a separate on-device database, see
 * db/users.ts). The rest are the day's signals from Tend: read once, kept
 * for this visit only, never written to the database. Nothing here is a
 * score; a gentle day just means Start offers the 5-minute version first.
 */
import { setActiveUserId } from '@/db/users';
import { SHIRE_FITNESS } from '@/app/base';

export { SHIRE_FITNESS };

const SIGNALS_KEY = 'heartwood:signals';
const REQUEST_KEY = 'heartwood:request';

/** What The Shire asked for on the way in: a particular session, or the five-minute version. */
export interface Request {
  templateId: string | null;
  five: boolean;
}

export interface DaySignals {
  gentle: boolean;
  tender: boolean;
  weather: string | null;
  /** True when the day calls for the lighter version first. */
  easy: boolean;
}

function fromParams(params: URLSearchParams): DaySignals {
  const gentle = params.get('gentle') === '1';
  const tender = params.get('tender') === '1';
  const weather = params.get('weather');
  return { gentle, tender, weather: weather || null, easy: gentle || tender };
}

/** Called once at startup, before any database opens. */
export function takeHandoff(): void {
  let url: URL;
  try { url = new URL(window.location.href); } catch { return; }
  const p = url.searchParams;
  if (![...p.keys()].length) return;
  const who = p.get('who');
  if (who === 'her' || who === 'john') setActiveUserId(who);
  if (p.has('gentle') || p.has('tender') || p.has('weather')) {
    try { sessionStorage.setItem(SIGNALS_KEY, JSON.stringify(fromParams(p))); } catch { /* ignore */ }
  }
  if (p.has('session') || p.has('five')) {
    const req: Request = { templateId: p.get('session') || null, five: p.get('five') === '1' };
    try { sessionStorage.setItem(REQUEST_KEY, JSON.stringify(req)); } catch { /* ignore */ }
  }
  for (const k of ['who', 'gentle', 'tender', 'weather', 'session', 'five']) p.delete(k);
  try { window.history.replaceState(null, '', url.pathname + ([...p.keys()].length ? `?${p}` : '') + url.hash); } catch { /* ignore */ }
}

/** The signals for this visit, if The Shire sent any. */
export function readSignals(): DaySignals {
  try {
    const raw = sessionStorage.getItem(SIGNALS_KEY);
    if (raw) return JSON.parse(raw) as DaySignals;
  } catch { /* ignore */ }
  return { gentle: false, tender: false, weather: null, easy: false };
}

/** The request for this visit, if The Shire sent one. Cleared once it's used. */
export function takeRequest(): Request | null {
  try {
    const raw = sessionStorage.getItem(REQUEST_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(REQUEST_KEY);
    return JSON.parse(raw) as Request;
  } catch { return null; }
}
