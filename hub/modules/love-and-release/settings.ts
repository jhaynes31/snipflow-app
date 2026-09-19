import { readPersonSetting, type EmbeddedPerson } from "@/core/person";

export const LOVE_AND_RELEASE_MODULE_ID = "love-and-release";
export const LOVE_AND_RELEASE_APP_PATH = "/love-and-release/app";

export function readLoveAndReleaseSettings(moduleSettings: Record<string, unknown> | undefined): { who: EmbeddedPerson | null } {
  return { who: readPersonSetting(moduleSettings, LOVE_AND_RELEASE_MODULE_ID) };
}

/** The address that opens Love & Release as this person. Nothing else travels. */
export function loveAndReleaseUrl(who: EmbeddedPerson): string {
  return `${LOVE_AND_RELEASE_APP_PATH}?who=${who}`;
}
