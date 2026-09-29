/**
 * Someone in my circle: the tappable flags, the prompt the coach sorts
 * with, and the parser that turns its reply into buckets. Plain functions
 * so they can be tested in Node.
 */

/** Green flags, in plain words. Tap as many as fit; add your own in the note. */
export const GREEN_FLAGS = [
  "Asks about my life and remembers",
  "Initiates, not only responds",
  "Takes a small no well",
  "Words and actions match over weeks",
  "Kind to people who can't do anything for them",
  "Speaks fairly about their exes and old friends",
  "Gives as well as receives",
  "Lets closeness grow at the pace of time we've had",
  "Owns a mistake without a fight",
  "Keeps small promises",
  "I feel filled after time with them",
  "Respects my time and my energy limits",
  "Comfortable with quiet; no pressure to perform",
  "Doesn't keep score",
  "Has their own life and friends",
  "Safe with my body, my faith, and my no",
];

/** Red flags, in plain words. A red flag is a pattern, not a verdict. */
export const RED_FLAGS = [
  "Talks mostly about themselves",
  "Only responds; never initiates",
  "Sulks, pushes, or punishes a small no",
  "Words and actions don't match",
  "Rude to servers, staff, or the quiet person",
  "Every ex or old friend was 'crazy'",
  "Asks for favors early",
  "Moving faster than the time we've had",
  "Turns a mistake into my fault",
  "Comments on my body, weight, or looks",
  "I feel drained after time with them",
  "Keeps score or brings up what they did for me",
  "Secrets, half-answers, or stories that shift",
  "Shares other people's private things with me",
  "Pushes past a boundary and calls it a joke",
  "Uses God, guilt, or 'should' to move me",
];

export interface CircleSort {
  green: string[];
  red: string[];
  confront: string[];
  monitor: string[];
  unclear: string[];
  line: string;
}

export const SORT_LABEL: Record<keyof Omit<CircleSort, "line">, string> = {
  green: "Green flags",
  red: "Red flags",
  confront: "Something to confront",
  monitor: "Something to monitor",
  unclear: "Not enough to tell yet",
};

const HEADINGS: [keyof Omit<CircleSort, "line">, RegExp][] = [
  ["green", /^green flags?:?$/i],
  ["red", /^red flags?:?$/i],
  ["confront", /^(something to confront|confront|to confront):?$/i],
  ["monitor", /^(something to monitor|monitor|to monitor|watch|something to watch):?$/i],
  ["unclear", /^(not enough to tell yet|unclear|not enough to tell|too soon to tell):?$/i],
];
const LINE_HEADING = /^(a line for you|one line for you|for you|a line):?$/i;

export const CIRCLE_SORT_PROMPT = `This is Someone in my circle, inside Re-Centered. The person is deciding how much room to give someone new, or someone they are letting closer, and has written what they know so far, with any green and red flags they tapped. Both people in this home trust fast when the vibes are good, build stories about new people in their heads, and then struggle to know, when a pattern shows, whether to raise it, quietly adjust access, or step back. Your job is to sort what they wrote, not to decide for them.

Sort ONLY what they actually told you. Do not invent facts, and do not guess at the person's motives. Their own words, kept short. Something they tapped as a flag belongs in that bucket unless what they wrote plainly contradicts it; say so if it does. A story ("she probably thinks...") is not a fact; if they wrote one, put the fact under what fits and the story under Not enough to tell yet, and say it is a story. If anything sounds unsafe (threats, hitting, stalking, control of money or movement), put it first under Red flags and say plainly that it is a safety matter, not a flag.

Answer with exactly these six headings, each on its own line, in this order, each followed by bullet lines starting with "- " (or one bullet "- Nothing here yet." when the bucket is empty):
Green flags:
Red flags:
Something to confront:
Something to monitor:
Not enough to tell yet:
A line for you:

Something to confront is a specific thing worth saying to them, small enough to say in one sentence; write it as the sentence they could say. Something to monitor is a pattern to watch over a few more weeks, with what would settle it either way. A line for you is one or two plain sentences, warm, no shame, ending with the truth that trust is earned in the mundane, not declared in the intense, in your own words. No emoji, no headings other than these six.`;

/** Breaks the coach's reply into buckets. Missing headings become empty; stray text before the first heading is dropped. */
export function parseSort(text: string): CircleSort {
  const sort: CircleSort = { green: [], red: [], confront: [], monitor: [], unclear: [], line: "" };
  let current: keyof CircleSort | null = null;
  const lineParts: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^#+\s*/, "").replace(/^\*\*(.*?)\*\*:?$/, "$1").replace(/^__(.*?)__:?$/, "$1").trim();
    if (!line) continue;
    const heading = HEADINGS.find(([, re]) => re.test(line));
    if (heading) {
      current = heading[0];
      continue;
    }
    if (LINE_HEADING.test(line)) {
      current = "line";
      continue;
    }
    if (!current) continue;
    const item = line.replace(/^[-*•]\s*/, "").trim();
    if (!item) continue;
    if (current === "line") {
      lineParts.push(item);
      continue;
    }
    if (/^nothing here( yet)?\.?$/i.test(item) || /^none\.?$/i.test(item)) continue;
    sort[current].push(item.slice(0, 400));
  }
  sort.line = lineParts.join(" ").slice(0, 600);
  return sort;
}

export function hasAnything(sort: CircleSort): boolean {
  return sort.green.length + sort.red.length + sort.confront.length + sort.monitor.length + sort.unclear.length > 0 || sort.line.length > 0;
}

/** The person's entry as the coach sees it, and as the opening of a talk. */
export function circleText(entry: { name: string; text: string; green: string[]; red: string[]; sort?: CircleSort | null }): string {
  const parts = [`About ${entry.name}.`];
  if (entry.green.length) parts.push(`Green flags I tapped: ${entry.green.join("; ")}.`);
  if (entry.red.length) parts.push(`Red flags I tapped: ${entry.red.join("; ")}.`);
  parts.push(`What I wrote: ${entry.text}`);
  if (entry.sort && hasAnything(entry.sort)) {
    const buckets = (Object.keys(SORT_LABEL) as (keyof typeof SORT_LABEL)[])
      .filter((k) => entry.sort![k].length)
      .map((k) => `${SORT_LABEL[k]}: ${entry.sort![k].join("; ")}`);
    parts.push(`How it was sorted: ${buckets.join(" | ")}`);
  }
  return parts.join("\n");
}
