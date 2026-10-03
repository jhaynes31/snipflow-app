/**
 * The ways The Shire can reach a person (2026-10-03, Jen and John's ask):
 * a notification on a phone or computer they added, an email, or a text.
 * Each person picks, per area of The Shire, which ways they want. Pure
 * helpers here; delivery is in send.ts (push), email.ts, and text.ts.
 */
export interface Channels {
  push: boolean;
  email: boolean;
  text: boolean;
}

export const NO_CHANNELS: Channels = { push: false, email: false, text: false };
export const DEFAULT_CHANNELS: Channels = { push: true, email: false, text: false };

/** The areas a person can set separately. The key is the first part of the link a notification opens. */
export const AREAS: { key: string; label: string; what: string }[] = [
  { key: "heads-up", label: "Heads-ups", what: "When the other one of you sends a heads-up, or needs help now." },
  { key: "tend", label: "Tend", what: "When your partner sends a signal or a need card, and the follow-up after." },
  { key: "every-box", label: "Every Box", what: "Reminders about boxes you asked to be reminded of, and dormant boxes." },
  { key: "kept-word", label: "Kept Word", what: "A word given to you, and one coming due." },
  { key: "seasons", label: "Seasons", what: "When a season report is ready to read." },
  { key: "metamorphosis", label: "Metamorphosis", what: "The mentor's monthly letter and the room's own notes." },
  { key: "orchard", label: "The Orchard", what: "A friend's re-read date coming round." },
  { key: "other", label: "Everything else", what: "Anything not listed above." },
];

export function areaFromUrl(url: string): string {
  const first = url.replace(/^\/+/, "").split(/[/?#]/)[0] ?? "";
  return AREAS.some((a) => a.key === first) ? first : "other";
}

/** The channels a person chose for an area; push only when they never chose. */
export function channelsFor(prefs: Record<string, Channels> | undefined, area: string): Channels {
  const c = prefs?.[area] ?? prefs?.other;
  return c ? { push: c.push, email: c.email, text: c.text } : { ...DEFAULT_CHANNELS };
}

/** A loose check that a phone number can be texted: a plus, then 8 to 15 digits. */
export function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, "");
  if (!digits) return null;
  const withPlus = digits.startsWith("+") ? digits : digits.length === 10 ? `+1${digits}` : `+${digits}`;
  return /^\+\d{8,15}$/.test(withPlus) ? withPlus : null;
}

export function cleanEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!e) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200 ? e : null;
}
