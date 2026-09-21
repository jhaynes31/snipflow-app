/**
 * The embedded apps (Heartwood Fitness, Re-Centered) keep one on-device
 * database per person, named "her" and "john". The Shire decides which one
 * the signed-in person opens: by their profile's first name when it is
 * plainly one of the two, otherwise by a one-time choice kept in that
 * module's settings.
 */
export type EmbeddedPerson = "her" | "john";

export function personFromName(displayName: string): EmbeddedPerson | null {
  const first = displayName.trim().split(/\s+/)[0]?.toLowerCase();
  if (first === "john") return "john";
  if (first === "jen" || first === "jennifer") return "her";
  return null;
}

export function readPersonSetting(moduleSettings: Record<string, unknown> | undefined, moduleId: string): EmbeddedPerson | null {
  const raw = (moduleSettings?.[moduleId] ?? {}) as { who?: unknown };
  return raw.who === "her" || raw.who === "john" ? raw.who : null;
}

/** Which on-device copy of the Re-Centered app this person opens: their choice, or their first name, or Jen's. */
export function embeddedPersonFor(profile: { displayName: string; moduleSettings?: Record<string, unknown> }): EmbeddedPerson {
  return readPersonSetting(profile.moduleSettings, "love-and-release") ?? personFromName(profile.displayName) ?? "her";
}
