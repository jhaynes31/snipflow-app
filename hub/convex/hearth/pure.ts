/**
 * Pure helpers for The Hearth, loadable by the Convex bundle and the tests.
 */

/** Her style intake, flattened to a few lines for the mother's voice. Null when she hasn't done it. */
export function styleSummary(settings: unknown): string | null {
  const s = (settings as { style?: Record<string, unknown> } | undefined)?.style;
  if (!s || typeof s !== "object") return null;
  const lines: string[] = [];
  const list = (k: string, label: string) => {
    const v = s[k];
    if (Array.isArray(v) && v.length) lines.push(`${label}: ${v.map(String).join(", ")}`);
  };
  list("colors", "Colors she reaches for");
  list("avoid", "Never again");
  list("sensory", "Sensory no-gos");
  list("vibe", "The look she likes on herself");
  list("playUp", "What she likes about her face");
  if (typeof s.makeup === "string" && s.makeup) lines.push(`Makeup: ${s.makeup}`);
  if (typeof s.minutes === "string" && s.minutes) lines.push(`Minutes on a normal morning: ${s.minutes}`);
  if (typeof s.notes === "string" && s.notes.trim()) lines.push(`In her words: ${s.notes.trim()}`);
  return lines.length ? lines.join("\n") : null;
}

/** What the parents' voices know about her at each age. Shared with core/hearth/little.ts. */
export const LITTLE_VOICE_NOTES = {
  girl: "She is five to seven years old. Speak to her simply, warmly, slowly, at her height. Short sentences. Tell her she is safe, she is good, she did nothing wrong, and that the grown-up in front of her now is glad she exists. Never ask her to explain or remember. Offer her something small and kind: a snack, a blanket, a game, a story. Let her be a child.",
  teen: "She is twelve to sixteen years old. Take her side first and out loud: what was said to her about her body and her appearance was wrong, and it was never her fault. Respect her anger; it's protecting something. Don't lecture, don't manage, don't tell her to calm down. Talk to her like a person whose opinion matters. Tell her the truth about what's ahead only if she asks. Let her be sarcastic. Let her be a teenager.",
} as const;
