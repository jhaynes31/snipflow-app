/**
 * "Is This Quest for You?" (recruiting spec, Section 8). Seven questions
 * about work style only, four Guild classes, and a deterministic fit
 * score. The d20 on the reveal screen is flavor; nothing here reads it.
 *
 * All copy and the scoring weights are drafts for John's approval. The
 * quiz stays hidden from the public until he confirms the "Fit quiz copy
 * approved" fact in the Guild tab.
 */

export const FIT_COPY_STATUS = "Draft for John's approval";

export type GuildClass = "bard" | "ranger" | "cleric" | "wizard";
export type FitLevel = "strong" | "worth_a_conversation" | "not_right_now";

export const GUILD_CLASSES: Record<GuildClass, { name: string; title: string; description: string; icon: string }> = {
  bard: { name: "The Bard", title: "A natural relationship builder", description: "People open up to you, and you remember what they said. In this work that is most of the job.", icon: "🎶" },
  ranger: { name: "The Ranger", title: "An independent self-starter", description: "You set your own pace and keep going when nobody is watching. Remote, flexible work suits you.", icon: "🏹" },
  cleric: { name: "The Cleric", title: "Driven by helping and protecting families", description: "You want the work to mean something. Protecting a family when things go wrong is exactly that.", icon: "✨" },
  wizard: { name: "The Wizard", title: "A learner who loves understanding how things work", description: "Licensing, products, the rules: you like knowing the why, and you explain it well.", icon: "📚" },
};

export const CLASS_ORDER: GuildClass[] = ["bard", "ranger", "cleric", "wizard"];

export interface FitOption {
  id: string;
  text: string;
  /** 0 to 3: how well this answer fits the role. Draft weights for John. */
  fit: number;
  /** Which classes this answer points to. */
  classes?: Partial<Record<GuildClass, number>>;
}

export interface FitQuestion {
  id: string;
  text: string;
  options: FitOption[];
}

/** Section 8.2. Work style only: never age, family, health, background, finances, or any protected trait. */
export const FIT_QUESTIONS: FitQuestion[] = [
  {
    id: "strangers",
    text: "How do you feel about talking with people you've just met?",
    options: [
      { id: "love", text: "I like it. It gives me energy.", fit: 3, classes: { bard: 2 } },
      { id: "reason", text: "Fine, once there's a reason to talk.", fit: 2, classes: { cleric: 1 } },
      { id: "recover", text: "I can do it, but I need quiet time after.", fit: 1, classes: { wizard: 1 } },
      { id: "avoid", text: "I'd rather not, honestly.", fit: 0 },
    ],
  },
  {
    id: "no",
    text: "When someone tells you \"no,\" what do you usually do?",
    options: [
      { id: "ask", text: "Ask what would make it a yes.", fit: 3, classes: { bard: 1, ranger: 1 } },
      { id: "next", text: "Thank them and move on to the next person.", fit: 2, classes: { ranger: 2 } },
      { id: "bounce", text: "Take it personally for a bit, then bounce back.", fit: 1, classes: { cleric: 1 } },
      { id: "stop", text: "It stops me cold.", fit: 0 },
    ],
  },
  {
    id: "schedule",
    text: "Do you like setting your own schedule, or do you prefer someone else setting it?",
    options: [
      { id: "own", text: "I set it, and I stick to it.", fit: 3, classes: { ranger: 2 } },
      { id: "own_structure", text: "I set it, but I like some structure to lean on.", fit: 2, classes: { cleric: 1 } },
      { id: "someone", text: "I'd rather someone else set it.", fit: 1 },
      { id: "unsure", text: "I've never really had the choice.", fit: 1, classes: { wizard: 1 } },
    ],
  },
  {
    id: "hours",
    text: "How many hours a week could you realistically give this?",
    options: [
      { id: "25plus", text: "25 or more", fit: 3 },
      { id: "15to25", text: "15 to 25", fit: 2 },
      { id: "5to15", text: "5 to 15", fit: 1 },
      { id: "under5", text: "Under 5, for now", fit: 0 },
    ],
  },
  {
    id: "study",
    text: "How do you feel about studying for licensing exams, with the option of more licenses later?",
    options: [
      { id: "bring_it", text: "I like learning. Bring it on.", fit: 3, classes: { wizard: 2 } },
      { id: "with_plan", text: "I can do it with a plan and a deadline.", fit: 2, classes: { wizard: 1, cleric: 1 } },
      { id: "worried", text: "It worries me, but I'd try.", fit: 1 },
      { id: "no", text: "Not for me.", fit: 0 },
    ],
  },
  {
    id: "worth",
    text: "What would make this work feel worth it to you?",
    options: [
      { id: "family", text: "Knowing a family is protected because of me.", fit: 3, classes: { cleric: 2 } },
      { id: "own_thing", text: "Building something that's mine.", fit: 3, classes: { ranger: 2 } },
      { id: "people", text: "The people I'd get to meet.", fit: 2, classes: { bard: 2 } },
      { id: "understand", text: "Finally understanding how money really works.", fit: 2, classes: { wizard: 2 } },
    ],
  },
  {
    id: "tech",
    text: "How comfortable are you with video calls and learning new apps?",
    options: [
      { id: "easy", text: "Easy. I pick things up fast.", fit: 3, classes: { wizard: 1 } },
      { id: "practice", text: "Fine, with a little practice.", fit: 2 },
      { id: "nervous", text: "Nervous, but willing.", fit: 1 },
      { id: "avoid", text: "I avoid them when I can.", fit: 0 },
    ],
  },
];

/** Section 10, fitScoring: shares of the maximum points. Drafts for John to approve or move. */
export const FIT_SCORING = {
  strongAtLeast: 0.7,
  worthAtLeast: 0.4,
  confirmedByJohn: true,
};

export const FIT_MAX_POINTS = FIT_QUESTIONS.reduce((sum, q) => sum + Math.max(...q.options.map((o) => o.fit)), 0);

export interface FitResult {
  guildClass: GuildClass;
  fitLevel: FitLevel;
  points: number;
  max: number;
}

export function isFitComplete(answers: Record<string, string>): boolean {
  return FIT_QUESTIONS.every((q) => q.options.some((o) => o.id === answers[q.id]));
}

/** Deterministic: the same answers always give the same class and level. Dice never enter here. */
export function scoreFit(answers: Record<string, string>): FitResult {
  let points = 0;
  const classPoints: Record<GuildClass, number> = { bard: 0, ranger: 0, cleric: 0, wizard: 0 };
  for (const q of FIT_QUESTIONS) {
    const o = q.options.find((x) => x.id === answers[q.id]);
    if (!o) continue;
    points += o.fit;
    for (const [c, n] of Object.entries(o.classes ?? {}) as Array<[GuildClass, number]>) classPoints[c] += n;
  }
  const share = FIT_MAX_POINTS ? points / FIT_MAX_POINTS : 0;
  const fitLevel: FitLevel = share >= FIT_SCORING.strongAtLeast ? "strong" : share >= FIT_SCORING.worthAtLeast ? "worth_a_conversation" : "not_right_now";
  // Highest class points wins; ties go to the earlier class in the fixed order, so results never wobble.
  let guildClass: GuildClass = CLASS_ORDER[0];
  for (const c of CLASS_ORDER) if (classPoints[c] > classPoints[guildClass]) guildClass = c;
  return { guildClass, fitLevel, points, max: FIT_MAX_POINTS };
}

/** Section 8.3 copy directions, drafted in John's voice. Every level still offers the interview (Rule 2.7). */
export const FIT_RESULT_COPY: Record<FitLevel, { headline: string; body: string }> = {
  strong: {
    headline: "This quest suits you. Let's talk.",
    body: "You answered the way people who do well here tend to answer: comfortable with people, steady when you hear no, and willing to learn. The next step is a conversation, not a commitment.",
  },
  worth_a_conversation: {
    headline: "Worth a conversation.",
    body: "A few things are worth talking through, like the hours, the studying, or how it feels to hear no. That's exactly what the conversation is for, and I'm happy to have it.",
  },
  not_right_now: {
    headline: "This might not be the right quest at the moment, and that's okay.",
    body: "Right now the fit looks like a stretch, and I'd rather say so than waste your time. If you're still curious, I'm happy to talk. No pressure either way.",
  },
};

export function fitLevelLabel(level: string): string {
  return level === "strong" ? "Strong fit" : level === "worth_a_conversation" ? "Worth a conversation" : level === "not_right_now" ? "Not right now" : level;
}

export function guildClassName(id: string): string {
  return (GUILD_CLASSES as Record<string, { name: string }>)[id]?.name ?? id;
}
