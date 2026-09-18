/**
 * Categories a box can belong to ("Our marriage", "Home", "Finances"…).
 * Called an "area" in code because the boxes themselves are the `ebCategories`
 * table. Pure module, shared by backend and browser.
 */
export const AREA_PRESETS: readonly string[] = [
  "Our marriage",
  "Home",
  "Finances",
  "Faith",
  "Family",
  "Kids",
  "Health",
  "Friends",
  "Work",
  "Fun & rest",
  "Pets",
  "Self-care",
  "Community",
];

export const AREA_MAX_LENGTH = 40;

/** Trim and collapse whitespace; empty means "no category". */
export function normalizeArea(value: string | undefined | null): string | undefined {
  const trimmed = (value ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, AREA_MAX_LENGTH);
}

/** Areas present in a set of boxes, presets first (in preset order), then customs alphabetically. */
export function areasIn(items: ReadonlyArray<{ area?: string }>): string[] {
  const present = new Set<string>();
  for (const it of items) if (it.area) present.add(it.area);
  const presets = AREA_PRESETS.filter((a) => present.has(a));
  const customs = [...present].filter((a) => !AREA_PRESETS.includes(a)).sort((a, b) => a.localeCompare(b));
  return [...presets, ...customs];
}
