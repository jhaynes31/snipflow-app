/**
 * Tend's tool library. Pure. Which tools exist, what they're for, which
 * check-in tiles they fit, and how the library orders them for a person.
 */
export interface ToolMeta {
  key: string;
  name: string;
  forWhen: string;
  kinds: string[];
  /** The two-minute version, in one line, so no one has to commit to more. */
  twoMinute: string;
  needsFaith?: boolean;
}

export const TOOLS: ToolMeta[] = [
  { key: "groundMe", name: "Ground Me", forWhen: "Overwhelmed, wired, or sensory overload", kinds: ["overwhelmed", "wired", "sensory", "unsure"], twoMinute: "Six slow breaths with the circle." },
  { key: "shameInterrupter", name: "Shame Interrupter", forWhen: "Shame spiral or harsh self-talk", kinds: ["shame", "low"], twoMinute: "Name the voice, write one kinder true sentence." },
  { key: "goodEnough", name: "Good Enough", forWhen: "Perfectionism or stuck on quality", kinds: ["overwhelmed", "cantStart"], twoMinute: "Write what done looks like, in one line." },
  { key: "smallestStep", name: "Smallest Step", forWhen: "Can't start", kinds: ["cantStart", "overwhelmed"], twoMinute: "Name a 2-minute first action and start the timer." },
  { key: "shutdownRecovery", name: "Shutdown Recovery", forWhen: "Shut down or overloaded", kinds: ["shutDown", "sensory", "heavy"], twoMinute: "A few yes/no taps. Nothing else." },
  { key: "anchor", name: "Anchor", forWhen: "Low, heavy, or afraid", kinds: ["low", "oldPain", "heavy"], twoMinute: "Read one saved anchor.", needsFaith: true },
  { key: "loopBreaker", name: "Loop Breaker", forWhen: "Careful logic has become a trap", kinds: ["loop"], twoMinute: "Dump the loop as cards. Sort later." },
  { key: "storyCheck", name: "Story Check", forWhen: "The sting of feeling rejected or left out", kinds: ["rejected", "oldPain"], twoMinute: "Just the facts a camera would record." },
  { key: "evidenceBank", name: "Evidence Bank", forWhen: "Low self-worth, or noticing something good", kinds: ["shame", "low"], twoMinute: "Read three entries. Or add one." },
  { key: "projectThinker", name: "Project Thinker", forWhen: "A project from idea to finish", kinds: ["overwhelmed", "cantStart"], twoMinute: "Name the project and what done looks like." },
  { key: "focusMode", name: "Focus Mode", forWhen: "One task, one timer, nothing else", kinds: ["cantStart", "overwhelmed"], twoMinute: "One task, a short timer, start." },
  { key: "thenOrNow", name: "Then or Now", forWhen: "Old pain showing up in the present", kinds: ["oldPain", "rejected"], twoMinute: "Name the year, the room, one thing that is different now." },
  { key: "sitWithIt", name: "Sit With It", forWhen: "A worry asking for the same reassurance again", kinds: ["loop", "wired"], twoMinute: "Name the urge, rate it, sit five minutes." },
  { key: "talkItOut", name: "Talk It Out", forWhen: "Anything. A private chat with the coach", kinds: ["unsure", "overwhelmed", "low", "heavy", "loop", "rejected", "oldPain", "shame", "wired", "cantStart", "shutDown", "sensory"], twoMinute: "Say what's going on. Get one small next step." },
  { key: "pauseBigMoves", name: "Pause Before Big Moves", forWhen: "Revved up, on a steady day", kinds: ["wired"], twoMinute: "Read your own rule." },
];

export interface ToolStats {
  [key: string]: { aLot?: number; little: number; notReally: number; notAtAll: number; uses: number; lastUsed: number } | undefined;
}

/** Library order: tools that have helped come first (a lot counts more than a little), then recently used, then the rest. */
export function orderTools(stats: ToolStats, faith: boolean): ToolMeta[] {
  const score = (t: ToolMeta) => {
    const s = stats[t.key];
    if (!s) return 0;
    return (s.aLot ?? 0) * 5 + s.little * 3 + s.uses * 0.1 + s.lastUsed / 1e13;
  };
  return TOOLS.filter((t) => !t.needsFaith || faith).sort((a, b) => score(b) - score(a));
}

/** Tools to offer right after a check-in, best-fit first. */
export function suggestTools(kinds: string[], stats: ToolStats, faith: boolean, max = 3): ToolMeta[] {
  const ordered = orderTools(stats, faith);
  const fit = ordered.filter((t) => t.kinds.some((k) => kinds.includes(k)));
  const rest = ordered.filter((t) => !fit.includes(t));
  return [...fit, ...rest].slice(0, max);
}

export function toolByKey(key: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.key === key);
}
