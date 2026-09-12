/**
 * One-time sign-offs on copy and numbers that live in code files
 * (Tavern Keeper's Morning spec, Section 6.3). Each points at the Settings
 * view that shows the values read-only, where John marks it reviewed.
 * None block anything; they are reminders, not gates.
 */
export type SettingsViewId = "quizzes" | "loot" | "flags" | "platforms";

export interface ReviewItem {
  key: string;
  label: string;
  tool: string;
  view: SettingsViewId;
}

export const REVIEW_ITEMS: ReviewItem[] = [
  { key: "quiz_life_copy", label: "Life Insurance Quiz: estimate values, tier copy, and myth card reveals", tool: "Quizzes", view: "quizzes" },
  { key: "quiz_wealth_copy", label: "Wealth Check: class, tier, and stat copy", tool: "Quizzes", view: "quizzes" },
  { key: "loot_armor", label: "Armor loot pages", tool: "Loot", view: "loot" },
  { key: "loot_wealth_guides", label: "Wealth Check loot guides (the ten PDFs)", tool: "Loot", view: "loot" },
  { key: "flag_words", label: "Compliance and flag word lists", tool: "Content Forge", view: "flags" },
];

/** Section 7: values that still look like placeholders get flagged. */
export function looksLikePlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v) return true;
  return /\b(todo|tbd|placeholder|lorem|change ?me|fixme|xxx+)\b|example\.com|\?\?\?/i.test(v);
}

export interface ConfigLeaf {
  path: string;
  value: string;
  placeholder: boolean;
}

/** Flattens a config object into path/value rows for a read-only table, functions skipped, depth capped. */
export function flattenConfig(value: unknown, path = "", depth = 0, out: ConfigLeaf[] = []): ConfigLeaf[] {
  if (out.length > 600) return out;
  if (value === null || value === undefined) return out;
  if (typeof value === "function") return out;
  if (typeof value !== "object") {
    out.push({ path: path || "value", value: String(value), placeholder: looksLikePlaceholder(value) });
    return out;
  }
  if (depth > 4) {
    out.push({ path, value: JSON.stringify(value).slice(0, 200), placeholder: false });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => flattenConfig(v, `${path}[${i}]`, depth + 1, out));
    return out;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) flattenConfig(v, path ? `${path}.${k}` : k, depth + 1, out);
  return out;
}
