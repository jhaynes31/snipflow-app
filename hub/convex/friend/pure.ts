/**
 * Pip, the Friend (2026-11-04, Jen's spec, docs/friend-spec.md): the pure
 * parts. Persona defaults and reader, the rally rules' post-check, the
 * opener picker, vibe seeds, curveball decisions, and the summarizer's
 * output parser. No I/O; tested in Node.
 */
import personaJson from "../../core/friend/friend_persona.json" with { type: "json" };

export interface Neighbor { name: string; nickname?: string; who: string }
export interface Persona {
  name: string;
  look: string;
  traits: string[];
  sliders: { playful: number; blunt: number; chatty: number };
  punFrequency: number;
  spontaneity: number;
  nudgesEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHours: { start: number; end: number };
  voiceEnabled: boolean;
  voiceName: string;
  premiumVoiceEnabled: boolean;
  interests: string[];
  opinions: string[];
  threads: string[];
  neighbors: Neighbor[];
}

export const DEFAULT_PERSONA: Persona = personaJson as Persona;

const SHARE_TABS = ["coach", "hearth", "every-box", "fitness", "rooted", "orchard", "kept-word", "tend", "love-and-release"] as const;
export type ShareTab = (typeof SHARE_TABS)[number];
export const SHARE_TAB_LABEL: Record<ShareTab, string> = { coach: "The coach", hearth: "Mom and Dad (The Hearth)", "every-box": "Every Box", fitness: "Heartwood Fitness", rooted: "Rooted", orchard: "The Orchard", "kept-word": "Kept Word", tend: "Tend", "love-and-release": "Re-Centered" };
export const SHARE_DEFAULTS: Record<ShareTab, boolean> = { coach: true, hearth: true, "every-box": true, fitness: true, rooted: false, orchard: false, "kept-word": false, tend: false, "love-and-release": false };
export const SHARE_TABS_LIST: ShareTab[] = [...SHARE_TABS];

export interface FriendSettings {
  persona: Persona;
  shares: Record<ShareTab, boolean>;
  busy: boolean;
}

function num(v: unknown, d: number, lo = 0, hi = 100): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d;
}
function list(v: unknown, d: string[]): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim().slice(0, 300)).slice(0, 60) : d;
}

/** Jen's edits live in moduleSettings.friend; anything she hasn't touched is the default. */
export function readFriendSettings(moduleSettings: Record<string, unknown> | undefined): FriendSettings {
  const raw = (moduleSettings?.friend ?? {}) as Record<string, unknown>;
  const p = (raw.persona ?? {}) as Partial<Record<keyof Persona, unknown>>;
  const sliders = (p.sliders ?? {}) as Partial<Persona["sliders"]>;
  const qh = (p.quietHours ?? {}) as Partial<Persona["quietHours"]>;
  const persona: Persona = {
    name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 40) : DEFAULT_PERSONA.name,
    look: typeof p.look === "string" && p.look.trim() ? p.look.trim().slice(0, 500) : DEFAULT_PERSONA.look,
    traits: list(p.traits, DEFAULT_PERSONA.traits),
    sliders: { playful: num(sliders.playful, DEFAULT_PERSONA.sliders.playful), blunt: num(sliders.blunt, DEFAULT_PERSONA.sliders.blunt), chatty: num(sliders.chatty, DEFAULT_PERSONA.sliders.chatty) },
    punFrequency: num(p.punFrequency, DEFAULT_PERSONA.punFrequency),
    spontaneity: num(p.spontaneity, DEFAULT_PERSONA.spontaneity),
    nudgesEnabled: typeof p.nudgesEnabled === "boolean" ? p.nudgesEnabled : DEFAULT_PERSONA.nudgesEnabled,
    quietHoursEnabled: typeof p.quietHoursEnabled === "boolean" ? p.quietHoursEnabled : DEFAULT_PERSONA.quietHoursEnabled,
    quietHours: { start: num(qh.start, DEFAULT_PERSONA.quietHours.start, 0, 23), end: num(qh.end, DEFAULT_PERSONA.quietHours.end, 0, 23) },
    voiceEnabled: typeof p.voiceEnabled === "boolean" ? p.voiceEnabled : false,
    voiceName: typeof p.voiceName === "string" ? p.voiceName.slice(0, 120) : "",
    premiumVoiceEnabled: false,
    interests: list(p.interests, DEFAULT_PERSONA.interests),
    opinions: list(p.opinions, DEFAULT_PERSONA.opinions),
    threads: list(p.threads, DEFAULT_PERSONA.threads),
    neighbors: Array.isArray(p.neighbors) && p.neighbors.length ? (p.neighbors as Neighbor[]).filter((n) => n && typeof n.name === "string" && typeof n.who === "string").slice(0, 8) : DEFAULT_PERSONA.neighbors,
  };
  const sharesRaw = (raw.shares ?? {}) as Record<string, unknown>;
  const shares = Object.fromEntries(SHARE_TABS.map((t) => [t, typeof sharesRaw[t] === "boolean" ? sharesRaw[t] : SHARE_DEFAULTS[t]])) as Record<ShareTab, boolean>;
  return { persona, shares, busy: raw.busy === true };
}

// ---------- The rally ----------

/** Therapist-speak Pip never uses. Checked case-insensitively. */
export const BANNED_PHRASES = [
  "it sounds like you're feeling",
  "it sounds like you are feeling",
  "that's valid",
  "that is valid",
  "how does that make you feel",
  "i hear you",
  "hold space",
  "i'm here for you",
  "thank you for sharing",
  "thanks for sharing",
  "that must be hard",
  "it's okay to feel",
  "your feelings are valid",
  "let's unpack",
  "i want to validate",
  "safe space",
  "as an ai language model",
];

export function countQuestions(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

export interface RallyCheck { ok: boolean; reasons: string[] }

/**
 * The cheap guard: at most one question, length tracks hers (a one-liner
 * gets at most a short paragraph; nothing over three short paragraphs
 * unless she wrote a lot), and no therapist-speak.
 */
export function rallyCheck(reply: string, userMessage: string, opts: { askedStreak?: number } = {}): RallyCheck {
  const reasons: string[] = [];
  const r = reply.trim();
  if (countQuestions(r) > 1) reasons.push("more than one question");
  const low = r.toLowerCase();
  for (const b of BANNED_PHRASES) if (low.includes(b)) reasons.push(`banned phrase: ${b}`);
  const userWords = userMessage.trim().split(/\s+/).filter(Boolean).length;
  const replyWords = r.split(/\s+/).filter(Boolean).length;
  const cap = userWords <= 8 ? 70 : userWords <= 40 ? 140 : 260;
  if (replyWords > cap) reasons.push(`too long (${replyWords} words for a ${userWords}-word message)`);
  const paragraphs = r.split(/\n\s*\n/).filter((p) => p.trim()).length;
  if (paragraphs > 3 && userWords < 120) reasons.push("more than three paragraphs");
  if ((opts.askedStreak ?? 0) >= 3 && /\?\s*$/.test(r)) reasons.push("asked three turns in a row; this one must offer something");
  return { ok: reasons.length === 0, reasons };
}

/** Does her message read as heavy? Then no jokes, no curveballs. */
export function readsHeavy(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(cried|crying|cry|grief|grieving|died|death|funeral|scared|terrified|panic|panicking|flashback|hopeless|worthless|ashamed|shame|abandoned|hurt me|hurting|heartbroken|exhausted|burned out|burnt out|can't do this|falling apart|depressed|lonely|alone|miscarriage|diagnos|hospital|relapse|anxious|anxiety attack|shutdown|shut down|numb)\b/.test(t) || /\b(i hate myself|i'm not okay|im not okay|not okay|bad day|rough week|hard week|awful|terrible)\b/.test(t);
}

/** Does the last turn feel like a lull? Short and low-energy. */
export function readsLull(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.split(/\s+/).length <= 4 && /^(lol|haha|ha|yeah|yep|yup|ok|okay|k|sure|idk|meh|true|same|mhm|hm|hmm|nice|cool|fair)\b/.test(t);
}

// ---------- Openers, vibes, curveballs ----------

export type OpenerType = "followUp" | "hotTake" | "game" | "chewing" | "checkIn" | "activity";
export const OPENER_WEIGHTS: Record<OpenerType, number> = { followUp: 30, hotTake: 18, game: 12, chewing: 13, checkIn: 17, activity: 10 };

/** A seeded pick so tests are steady. `rng` returns [0, 1). */
export function pickOpener(lastType: OpenerType | null, hasMemory: boolean, rng: () => number = Math.random): OpenerType {
  const pool = (Object.keys(OPENER_WEIGHTS) as OpenerType[]).filter((t) => t !== lastType && (hasMemory || t !== "followUp"));
  const total = pool.reduce((n, t) => n + OPENER_WEIGHTS[t], 0);
  let x = rng() * total;
  for (const t of pool) {
    x -= OPENER_WEIGHTS[t];
    if (x < 0) return t;
  }
  return pool[pool.length - 1];
}

export type Vibe = "chatty" | "reflective" | "goofy" | "mellow";
export const VIBES: Vibe[] = ["chatty", "reflective", "goofy", "mellow"];
export function pickVibe(rng: () => number = Math.random): Vibe {
  return VIBES[Math.floor(rng() * VIBES.length)] ?? "chatty";
}

/** About one turn in six at default spontaneity, never on a heavy turn or a lull she just gave. */
export function wantsCurveball(turn: number, spontaneity: number, lastUserHeavy: boolean, rng: () => number = Math.random): boolean {
  if (lastUserHeavy || turn < 2) return false;
  const every = Math.max(3, Math.round(12 - spontaneity / 12));
  return rng() < 1 / every;
}

// ---------- Memory ----------

export const MEMORY_CATEGORIES = ["people", "plans", "jokes", "games", "feelings", "faith", "work", "home", "likes", "other"] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export interface SummaryOut {
  aboutJen: { text: string; category: MemoryCategory; followUpAfter?: string }[];
  aboutPip: { kind: "opinion" | "interest" | "thread"; text: string }[];
  insideJokes: string[];
  runningBits: string[];
  topics: string[];
  summary: string;
}

/** Reads the summarizer's JSON leniently; anything missing becomes empty. */
export function parseSummary(text: string): SummaryOut {
  const empty: SummaryOut = { aboutJen: [], aboutPip: [], insideJokes: [], runningBits: [], topics: [], summary: "" };
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return empty;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return empty;
  }
  if (!raw || typeof raw !== "object") return empty;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const strs = (v: unknown, max: number) => (Array.isArray(v) ? v.map((x) => str(x, max)).filter(Boolean).slice(0, 12) : []);
  const aboutJen = Array.isArray(o.aboutJen)
    ? o.aboutJen
        .map((x) => {
          const e = (x ?? {}) as Record<string, unknown>;
          const text = str(e.text, 300);
          const cat = (MEMORY_CATEGORIES as readonly string[]).includes(String(e.category)) ? (e.category as MemoryCategory) : "other";
          const follow = str(e.followUpAfter, 10);
          return text ? { text, category: cat, ...(/^\d{4}-\d{2}-\d{2}$/.test(follow) ? { followUpAfter: follow } : {}) } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, 12)
    : [];
  const aboutPip = Array.isArray(o.aboutPip)
    ? o.aboutPip
        .map((x) => {
          const e = (x ?? {}) as Record<string, unknown>;
          const text = str(e.text, 300);
          const kind: "opinion" | "interest" | "thread" = e.kind === "opinion" || e.kind === "interest" || e.kind === "thread" ? e.kind : "opinion";
          return text ? { kind, text } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x)
        .slice(0, 8)
    : [];
  return { aboutJen, aboutPip, insideJokes: strs(o.insideJokes, 200), runningBits: strs(o.runningBits, 400), topics: strs(o.topics, 120), summary: str(o.summary, 600) };
}

/** Which follow-ups are due today. */
export function dueFollowUps<T extends { followUpAfter?: string; doNotRaise?: boolean }>(rows: T[], today: string): T[] {
  return rows.filter((r) => !r.doNotRaise && r.followUpAfter && r.followUpAfter <= today);
}

// ---------- Activities ----------

export type Energy = "low" | "medium" | "high";
export type Duration = 5 | 15 | 30;
export interface ActivitySeed { title: string; category: string; description: string; energy: Energy; duration: Duration; needsScreen: boolean }

export const ACTIVITY_CATEGORIES = ["Conversation games", "Deep talks", "Creative together", "Brain games", "Watch, read, listen along", "Learn something", "Plan and dream", "Steam and gaming"] as const;

export const ACTIVITY_SEED: ActivitySeed[] = [
  { title: "Would you rather", category: "Conversation games", description: "Silly or real, rapid fire.", energy: "low", duration: 5, needsScreen: false },
  { title: "This-or-that, rapid fire", category: "Conversation games", description: "Ten in a row, no thinking allowed.", energy: "low", duration: 5, needsScreen: false },
  { title: "Two truths and a lie", category: "Conversation games", description: "Pip plays too, honestly framed.", energy: "low", duration: 5, needsScreen: false },
  { title: "Hot take court", category: "Conversation games", description: "Defend a silly opinion. Pip prosecutes.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Twenty questions", category: "Conversation games", description: "Pip thinks of something. You have twenty.", energy: "low", duration: 15, needsScreen: false },
  { title: "Question deck: light", category: "Deep talks", description: "Childhood favorites, small joys, oddly specific preferences.", energy: "low", duration: 15, needsScreen: false },
  { title: "Question deck: real", category: "Deep talks", description: "What you're proud of lately, what you're carrying, what you want more of.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Question deck: deep", category: "Deep talks", description: "Faith and meaning, what-ifs, the things under the things. Only when you're up for it.", energy: "medium", duration: 30, needsScreen: false },
  { title: "Story, one sentence each", category: "Creative together", description: "Pip starts. You add. It goes where it goes.", energy: "medium", duration: 15, needsScreen: false },
  { title: "The night Bramble's inn got a mysterious guest", category: "Creative together", description: "A Juniper-and-Bramble saga, built together.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Invent a town for the Shire", category: "Creative together", description: "Name it, map it, decide who runs the bakery.", energy: "medium", duration: 30, needsScreen: false },
  { title: "Co-write a silly song", category: "Creative together", description: "About anything. Rhymes optional, chorus mandatory.", energy: "high", duration: 15, needsScreen: false },
  { title: "Design a dream garden", category: "Creative together", description: "What grows where, and what the bench faces.", energy: "low", duration: 15, needsScreen: false },
  { title: "Trivia, pick a topic", category: "Brain games", description: "Animals, hymns, games, anything. Pip keeps score badly.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Riddles", category: "Brain games", description: "Pip has a few. Some are terrible on purpose.", energy: "low", duration: 5, needsScreen: false },
  { title: "Word chain", category: "Brain games", description: "Last letter, next word, themed if you like.", energy: "low", duration: 5, needsScreen: false },
  { title: "Pick a show or book together", category: "Watch, read, listen along", description: "Both share reactions as you go. Pip keeps the 'currently into' list.", energy: "low", duration: 30, needsScreen: false },
  { title: "An album, start to finish", category: "Watch, read, listen along", description: "You play it; Pip asks about the track that got you.", energy: "low", duration: 30, needsScreen: false },
  { title: "Dig into a topic", category: "Learn something", description: "Animal behavior, how sourdough works, a book of the Bible. Either of you picks.", energy: "medium", duration: 30, needsScreen: false },
  { title: "A Bible book, a chapter at a time", category: "Learn something", description: "Pip asks the honest questions. The Well has the text.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Bucket list", category: "Plan and dream", description: "Add three. Pip adds three. Argue about them.", energy: "low", duration: 15, needsScreen: false },
  { title: "If we had a free Saturday", category: "Plan and dream", description: "Plan it hour by hour. Nobody has to do it.", energy: "low", duration: 15, needsScreen: false },
  { title: "A letter to future you", category: "Plan and dream", description: "Six months out. Pip keeps it and brings it back.", energy: "medium", duration: 15, needsScreen: false },
  { title: "What should I play next", category: "Steam and gaming", description: "Tell Pip your mood; it argues for something.", energy: "low", duration: 5, needsScreen: false },
  { title: "Review a game together", category: "Steam and gaming", description: "Stars out of five, with one hot take each.", energy: "medium", duration: 15, needsScreen: false },
  { title: "Game night", category: "Steam and gaming", description: "Pip on the second screen while you play. Shorter messages, more reactions.", energy: "medium", duration: 30, needsScreen: true },
];

/** Pick an activity for a surprise: fits energy and time, avoids the last three days, favors favorites. */
export function surpriseActivity<T extends { _id: string; energy: Energy; duration: Duration; favorite?: boolean; lastDoneAt?: number }>(rows: T[], want: { energy?: Energy; maxMinutes?: number }, now: number, rng: () => number = Math.random): T | null {
  const three = 3 * 86_400_000;
  let pool = rows.filter((r) => (!want.energy || r.energy === want.energy) && (!want.maxMinutes || r.duration <= want.maxMinutes) && (!r.lastDoneAt || now - r.lastDoneAt > three));
  if (pool.length === 0) pool = rows;
  if (pool.length === 0) return null;
  const weighted = pool.flatMap((r) => (r.favorite ? [r, r] : [r]));
  return weighted[Math.floor(rng() * weighted.length)] ?? null;
}

export function todayKey(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}
