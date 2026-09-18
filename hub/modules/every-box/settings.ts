/** Every Box's per-person settings, stored under `profile.moduleSettings["every-box"]`. */
export interface EveryBoxSettings {
  weeklyReviewOnCalendar: boolean;
}

export const EVERY_BOX_MODULE_ID = "every-box";

export function readEveryBoxSettings(moduleSettings: Record<string, unknown> | undefined): EveryBoxSettings {
  const raw = (moduleSettings?.[EVERY_BOX_MODULE_ID] ?? {}) as Partial<EveryBoxSettings>;
  return { weeklyReviewOnCalendar: raw.weeklyReviewOnCalendar === true };
}
