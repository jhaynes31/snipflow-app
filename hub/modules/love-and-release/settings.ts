import { readPersonSetting, type EmbeddedPerson } from "@/core/person";

export const LOVE_AND_RELEASE_MODULE_ID = "love-and-release";
export const LOVE_AND_RELEASE_APP_PATH = "/love-and-release/app";

export function readLoveAndReleaseSettings(moduleSettings: Record<string, unknown> | undefined): { who: EmbeddedPerson | null } {
  return { who: readPersonSetting(moduleSettings, LOVE_AND_RELEASE_MODULE_ID) };
}

/**
 * The address that opens Love & Release as this person. `plan` is the one
 * signal that travels: a word wasn't kept recently, so the app's front door
 * can point at the plan in Re-Centered. Never what the word was.
 */
export function loveAndReleaseUrl(who: EmbeddedPerson, signals: { plan?: boolean } = {}): string {
  const p = new URLSearchParams({ who });
  if (signals.plan) p.set("plan", "1");
  return `${LOVE_AND_RELEASE_APP_PATH}?${p.toString()}`;
}
