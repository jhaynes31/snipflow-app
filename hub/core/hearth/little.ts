/**
 * The girl (5 to 7) and the teenager (12 to 16): the little ones' rooms in The
 * Hearth (2026-09-23). Trauma-informed: every prompt is an invitation, nothing
 * asks her to dig up memory, she chooses every entry, and the crisis notice and
 * Talk it through sit on the page. The parents' voices can speak to each of
 * them directly, which is reparenting in plain form.
 */
import { LITTLE_VOICE_NOTES } from "../../convex/hearth/pure.ts";

export type LittleWho = "girl" | "teen";

export interface LittleRoom {
  who: LittleWho;
  name: string;
  ages: string;
  intro: string;
  /** What the parents' voices know about her at this age. */
  voiceNote: string;
}

export const LITTLE_ROOMS: Record<LittleWho, LittleRoom> = {
  girl: {
    who: "girl", name: "The girl", ages: "five to seven",
    intro: "She's five, six, seven. She likes things and doesn't know yet that liking them will be used against her. She needed a lap, a snack, someone to say 'good job' and 'you're safe' and mean it. Nothing here asks you to remember anything you don't want to. You can just sit with her.",
    voiceNote: LITTLE_VOICE_NOTES.girl,
  },
  teen: {
    who: "teen", name: "The teenager", ages: "twelve to sixteen",
    intro: "She's twelve to sixteen. She's angry and she's right about a lot of it. She was told things about her body that no one should hear at any age, let alone then. She needed someone to say 'you're right, that wasn't okay,' and 'you're not too much,' and to take her side out loud. She also needed to be a teenager: music, friends, dumb fun, a door that locks.",
    voiceNote: LITTLE_VOICE_NOTES.teen,
  },
};

export type LetterKind = "loved" | "needed" | "toHer" | "fromHer" | "right" | "today";

export interface LetterPrompt {
  kind: LetterKind;
  title: string;
  prompt: string;
  /** Which rooms this prompt is for. */
  who: LittleWho[];
}

export const LETTER_PROMPTS: LetterPrompt[] = [
  { kind: "loved", title: "What she loved", prompt: "A food, a song, a game, a place, a smell, a show. Little things. No one has to have known.", who: ["girl", "teen"] },
  { kind: "needed", title: "What she needed to hear", prompt: "The sentence nobody said. Write it exactly as she needed it, even if it's plain.", who: ["girl", "teen"] },
  { kind: "toHer", title: "A letter to her", prompt: "From you, now, to her, then. Tell her what you know. Tell her what's coming that's good.", who: ["girl", "teen"] },
  { kind: "fromHer", title: "A letter from her", prompt: "Let her write to you. What does she want you to know? What does she want you to do today?", who: ["girl", "teen"] },
  { kind: "right", title: "What she was right about", prompt: "The things she saw clearly and was told she was wrong about. She wasn't.", who: ["teen"] },
  { kind: "today", title: "What she'd do today", prompt: "If she had the afternoon, what would she do? Do a small piece of it. Write what it was.", who: ["girl", "teen"] },
];

export const KIND_LABEL: Record<LetterKind, string> = {
  loved: "What she loved",
  needed: "What she needed to hear",
  toHer: "To her",
  fromHer: "From her",
  right: "What she was right about",
  today: "What she'd do today",
};
