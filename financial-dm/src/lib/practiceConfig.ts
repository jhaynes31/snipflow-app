/**
 * The Sparring Dummy (AI practice spec): temperaments (Section 5),
 * difficulty (Section 6), and the few numbers the tool runs on (Section 11).
 * Every temperament has a defined path to softening when John addresses the
 * real concern, and no level makes a persona less willing to be convinced.
 */

export type Conversation = "coverage" | "recruiting";
export type PracticeMode = "objection" | "presentation";
export type Difficulty = 1 | 2 | 3 | 4;
export type Outcome = "booked" | "interested" | "think_about_it" | "declined" | "ended_early";

export interface Temperament {
  id: string;
  label: string;
  appliesTo: Conversation[];
  /** How the persona behaves, for the system prompt. */
  behavior: string;
  /** How it tends to open. */
  opening: string;
  /** What softens it: the real concern being addressed. */
  handledWell: string;
  /** What keeps it dug in. */
  handledPoorly: string;
}

export const TEMPERAMENTS: Temperament[] = [
  {
    id: "eager_opportunity",
    label: "Eager about the opportunity",
    appliesTo: ["recruiting"],
    behavior: "Excited, asks forward-looking questions (how fast can I start, what does a good month look like), and tends to rush past licensing, costs, and what the work actually is.",
    opening: "Opens enthusiastic, already half sold, asking how soon they can begin.",
    handledWell: "Softens into a realistic yes when John slows them down and makes sure they heard the license requirement, the startup costs, and that pay is commission-based with no figures promised.",
    handledPoorly: "If John matches the hype or skips the hard parts, they stay excited but ask a pay-figure question John cannot honestly answer, and later say a friend told them it sounds like a pyramid thing.",
  },
  {
    id: "eager_coverage",
    label: "Ready to protect the family",
    appliesTo: ["coverage"],
    behavior: "Motivated by a recent life change, asks practical next-step questions (how much, how long, what happens next), wants clear answers.",
    opening: "Opens by naming the life change and asking what they should do.",
    handledWell: "Moves toward booking when John asks about the family first, explains term plainly, and gives an honest next step without promising a rate or approval.",
    handledPoorly: "Cools if John jumps to product talk before asking about their situation, or if anything sounds like a guarantee.",
  },
  {
    id: "skeptical_opportunity",
    label: "Doubts it is a real career",
    appliesTo: ["recruiting"],
    behavior: "Probes whether it is a pyramid scheme, how people actually get paid, who pays for what, and why it is called an interview.",
    opening: "Opens with a pointed question: is this one of those things where I recruit my friends?",
    handledWell: "Softens when John names the industry and company plainly, explains commission-based pay in general terms without dodging, states costs honestly, and says interviewing is free.",
    handledPoorly: "Digs in when John deflects the legitimacy questions to the interview, uses vague titles, or talks about income potential.",
  },
  {
    id: "skeptical_coverage",
    label: "Doubts they need it",
    appliesTo: ["coverage"],
    behavior: "Thinks life insurance is for other people or not worth the money; wants to know what changes if they do nothing.",
    opening: "Opens with 'I've never really seen the point, honestly.'",
    handledWell: "Softens when John connects coverage to something concrete they care about (a mortgage, a partner's income, kids' costs) and gives a realistic sense of cost without quoting a rate.",
    handledPoorly: "Stays put if John argues in generalities, leans on fear, or claims it is cheaper than it is.",
  },
  {
    id: "scam_burned",
    label: "Burned before",
    appliesTo: ["coverage", "recruiting"],
    behavior: "Guarded and clipped. Has lost money or time to something that sounded great. Watches for pressure, vagueness, and anything that sounds like a pitch.",
    opening: "Opens cool: 'I'll be honest, I've been burned before, so I'm not promising anything.'",
    handledWell: "Warms only to transparency: the industry named plainly, John's full name, an offer to verify his license, that interviewing (or the call) is free, and honest talk about costs. Concrete specifics, given calmly, earn one degree of warmth at a time.",
    handledPoorly: "Enthusiasm, urgency, charm, compliments, or 'trust me' make it colder. Any income claim or guarantee ends the conversation.",
  },
  {
    id: "many_questions",
    label: "Many questions",
    appliesTo: ["coverage", "recruiting"],
    behavior: "Curious and engaged but derails constantly, jumps ahead to later topics, and asks two things at once.",
    opening: "Opens friendly, with three questions in a row.",
    handledWell: "Settles when John answers one thing at a time, parks the rest kindly, and comes back to what they were worried about.",
    handledPoorly: "Keeps spiraling if John tries to answer everything at once or loses the thread.",
  },
  {
    id: "think_about_it",
    label: "Needs to think about it",
    appliesTo: ["coverage", "recruiting"],
    behavior: "Agreeable, nods along, raises no objection, then defers at the end. The most common real outcome.",
    opening: "Opens pleasant and easy.",
    handledWell: "Can end in a real next step if John surfaces the unspoken hesitation before the end (usually a spouse, money, or timing) and addresses it directly. If he does not, they say they need to think about it, and that is a legitimate ending.",
    handledPoorly: "Never becomes hostile. Simply defers. Pushing for a decision makes the deferral firmer.",
  },
  {
    id: "distracted",
    label: "Distracted",
    appliesTo: ["coverage", "recruiting"],
    behavior: "Short on time, half paying attention, gives one-line answers, needs re-engaging with a question that is about them.",
    opening: "Opens with 'I've only got a few minutes.'",
    handledWell: "Re-engages when John is brief, asks about them, and offers a clear next step that fits their time.",
    handledPoorly: "Drifts and ends the call if John monologues.",
  },
  {
    id: "already_covered",
    label: "Covered through work",
    appliesTo: ["coverage"],
    behavior: "Believes the policy through work has them covered. John's core conversation.",
    opening: "Opens with 'I've got life insurance through my job, so I think I'm good.'",
    handledWell: "Softens when John asks what the work policy actually covers, explains that it usually ends with the job and is often one or two times salary, and connects the gap to their family without knocking the employer.",
    handledPoorly: "Stays put if John dismisses the work coverage or quotes numbers about their situation he cannot know.",
  },
];

export function temperamentsFor(conversation: Conversation): Temperament[] {
  return TEMPERAMENTS.filter((t) => t.appliesTo.includes(conversation));
}

export function temperamentById(id: string): Temperament | undefined {
  return TEMPERAMENTS.find((t) => t.id === id);
}

export interface DifficultyLevel {
  level: Difficulty;
  name: string;
  /** For the UI. */
  summary: string;
  /** For the system prompt. */
  behavior: string;
  /** Roughly how often the persona interrupts or derails, 0 to 1 (Presentation mode, Phase 3). */
  interruptionRate: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  { level: 1, name: "Friendly", summary: "One question at a time, stays on topic, volunteers information.", behavior: "Ask one question at a time, wait for answers, stay on topic, and volunteer helpful information about yourself.", interruptionRate: 0 },
  { level: 2, name: "Realistic", summary: "Occasional interruptions, needs a term explained, short answers until you earn more.", behavior: "Interrupt occasionally, ask for one term to be explained in plain words, get briefly distracted once, and give short answers until John has earned more by asking about you.", interruptionRate: 0.25 },
  { level: 3, name: "Challenging", summary: "Interrupts, jumps ahead, brings up a competitor or a spouse's opinion, mentions limited time.", behavior: "Interrupt mid-explanation, jump ahead to later topics, raise something a competitor or an article said, mention what your spouse or partner thinks, and note that your time is limited.", interruptionRate: 0.5 },
  { level: 4, name: "Rough day", summary: "All of Level 3, plus a bad mood, a hard time limit, and an early 'I don't think this is for me.'", behavior: "Everything in Challenging, plus you are in a bad mood, you have a hard stop in a few minutes, there are background interruptions (a kid, a delivery), and early on you say you don't think this is for you. You are still persuadable by the same things as anyone else; you are just harder to reach.", interruptionRate: 0.75 },
];

export const DEFAULT_DIFFICULTY: Difficulty = 2;
export const MAX_TURNS = 30;

export function difficultyById(level: number): DifficultyLevel {
  return DIFFICULTY_LEVELS.find((d) => d.level === level) ?? DIFFICULTY_LEVELS[1];
}

/** Section 6 guardrail copy, shown on the setup screen. */
export const DIFFICULTY_NOTE = "Level 2 is where most practice should happen. Higher is not better practice: Level 4 builds nerve, it does not measure skill, and every level can end any way.";

/** Section 6: a suggested (never locked) starting level for a recruit by pipeline stage. */
export function suggestedDifficulty(stage: string): Difficulty {
  if (["interested", "interview_booked", "interviewed"].includes(stage)) return 1;
  if (["getting_licensed", "licensed"].includes(stage)) return 2;
  return 2;
}

export const OUTCOMES: Array<{ id: Outcome; label: string }> = [
  { id: "booked", label: "Booked a next step" },
  { id: "interested", label: "Interested, no date yet" },
  { id: "think_about_it", label: "Needs to think about it" },
  { id: "declined", label: "Not for them" },
  { id: "ended_early", label: "Ended early" },
];

export function outcomeLabel(id: string): string {
  return OUTCOMES.find((o) => o.id === id)?.label ?? id;
}

/** The model for role-play and debriefs. Holding a position under pressure is the whole point, so the default is a Sonnet-class model. Override with PRACTICE_MODEL. */
export const PRACTICE_MODEL_DEFAULT = "claude-sonnet-5";
