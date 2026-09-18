/**
 * The eight user-manual sections. Keys match `MANUAL_SECTION_KEYS` in
 * convex/schema.ts. Prompts are plain questions, never requirements; every
 * section can stay empty for as long as the person likes.
 */
export interface ManualSectionMeta {
  key: ManualKey;
  title: string;
  prompt: string;
  /** Which Do / Say / Skip group a heads-up draws this section into, if any. */
  headsUpGroup?: "do" | "say" | "skip";
  optional?: boolean;
}

export type ManualKey =
  | "struggles"
  | "warningSigns"
  | "whatHelps"
  | "whatMakesItWorse"
  | "howToLoveMe"
  | "communication"
  | "sensory"
  | "faithAnchors";

export const MANUAL_SECTIONS: ManualSectionMeta[] = [
  {
    key: "struggles",
    title: "What I struggle with",
    prompt: "Your own words for what's hard, in any terms you choose.",
  },
  {
    key: "warningSigns",
    title: "Early warning signs",
    prompt: "What it looks like when you're starting to slide.",
  },
  {
    key: "whatHelps",
    title: "What helps",
    prompt: "Actions, words, and conditions that help.",
    headsUpGroup: "do",
  },
  {
    key: "whatMakesItWorse",
    title: "What makes it worse",
    prompt: "Things to avoid, including well-meant ones.",
    headsUpGroup: "skip",
  },
  {
    key: "howToLoveMe",
    title: "How to love me when I'm low",
    prompt: "Practical, emotional, and spiritual support, in your own words.",
    headsUpGroup: "say",
  },
  {
    key: "communication",
    title: "Communication needs",
    prompt: "For example: literal language, time to process, no surprise conversations.",
    headsUpGroup: "say",
  },
  {
    key: "sensory",
    title: "Sensory needs",
    prompt: "Light, noise, touch, and texture preferences.",
  },
  {
    key: "faithAnchors",
    title: "Faith anchors",
    prompt: "Scriptures, prayers, or worship songs that ground you. Leave this empty if it isn't for you.",
    optional: true,
  },
];

export function sectionMeta(key: string): ManualSectionMeta | undefined {
  return MANUAL_SECTIONS.find((s) => s.key === key);
}

/** Split a section body into short lines for Do / Say / Skip suggestions. */
export function suggestionLines(body: string, max = 3): string[] {
  return body
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter((l) => l.length > 0)
    .slice(0, max);
}
