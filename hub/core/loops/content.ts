/**
 * The Loop Map / The Chrysalis Loop (2026-11-13, Jen's spec, docs/loops-spec.md):
 * templates, the starter exit library, encouragement cards, needs and the
 * healthier ways to meet them, and the faith starters. Pure data.
 */

export interface StageTemplate { key: string; name: string; prompt: string }

export const DEFAULT_STAGES: StageTemplate[] = [
  { key: "trigger", name: "Trigger", prompt: "What usually sets it off? (a person, time, place, feeling, tiredness, a text…)" },
  { key: "body", name: "Body Signal", prompt: "What happens in your body first? (tight chest, heat, heaviness, restless…)" },
  { key: "story", name: "The Story", prompt: "What do you tell yourself? (the thought or belief that shows up)" },
  { key: "urge", name: "The Urge", prompt: "What do you feel pulled to do?" },
  { key: "behavior", name: "The Behavior", prompt: "What do you actually do?" },
  { key: "payoff", name: "The Payoff", prompt: "What does it give you right away? (relief, control, numbness, connection…)" },
  { key: "fallout", name: "The Fallout", prompt: "What does it cost you later?" },
  { key: "reset", name: "The Reset", prompt: "What happens after? (shame, promises, 'never again', going quiet…) This leads back to the start." },
];

export const TEMPLATES: { key: string; name: string; blurb: string; stages: StageTemplate[] }[] = [
  { key: "full", name: "The full loop (8 stages)", blurb: "Trigger, body, story, urge, behavior, payoff, fallout, reset. The most room to find exits.", stages: DEFAULT_STAGES },
  { key: "habit", name: "Simple habit loop (3)", blurb: "Cue, routine, reward. For a plain habit.", stages: [
    { key: "trigger", name: "Cue", prompt: "What sets it off?" },
    { key: "behavior", name: "Routine", prompt: "What do you do?" },
    { key: "payoff", name: "Reward", prompt: "What does it give you?" },
  ] },
  { key: "pleasing", name: "People-pleasing loop", blurb: "Request, fear of disappointing, yes, resentment, withdrawal. Links to Re-Centered.", stages: [
    { key: "trigger", name: "The Request", prompt: "Who asks, and how?" },
    { key: "story", name: "Fear of Disappointing", prompt: "What do you tell yourself will happen if you say no?" },
    { key: "behavior", name: "The Yes", prompt: "What do you say, and what do you give?" },
    { key: "fallout", name: "Resentment or Exhaustion", prompt: "What does it cost you, and when does it show?" },
    { key: "reset", name: "Withdrawal or Guilt", prompt: "What happens after? This leads back to the next request." },
  ] },
  { key: "blank", name: "Build my own", blurb: "Start from nothing. Four to ten stages.", stages: [
    { key: "trigger", name: "Stage 1", prompt: "What happens first?" },
    { key: "body", name: "Stage 2", prompt: "Then what?" },
    { key: "behavior", name: "Stage 3", prompt: "Then what?" },
    { key: "reset", name: "Stage 4", prompt: "And how does it end, before it starts again?" },
  ] },
];

/** Starter exits by stage kind. A stage made from scratch uses its `key` to pick a list. */
export const EXIT_LIBRARY: Record<string, string[]> = {
  trigger: ["Name it out loud: \"This is my ___ trigger.\"", "Step away for two minutes: change rooms, step outside.", "Delay: \"I'll respond in twenty minutes.\""],
  body: ["Slow breathing: exhale longer than you inhale (in 4, out 6 to 8), for one or two minutes.", "Cold water on your hands or face, or hold something cold.", "Plant your feet and name five things you can see.", "Shake out your hands and shoulders for thirty seconds."],
  story: ["Ask: \"Is this a fact or a feeling?\"", "Ask: \"What would I say to someone I love if they said this about themselves?\"", "Swap the story for your truer belief (from Beliefs).", "Write the thought down. It loses power on paper."],
  urge: ["Urge surfing: notice the urge like a wave. Rate it now, wait ten minutes, rate it again.", "Do the opposite small action (urge to isolate: send one text).", "Run your if-then plan (from Guardrails)."],
  behavior: ["\"I can stop partway.\" Stopping halfway still counts.", "Shrink it: do a smaller version.", "Send your signal word to your spouse, if this loop is shared with signal."],
  payoff: ["Ask: \"What need is this meeting right now?\"", "Pick a healthier way to meet that same need (from this stage's needs)."],
  fallout: ["Damage control, not self-punishment: one small repair step.", "Ask: \"What do I need right now to recover?\" (rest, food, water, a talk)"],
  reset: ["The three R's: Recognize what happened, Repair one step, Return to the plan.", "Read an encouragement card.", "Log what you learned. This pass becomes data, not a verdict."],
};

export const NEEDS = ["Safety", "Relief", "Control", "Comfort", "Connection", "Rest", "Approval or being liked", "Avoiding conflict", "Feeling numb or not feeling", "Feeling capable", "Predictability", "Being seen"] as const;

export const HEALTHIER: Record<string, string[]> = {
  Safety: ["Name where you actually are: this room, this hour, safe for now.", "Tell one safe person what's going on.", "Lock the door, make tea, let your body believe it."],
  Relief: ["A ten-minute walk.", "Tell your spouse what you're carrying.", "Permission to stop for the day."],
  Control: ["Make one small decision and finish it.", "Write the three things that are yours to do, and only those.", "Tidy one surface."],
  Comfort: ["A warm drink, a blanket, a hand on your chest.", "Come sit at The Hearth.", "A song you love, all the way through."],
  Connection: ["Send one honest text.", "Ask your spouse for ten minutes.", "Go where people are, even quietly."],
  Rest: ["Lie down for twenty minutes without a screen.", "Say no to one thing today.", "Go to bed early on purpose."],
  "Approval or being liked": ["Ask yourself what you'd think of you, and let that count.", "Do one thing you're proud of that nobody will see.", "Let someone be mildly disappointed and notice you survive it."],
  "Avoiding conflict": ["Say the small true thing now, before it becomes a big one.", "Write what you'd say, then send one sentence of it.", "Ask for a time to talk instead of avoiding the talk."],
  "Feeling numb or not feeling": ["The wheel: name one feeling and where it sits.", "Cold water, then a walk; let the body come back first.", "Tell someone 'I've gone numb' instead of hiding it."],
  "Feeling capable": ["Finish one small thing, start to end.", "Do something you're good at for ten minutes.", "Ask for help with the big thing; that's capable too."],
  Predictability: ["Write tomorrow's first three steps tonight.", "Keep one small ritual at the same time every day.", "Say what you know for sure, out loud."],
  "Being seen": ["Tell your spouse one true thing about today.", "Write it down even if no one reads it.", "Ask: 'Can I tell you something and have you just listen?'"],
};

export const ENCOURAGEMENT = [
  "Falling back in is part of how loops break. It's not proof they can't.",
  "You noticed. Six months ago you might not have. That's the work working.",
  "Old trails are easy to slip onto because you walked them for years. That's not failure. That's familiarity.",
  "Shame keeps the loop spinning. Curiosity slows it down. What did this pass teach you?",
  "Don't start over. Start from here. Everything you've learned is still yours.",
  "One slip isn't a slide unless you let shame drive.",
  "You don't have to fix the whole pattern today. Just take the next right step.",
];

export const ENCOURAGEMENT_FAITH = [
  "His mercies are new every morning, and that includes this one.",
  "Get back up. That's what the righteous do. They fall and they rise.",
];

export const HABIT_COPY = "Every time you practice the new path, you're laying down a new trail in your brain. The old trail doesn't vanish overnight, but it gets overgrown when you stop walking it.";

export const NEEDS_COPY = "You're not broken for having this loop. Somewhere along the way, this pattern helped you survive or cope. The goal isn't to shame that part. It's to give it a better tool.";

export const SPIRAL_COPY = "You've been here before, but you're not the same person who was here last time.";

export const CYCLE_COPY = "Every loop you break is one your kids and theirs won't have to fight.";

export const LEARN_FOOTER = "This tool is for self-reflection and growth. It isn't a replacement for a counselor. For loops that feel bigger than you, a good counselor or pastor can walk with you.";

/** Faith starters for the Beliefs workshop. Reference, a close plain rendering, and where to read it. */
export const FAITH_STARTERS: { ref: string; plain: string; slug: string; chapter: number }[] = [
  { ref: "Romans 12:2", plain: "Don't be shaped by this world; be transformed by the renewing of your mind.", slug: "romans", chapter: 12 },
  { ref: "2 Corinthians 10:5", plain: "Take every thought captive to obey Christ.", slug: "2-corinthians", chapter: 10 },
  { ref: "Lamentations 3:22-23", plain: "His mercies never end; they are new every morning.", slug: "lamentations", chapter: 3 },
  { ref: "Proverbs 24:16", plain: "Though the righteous fall seven times, they rise again.", slug: "proverbs", chapter: 24 },
  { ref: "Isaiah 43:18-19", plain: "Forget the former things. See, I am doing a new thing.", slug: "isaiah", chapter: 43 },
  { ref: "Philippians 1:6", plain: "He who began a good work in you will carry it on to completion.", slug: "philippians", chapter: 1 },
];

export const STAGE_OF_CHANGE = ["Not ready", "Thinking about it", "Preparing", "Doing", "Maintaining"] as const;

export const HALT = "HALT: Hungry, Angry, Lonely, Tired.";

export const SHARING_COPY = {
  private: "Only you. Your spouse sees nothing.",
  sharedSummary: "Your spouse sees that this loop exists and its name. Nothing else.",
  shared: "Your spouse also sees when you mark \"I'm in it\" and can send one kind line back. An invitation for support, not a window to watch you through.",
} as const;
