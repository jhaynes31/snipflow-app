/**
 * Rooted's settings (the fail safes, in her words) live in
 * moduleSettings.rooted. Pure readers, tested in Node.
 */
export interface RootedSettings {
  vow: string;
  tripwires: string[];
  checklist: string[];
}

export function readRootedSettings(moduleSettings: Record<string, unknown> | undefined): RootedSettings {
  const raw = (moduleSettings?.rooted ?? {}) as Partial<Record<keyof RootedSettings, unknown>>;
  const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()).slice(0, 40) : []);
  return {
    vow: typeof raw.vow === "string" ? raw.vow.slice(0, 4000) : "",
    tripwires: list(raw.tripwires),
    checklist: list(raw.checklist),
  };
}

/** A one-line lean from a check: which pattern showed most this week. */
export function leanOf(c: { secure: number; anxious: number; avoidant: number; disorganized: number }): string {
  const entries: [string, number][] = [["secure", c.secure], ["anxious", c.anxious], ["avoidant", c.avoidant], ["disorganized", c.disorganized]];
  const top = Math.max(...entries.map(([, n]) => n));
  if (top <= 0) return "quiet";
  const leads = entries.filter(([, n]) => n === top).map(([k]) => k);
  return leads.join(" and ");
}

/** The fail safes as the coach reads them. */
export function failSafesText(s: RootedSettings): string[] {
  const out: string[] = [];
  if (s.vow.trim()) out.push(`Her pacing vow, in her words: ${s.vow.trim()}`);
  if (s.tripwires.length) out.push(`Her tripwires (if-then lines she wrote on a calm day): ${s.tripwires.map((t) => `"${t}"`).join(" ")}`);
  return out;
}
