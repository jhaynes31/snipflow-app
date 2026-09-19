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
