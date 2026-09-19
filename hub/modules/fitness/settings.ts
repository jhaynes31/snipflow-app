/**
 * Heartwood Fitness's per-person settings, under `profile.moduleSettings.fitness`.
 * Heartwood keeps two on-device databases, "her" and "john" (hub/heartwood/src/db/users.ts).
 * The Shire decides which one the signed-in person opens: by their profile name
 * when it is plainly one of the two, otherwise by a one-time choice kept here.
 */
import { personFromName, readPersonSetting, type EmbeddedPerson } from "@/core/person";

export type HeartwoodPerson = EmbeddedPerson;
export { personFromName };

export const FITNESS_MODULE_ID = "fitness";

export function readFitnessSettings(moduleSettings: Record<string, unknown> | undefined): { who: HeartwoodPerson | null } {
  return { who: readPersonSetting(moduleSettings, FITNESS_MODULE_ID) };
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
