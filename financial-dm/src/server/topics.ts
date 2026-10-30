import { createServerFn } from "@tanstack/react-start";
import { FACTS, MOVES, STAT_FACTS, TOPIC_PAIN_POINTS } from "./seed-facts";
import { requireAdmin } from "~/server/auth";

export { FACTS, MOVES, STAT_FACTS, TOPIC_PAIN_POINTS, TOPIC_BANK, TOPIC_NAMES } from "./seed-facts";

/**
 * One topic pool and one roll for every generator.
 *
 * The content itself (facts, pain points, sourced stats, practical moves)
 * lives in seed-facts.ts, one block per topic. This file is the logic:
 * rolling topics, choosing the statistic a Stat Card leads with, and the
 * shared prompt lines every generator sends.
 *
 * A TopicPick is a topic label, one supporting fact, and a short list of
 * pain points: the specific situations a viewer might be in that this topic
 * speaks to. John picks the pain point he wants the content to address and
 * it flows into the generation prompt next to the topic and the fact.
 */

export interface TopicPick {
  topic: string;
  fact: string;
  painPoints: string[];
}

/** A topic the owner has chosen plus the pain point to address. */
export interface TopicSelection {
  topic: string;
  fact: string;
  painPoint: string;
  /** The fact as rolled, kept when John edits `fact` in the picker. */
  sourceFact?: string;
}

/** The topic the pool falls back to when a name is unknown. */
export const DEFAULT_TOPIC = "Paycheck to Paycheck";

/** True when a sentence carries a real figure (digits, $, %, or a spelled out quantity). */
export function hasNumber(text: string): boolean {
  if (/\d|[$%]/.test(text)) return true;
  if (/\b(about |roughly |nearly )?(half|a third|two thirds|a quarter|three quarters)\b/i.test(text)) return true;
  return /\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty|half|third|quarter|double|twice)\b\s+(to\s+\w+\s+)?(years?|months?|weeks?|days?|times|percent|paychecks?|out\s+of|in\s+\w+)/i.test(
    text,
  );
}

const pickOne = <T,>(list: T[]): T | null => (list.length ? list[Math.floor(Math.random() * list.length)] : null);

/** Case insensitive lookup of a topic key in one of the bank maps. */
function keyFor(map: Record<string, unknown>, topic: string): string | undefined {
  const want = topic.trim().toLowerCase();
  return Object.keys(map).find((k) => k.toLowerCase() === want);
}

/**
 * The verified statistic a Stat Card should lead with. The curated, sourced
 * STAT_FACTS entry wins; then the chosen fact if it already carries a
 * number; then any numeric fact from the same topic. Null only for a topic
 * outside the bank whose fact has no number.
 */
export function statFactFor(topic: string, fact: string): string | null {
  const key = keyFor(STAT_FACTS, topic);
  const curated = key ? pickOne(STAT_FACTS[key]) : null;
  if (curated) return curated;
  const own = (fact || "").trim();
  if (own && hasNumber(own)) return own;
  const group = buildTopicGroups().find((g) => g.topic.toLowerCase() === topic.trim().toLowerCase());
  return pickOne((group?.facts ?? []).filter(hasNumber));
}

const GENERIC_PAIN_POINTS = [
  "I do not know where to start with this",
  "I have been putting this off because it feels overwhelming",
  "I am not sure this applies to someone like me",
];

export function painPointsFor(topic: string): string[] {
  const key = keyFor(TOPIC_PAIN_POINTS, topic);
  return key ? TOPIC_PAIN_POINTS[key] : GENERIC_PAIN_POINTS;
}

/** The practical moves for a topic, empty for a topic outside the bank. */
export function movesFor(topic: string): string[] {
  const key = keyFor(MOVES, topic);
  return key ? MOVES[key] : [];
}

// ── Topic pool ─────────────────────────────────────────────────────

export function buildTopicPool(): TopicPick[] {
  const pool: TopicPick[] = [];
  for (const [category, facts] of Object.entries(FACTS)) {
    for (const f of facts) {
      pool.push({ topic: category, fact: f, painPoints: painPointsFor(category) });
    }
  }
  return pool;
}

/** Every distinct topic name with the facts that back it. */
export function buildTopicGroups(): Array<{ topic: string; facts: string[] }> {
  return Object.entries(FACTS).map(([topic, facts]) => ({ topic, facts }));
}

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` distinct topics, each topic name equally likely, then one
 * random fact under each. Topics named in `exclude` (normally the previous
 * roll) are skipped while enough other topics remain, so "Roll again" always
 * shows John something new.
 */
export function pickRandomTopics(count = 3, exclude: string[] = []): TopicPick[] {
  const groups = buildTopicGroups();
  if (groups.length === 0) {
    return [
      {
        topic: DEFAULT_TOPIC,
        fact: "Living paycheck to paycheck is now the majority experience in America, not a sign that someone did something wrong.",
        painPoints: painPointsFor(DEFAULT_TOPIC),
      },
    ];
  }
  const want = Math.min(count, groups.length);
  const skip = new Set(exclude.map((t) => t.trim().toLowerCase()));
  const fresh = groups.filter((g) => !skip.has(g.topic.toLowerCase()));
  const candidates = fresh.length >= want ? fresh : groups;
  return shuffle(candidates)
    .slice(0, want)
    .map((g) => ({
      topic: g.topic,
      fact: g.facts[Math.floor(Math.random() * g.facts.length)],
      painPoints: painPointsFor(g.topic),
    }));
}

/**
 * Roll three topics (with their pain points) for any generator. Pass the
 * topics currently on screen as `exclude` to guarantee a different set.
 */
export const getRandomTopics = createServerFn()
  .middleware([requireAdmin])
  .validator((d?: { exclude?: string[] }) => ({
    exclude: Array.isArray(d?.exclude) ? d.exclude.map(String).slice(0, 12) : [],
  }))
  .handler(async ({ data }): Promise<TopicPick[]> => pickRandomTopics(3, data.exclude));

/** Two practical moves for the prompt, different each time so pieces on the same topic do not repeat. */
export function pickMoves(topic: string, count = 2): string[] {
  return shuffle(movesFor(topic)).slice(0, count);
}

/**
 * The shared "what is this content about" section of every user message.
 * Every generator sends the same inputs so they read as one system: the
 * topic, the supporting fact, the viewer's pain point, and one or two
 * practical moves the viewer can actually make this week.
 */
export function topicPromptLines(sel: {
  topic: string;
  fact: string;
  painPoint?: string;
  moves?: string[];
}): string {
  const lines = [`Topic: ${sel.topic}`, `Supporting fact: ${sel.fact}`];
  lines.push(
    `Pain point this content must speak to (the viewer's own situation, address it directly): ${
      (sel.painPoint || "").trim() || "not specified, pick the most common worry about this topic"
    }`,
  );
  const moves = (sel.moves ?? pickMoves(sel.topic)).map((m) => m.trim()).filter(Boolean);
  if (moves.length) {
    lines.push(
      "Practical moves the viewer can make this week (work one or two in naturally, in John's words; they are the help, not a footnote; keep every number exactly as written):",
      ...moves.map((m) => `- ${m}`),
    );
  }
  return lines.join("\n");
}
