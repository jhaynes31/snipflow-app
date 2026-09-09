/**
 * Client safe constants shared by the generator UIs. The server side twin
 * (src/server/contentVoice.ts) owns the prompt text; this file only carries
 * what the browser needs to render controls.
 */

export const TONES = ["Informative", "Warm", "Funny", "Mix / Surprise Me"] as const;
export type Tone = (typeof TONES)[number];
export const DEFAULT_TONE: Tone = "Mix / Surprise Me";

export const PLATFORMS = ["TikTok", "Instagram", "Facebook", "LinkedIn"] as const;
