/**
 * Heartwood is served from inside The Shire at `/fitness/app/`. Every asset
 * path in the data files is written as "/media/…"; this turns it into a URL
 * under the app's base so it works there (and still works at "/" in dev).
 */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** "/media/x.svg" → "/fitness/app/media/x.svg". Leaves full URLs and blob keys alone. */
export function assetUrl(src: string): string {
  return src.startsWith('/') ? `${BASE}${src}` : src;
}

/** Where The Shire's fitness page lives; "switch person" goes back there. */
export const SHIRE_FITNESS = '/fitness';

/** The Shire page that frames Heartwood under its toolbar (2026-11-18). */
export const SHIRE_FRAME = '/fitness';

/** True when The Shire has Heartwood open inside its frame. */
export function inShire(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

/**
 * Opened on its own (an old link, a bookmark, the installed icon): go to the
 * same screen inside The Shire, so the toolbar is there. Keeps the address
 * and the hand-off (who, signals, session) intact.
 */
export function goToShireFrame(): boolean {
  if (inShire()) return false;
  const inner = window.location.pathname.startsWith(BASE) ? window.location.pathname.slice(BASE.length) : '';
  window.location.replace(`${SHIRE_FRAME}${inner === '/' ? '' : inner}${window.location.search}${window.location.hash}`);
  return true;
}

/** Tell The Shire which screen is open, so its address bar follows along. */
export function reportRoute(path: string): void {
  if (!inShire()) return;
  try { window.parent.postMessage({ type: 'shire:route', app: 'heartwood', path }, window.location.origin); } catch { /* ignore */ }
}
