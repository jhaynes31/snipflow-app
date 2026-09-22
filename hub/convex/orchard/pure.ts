/**
 * The Orchard's pure helpers: the layers, the slow-trust rule, the three
 * checks (halo, safe, compass) and their plain readings. Self-contained so
 * the tests load it alone. Content grew from Jen's own pacing and circles
 * work in Re-Centered's "Everyone, and me" (2026-09-17) and her brief for
 * this place (2026-09-22): trust slowly, rein in the story, know if they're
 * safe, and know what to do when a pattern shows.
 */

export interface Layer {
  index: number;
  name: string;
  meaning: string;
  /** Days known before someone can move into this layer. */
  minDays: number;
  access: string[];
  expect: string[];
  earnedBy: string[];
  exitSignals: string[];
}

export const LAYERS: Layer[] = [
  {
    index: 0,
    name: "Just met",
    meaning: "Good vibes, no data yet. Enjoy them. Nothing is decided.",
    minDays: 0,
    access: ["Group time", "Light conversation", "Interest and warmth"],
    expect: ["Basic kindness"],
    earnedBy: ["Nothing yet; everyone starts here"],
    exitSignals: ["Pressure to go faster than the time you've had"],
  },
  {
    index: 1,
    name: "Getting to know",
    meaning: "Watching in the ordinary. Do words and actions match over weeks?",
    minDays: 14,
    access: ["Occasional one-on-one time", "Everyday details of my life", "Small favors both ways"],
    expect: ["Reliable in small things", "Asks and remembers", "Initiates sometimes"],
    earnedBy: ["Showed up when they said they would", "Asked about my life and remembered", "Initiated at least once", "Treated the waiter well"],
    exitSignals: ["Asks for a lot early", "Gossips about others to me", "Only reaches out when they need something", "Asks deep, shares shallow"],
  },
  {
    index: 2,
    name: "Friend",
    meaning: "Enjoyable, growing trust. Tested by at least one no.",
    minDays: 60,
    access: ["Regular time", "One-on-one time", "Some of my story", "My faith and prayer requests"],
    expect: ["Kind", "Reliable", "Mutual interest", "Respects a no"],
    earnedBy: ["Initiates both ways", "Handled a no or a small pushback and stayed warm", "Kept a small confidence", "Talks to me as a peer", "Let me help them once"],
    exitSignals: ["Never initiates", "Words and actions not matching", "One-sided effort for a season", "Correction as the main channel", "Contempt or mockery"],
  },
  {
    index: 3,
    name: "Close friend",
    meaning: "Trusted, proven over time. Has seen me on a bad day.",
    minDays: 180,
    access: ["My home", "My struggles", "My marriage and family details", "Feedback and hard truths from them", "Help and favors"],
    expect: ["Honest", "Initiates both ways", "Repairs after ruptures", "Safe with my heart"],
    earnedBy: ["Kept confidences over time", "Told me plainly when something I did landed wrong", "Owned their impact and repaired", "Shares as deeply as they ask", "Stays present through closeness"],
    exitSignals: ["Broken confidence", "Can't be honest when upset with me", "Won't take ownership", "Close, then gone"],
  },
  {
    index: 4,
    name: "Chosen family",
    meaning: "Mutual choosing. A year of the mundane, at least.",
    minDays: 365,
    access: ["Priority time", "Calls any time", "Being a support person in their crisis, and them in mine", "Being around John and my home life", "My business and money details"],
    expect: ["Reciprocity", "Consistency in the mundane", "Follows up", "Repairs after ruptures"],
    earnedBy: ["Known for a long time", "Carries their half", "Wants my truth, not just my ear", "Lets me care for them too", "Sits in the hard thing with me, faith intact", "Loves themselves well enough to love me well"],
    exitSignals: ["Broken confidence", "Boundary crossing after I said no", "Spiritual bypassing when it's hard", "Contempt or mockery"],
  },
];

export const PEARLS_DEFAULT = [
  "My struggles and vulnerabilities",
  "My past and my story",
  "My marriage and family details",
  "My business and money details",
  "My help and favors (skills, labor, gifts)",
  "My home",
];

export const WATCH_FOR = [
  "Do they ask about my life and remember?",
  "Do they initiate, or only respond?",
  "How do they react to a small no?",
  "How do they treat people who can't do anything for them?",
  "How do they talk about their exes and old friends?",
  "Do they ask for favors early?",
  "Is the closeness moving faster than the time we've had?",
  "Do they give, or only receive?",
  "Do words and actions match over a few weeks?",
  "Do I feel filled or drained after time with them?",
];

export const TRUTH = "Trust is earned in the mundane, not declared in the intense.";

/** How long trust has actually had. */
export function daysBetween(fromDay: string, today: string): number {
  const ms = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, dd);
  };
  return Math.max(0, Math.round((ms(today) - ms(fromDay)) / 86_400_000));
}

export function addDays(day: string, n: number): string {
  const [y, m, dd] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10);
}

/** The slow-trust rule: a layer is available once the days known reach its minimum. Never enforced, always said. */
export function moveCheck(metDay: string, today: string, toLayer: number): { ok: boolean; daysKnown: number; needed: number; readyOn: string | null } {
  const layer = LAYERS[toLayer];
  const daysKnown = daysBetween(metDay, today);
  const needed = layer?.minDays ?? 0;
  return { ok: daysKnown >= needed, daysKnown, needed, readyOn: daysKnown >= needed ? null : addDays(metDay, needed) };
}

// The halo check: excitement, and what I actually know

export const HALO_QUESTIONS = [
  { key: "known", q: "How long have I actually known them?", hint: "Days and weeks, not how it feels." },
  { key: "seen", q: "What have I actually seen, versus what I've assumed?", hint: "List only things you watched happen." },
  { key: "no", q: "Have I seen them handle a no, a disagreement, or an inconvenience?", hint: "If not yet, that's the test that hasn't happened." },
  { key: "others", q: "How do they treat people who can't do anything for them?", hint: "Waiters, the quiet person in the group, an ex." },
  { key: "chosen", q: "Am I excited about them, or about being chosen?", hint: "Both are allowed. Only one is about them." },
];

export function haloRead(excitement: number, daysKnown: number): string {
  const fast = excitement >= 4 && daysKnown < 30;
  if (fast) return `Excitement ${excitement} of 5 after ${daysKnown} ${daysKnown === 1 ? "day" : "days"}. That's the old pattern's favorite weather: the feeling is ahead of the evidence. Keep the excitement, keep the pearls, and let nothing move for thirty days. Re-read the story you wrote on the date below and see how much of it they've actually shown.`;
  if (excitement >= 4) return `Excitement ${excitement} of 5 after ${daysKnown} days. Enough time has passed for some evidence; the question is whether the facts list is as long as the feeling. If the facts are thin, that's the work: watch in the ordinary.`;
  return `Steady. Excitement ${excitement} of 5 after ${daysKnown} days. Let the mundane do the testing, and write what they show as facts.`;
}

// Safe for me: give and take

export const SAFE_QUESTIONS: { key: string; q: string; yes: string; no: string; unsure: string }[] = [
  { key: "reach", q: "Do they reach out when they don't need anything?", yes: "Yes, just to connect", no: "Mostly when they need something", unsure: "Not sure" },
  { key: "ask", q: "Do they ask about my life and wait for the answer?", yes: "Yes", no: "Not really", unsure: "Sometimes" },
  { key: "no", q: "When I've said no, what happened?", yes: "They accepted it", no: "The temperature changed", unsure: "I've never said no" },
  { key: "gave", q: "Have they done something for me without being asked?", yes: "Yes", no: "No", unsure: "Can't think of one" },
  { key: "drained", q: "After time with them, I feel…", yes: "Filled", no: "Drained", unsure: "Mixed" },
  { key: "stopped", q: "If I stopped giving, would they still be around?", yes: "I think so", no: "Honestly, probably not", unsure: "I don't know" },
  { key: "others", q: "How do they treat people who can't do anything for them?", yes: "Well", no: "Badly, or dismissively", unsure: "Haven't seen it" },
  { key: "secrets", q: "Have they kept something small I told them?", yes: "Yes", no: "It got around", unsure: "Not tested yet" },
];

export type SafeAnswer = "yes" | "no" | "unsure";

export function safeRead(answers: Record<string, SafeAnswer>): { level: "steady" | "mixed" | "oneWay"; text: string; untested: string[] } {
  const keys = SAFE_QUESTIONS.map((q) => q.key);
  const nos = keys.filter((k) => answers[k] === "no").length;
  const untested = SAFE_QUESTIONS.filter((q) => answers[q.key] === "unsure").map((q) => q.q);
  const level = nos >= 4 ? "oneWay" : nos >= 2 ? "mixed" : "steady";
  const text = {
    steady: "From what you've said, this looks like real give and take. Keep your pace and keep watching the small things, but the fear may be louder than the evidence here.",
    mixed: "It's mixed. Some of this is connection, and some flows one way. Try one small no this week and watch what happens. That single test tells you more than another month of wondering.",
    oneWay: "Most of what you've described flows one way: toward them. That's the \"valued for what I can offer\" pattern, and you're not imagining it. It doesn't have to end the friendship. It means access should match what they've shown: slow the giving, hold the pearls, and let a no be the test.",
  }[level];
  return { level, text, untested };
}

// The compass: raise it, adjust access, step back, or leave

export type Times = "first" | "second" | "pattern";
export type Said = "yes" | "no";
export type Expect = "repair" | "defensive" | "punish" | "unknown";
export type Repaired = "yes" | "no" | "untested";
export type Feel = "filled" | "drained" | "mixed";

export interface CompassAnswers {
  times: Times;
  said: Said;
  safety: boolean;
  expect: Expect;
  repaired: Repaired;
  feel: Feel;
  /** Which of my signals this is, if one fits. */
  signal?: string;
  /** Earlier sightings of that signal on this person. */
  priorSightings?: number;
  /** The signal is a hard line (gossip, broken confidence). */
  hardLine?: boolean;
}

export type CompassCall = "raise" | "raiseThenAdjust" | "adjust" | "stepBack" | "leave";

export const CALL_LABEL: Record<CompassCall, string> = {
  raise: "Say it once, small",
  raiseThenAdjust: "Say it plainly, then match access to what they show",
  adjust: "Adjust access quietly",
  stepBack: "Step back",
  leave: "Leave, or nearly",
};

export function compass(a: CompassAnswers): { call: CompassCall; why: string[]; moveOut: number; script: string | null } {
  const why: string[] = [];
  if (a.hardLine) {
    why.push("This is one of your hard lines. One clear sighting is enough: access moves, and no conversation is owed first.");
    return { call: a.feel === "drained" ? "stepBack" : "adjust", why, moveOut: a.feel === "drained" ? 2 : 1, script: null };
  }
  if ((a.priorSightings ?? 0) >= 2 && a.times !== "pattern") {
    why.push(`You've already noted this signal on them ${a.priorSightings} times. Three sightings is a pattern, whatever it feels like today.`);
    a = { ...a, times: "pattern" };
  }
  if (a.safety && a.times !== "first") {
    why.push("It touches your safety and it has happened more than once. Safety isn't a conversation to have again; it's access to change.");
    return { call: "leave", why, moveOut: 2, script: null };
  }
  if (a.safety) {
    why.push("It touches your safety. One time gets one plain sentence and a smaller circle while you watch.");
    return { call: "raiseThenAdjust", why, moveOut: 1, script: "When you did X, it crossed something for me. I need it not to happen again." };
  }
  if (a.times === "first" && a.said === "no") {
    why.push("First time, and they never heard the line out loud. People can't keep a boundary they don't know exists.");
    why.push("One sentence, no essay. Then you have data: what they do with a no.");
    return { call: "raise", why, moveOut: 0, script: "Hey, small thing: when X happened, it landed hard on me. Can we do it differently next time?" };
  }
  if (a.times === "first") {
    why.push("First time, and they knew. Worth one plain mention so it isn't a pattern in your head only.");
    return { call: "raise", why, moveOut: 0, script: "I mentioned X mattered to me, and it happened. I'm telling you once more because I'd like this to work." };
  }
  if (a.times === "second" && a.said === "yes" && a.expect !== "punish") {
    why.push("You said it, and it happened again. Say it once more, plainly, with what changes if it continues. Then match access to what they show.");
    return { call: "raiseThenAdjust", why, moveOut: 1, script: "I've said X matters to me, and it happened again. If it keeps happening, I'll need to step back from Y." };
  }
  if (a.expect === "punish" || (a.repaired === "no" && a.times === "pattern")) {
    why.push(a.expect === "punish" ? "Raising it costs you something last time. You don't owe another conversation to someone who punishes honesty." : "It's a pattern, you've said it, and repair hasn't come. The pattern is the answer.");
    why.push("Quiet adjustment isn't cowardice. It's letting access match what's been shown.");
    return { call: a.feel === "drained" ? "stepBack" : "adjust", why, moveOut: a.feel === "drained" ? 2 : 1, script: null };
  }
  if (a.times === "pattern" && a.said === "no") {
    why.push("It's a pattern, but they never heard it from you. One honest sentence before you decide anything; then you'll know.");
    return { call: "raise", why, moveOut: 0, script: "I've noticed X keeps happening, and I've never said it: it's hard for me. Can we talk about it?" };
  }
  why.push("It's a pattern and they know. Repair has been possible before, so one plain conversation is fair; if nothing changes, access moves.");
  return { call: "raiseThenAdjust", why, moveOut: 1, script: "X keeps happening. I'd rather say it than drift: I need this to change, and I'm telling you because I want to keep you." };
}

/** Ways to build friendship: small, practical, for both of them. */
export const WAYS = [
  { title: "Where people like us are", lines: ["A recurring thing beats a one-off: a class, a church table, a game night, a gym time. Go three times before deciding anything.", "Look for the people doing the thing, not the people performing it."] },
  { title: "The one small ask", lines: ["\"Want to grab coffee Thursday at ten?\" A day and a time. Vague invitations are how we protect ourselves from being alone together.", "One ask. If it's a no, it's a no about Thursday."] },
  { title: "Following up", lines: ["Remember one thing they said and ask about it next time. That's most of friendship.", "A text with no reason: \"thought of you.\" That's the whole message."] },
  { title: "Hosting something small", lines: ["Two people and a pot of soup is hosting. The house does not have to be ready.", "Say when it ends. \"Come at six, we'll wrap by eight.\" People relax when they know the shape."] },
  { title: "Being a friend back", lines: ["Show up to their thing. Reply within a day. Say the kind thing out loud.", "Let them help you once. Being helped is how they get to feel like a friend."] },
  { title: "When it fizzles", lines: ["Most friendships are seasonal. A fizzle is not a verdict on you.", "One more invitation, then let it rest. Resting is a layer, not a failure."] },
  { title: "Keeping your pace", lines: [TRUTH, "Excitement is allowed. Access is earned. Both can be true on the same day."] },
];


// The lonely hour

export type LonelyChoice = "smallAsk" | "place" | "partner" | "god" | "alone" | "waited" | "reachedBack";

export const LONELY_CHOICE_LABEL: Record<LonelyChoice, string> = {
  smallAsk: "Made one small ask",
  place: "Went to a recurring place",
  partner: "Turned toward my partner",
  god: "Sat with God",
  alone: "Did something that fills me, alone",
  waited: "Waited it out, 24 hours",
  reachedBack: "Reached for someone I'd released",
};

export const LONELY_TRUTHS = [
  "Loneliness is the cost of the inner work and of clearing out what didn't fit. It's a season, not a verdict, and not an emergency.",
  "The old pattern reaches for whoever is nearest. That's how the same friendships get rebuilt. The lonely hour is exactly when the signals matter most.",
  "A quiet orchard is still an orchard. Fewer, truer people take years to grow, and the years are already passing either way.",
  "Being alone with yourself well is the first friendship. It's also the one that makes the others safe.",
];

export const LONELY_MOVES = [
  { key: "smallAsk", text: "One small ask to someone in Getting to know or Friend: a day and a time. Not to someone you released." },
  { key: "place", text: "Go to the recurring place, even if no one talks to you tonight. The third time is when it starts." },
  { key: "partner", text: "Tell your partner you're lonely, as a fact, not a complaint. Sit on the same couch." },
  { key: "god", text: "Ten minutes with him, out loud. Lonely is allowed to be the whole prayer." },
  { key: "alone", text: "The thing that fills you when no one is watching: the walk, the song, the book, the bath." },
  { key: "waited", text: "Twenty-four hours before reaching for anyone you released. Re-read why you released them first." },
];

// Too long

export type StayKind = "person" | "place" | "situation";
export type ChangeSince = "none" | "some" | "real";

export const KEEPERS = [
  "Hope they'll change",
  "Guilt, or not wanting to hurt them",
  "The years already invested",
  "Fear of being lonely",
  "Money",
  "No alternative yet",
  "\"God wants me to stay\"",
  "It's familiar",
  "Waiting for a clean moment to leave",
  "They need me",
];

export const KEEPERS_HONEST = new Set(["Hope they'll change", "Guilt, or not wanting to hurt them", "The years already invested", "Fear of being lonely", "It's familiar", "Waiting for a clean moment to leave", "They need me", "\"God wants me to stay\""]);

export type StayCall = "time" | "watch" | "clear";

export function stayRead(daysSinceKnew: number, keepers: string[], change: ChangeSince): { call: StayCall; text: string } {
  const honest = keepers.filter((k) => KEEPERS_HONEST.has(k)).length;
  const practical = keepers.length - honest;
  const months = Math.round(daysSinceKnew / 30);
  if (change === "real") return { call: "clear", text: `You first knew ${months} ${months === 1 ? "month" : "months"} ago, and real change has come since. That's the case where staying was right. Keep checking; change that holds is the test.` };
  if (change === "none" && daysSinceKnew >= 90 && honest >= 1) {
    return { call: "time", text: `You first knew ${months} months ago. Nothing has changed since, and what keeps you is ${keepers.filter((k) => KEEPERS_HONEST.has(k)).map((k) => k.toLowerCase()).join(", ")}. That is the pattern you named: knowing, and staying anyway. The knowing was the answer. It's time.` };
  }
  if (change === "none" && practical > 0 && honest === 0) return { call: "watch", text: `Nothing has changed, and what keeps you is practical: ${keepers.map((k) => k.toLowerCase()).join(", ")}. That's a plan problem, not a courage problem. The smallest first step out is the work now.` };
  if (change === "some") return { call: "watch", text: `Some change since you first knew, ${months} ${months === 1 ? "month" : "months"} ago. Give it a date, not a feeling: check again in thirty days and see if "some" became "real" or slid back to "none."` };
  return { call: "watch", text: `You first knew ${months} ${months === 1 ? "month" : "months"} ago. Early yet. Name what would need to be different by the next check, and let the date do the deciding.` };
}

/** Thirty days since the last look is when the Today row asks "still there?" */
export function stayCheckDue(lastCheckDay: string, today: string): boolean {
  return daysBetween(lastCheckDay, today) >= 30;
}
