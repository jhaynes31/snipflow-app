/**
 * Heartwood Fitness's per-person settings, under `profile.moduleSettings.fitness`.
 * Heartwood keeps two on-device databases, "her" and "john" (hub/heartwood/src/db/users.ts).
 * The Shire decides which one the signed-in person opens: by their profile name
 * when it is plainly one of the two, otherwise by a one-time choice kept here.
 */
export type HeartwoodPerson = "her" | "john";

export const FITNESS_MODULE_ID = "fitness";

export function readFitnessSettings(moduleSettings: Record<string, unknown> | undefined): { who: HeartwoodPerson | null } {
  const raw = (moduleSettings?.[FITNESS_MODULE_ID] ?? {}) as { who?: unknown };
  return { who: raw.who === "her" || raw.who === "john" ? raw.who : null };
}

/** "John" (any case, with or without a surname) is John's database; nothing else is assumed. */
export function personFromName(displayName: string): HeartwoodPerson | null {
  const first = displayName.trim().split(/\s+/)[0]?.toLowerCase();
  if (first === "john") return "john";
  if (first === "jen" || first === "jennifer") return "her";
  return null;
}

/** IndexedDB name Heartwood uses for a person. Must match hub/heartwood/src/db/users.ts. */
export function heartwoodDbName(who: HeartwoodPerson): string {
  return `heartwood-${who}`;
}

export const HEARTWOOD_APP_PATH = "/fitness/app";

/** The address that opens Heartwood as this person, with the day's signals. */
export function heartwoodUrl(who: HeartwoodPerson, signals: { gentle: boolean; tender: boolean; weather?: string | null }): string {
  const p = new URLSearchParams({ who });
  if (signals.gentle) p.set("gentle", "1");
  if (signals.tender) p.set("tender", "1");
  if (signals.weather) p.set("weather", signals.weather);
  return `${HEARTWOOD_APP_PATH}?${p.toString()}`;
}
