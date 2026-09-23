import { TOOL_INDEX, type ToolEntry } from "./toolIndex.ts";

/**
 * Paths (2026-09-23, Jen's idea): a short chain of tools, two to five, for one
 * situation, walked one step at a time with a single Next button. Pure and
 * self-contained like the tool index so the Convex bundle, the browser and the
 * tests all load it. Every step is a tool key from TOOL_INDEX; a path is only
 * offered when every one of its steps is available to this person.
 *
 * `who` says whose life a path was written for. "her" paths lean on Jen's
 * rooms (Re-Centered's inner room, The Hearth); "john" paths on Metamorphosis.
 * The room gates decide what is actually offered, not the names.
 */
export interface Path {
  key: string;
  name: string;
  /** One line: when to reach for it. */
  when: string;
  /** Words people say when this is what they need. */
  words: string[];
  steps: string[];
  who: "her" | "john" | "either";
}

const P = (key: string, name: string, when: string, words: string[], steps: string[], who: Path["who"] = "either"): Path => ({ key, name, when, words, steps, who });

export const PATHS: Path[] = [
  // Hers
  P("her.stung", "Something stung", "Someone said or did something and it landed hard.", ["stung", "hurt", "they said", "snapped at me", "criticized", "landed on me"], ["tend.storyCheck", "rc.whose", "rc.landed", "hh.sit"], "her"),
  P("her.dysregulated", "Dysregulated", "Wired, shaky, flooded, or checked out. Body first.", ["dysregulated", "flooded", "wired", "shaky", "can't calm down", "nervous system", "panicking", "overwhelmed"], ["tend.groundMe", "fitness.somatic", "hh.sit", "tend.smallestStep"], "her"),
  P("her.unheard", "Unheard and misunderstood", "You said it and nobody got it. Somewhere to be heard, then a way to say it that lands.", ["unheard", "misunderstood", "nobody listens", "no one gets it", "not heard", "talked over", "dismissed", "invisible"], ["hh.told", "tend.storyCheck", "hub.headsUp", "hh.know"], "her"),
  P("her.flare", "Flare day", "The body called it. Run the day the way a mother would.", ["flare", "flare day", "sick day", "can't get up", "everything hurts", "crashed"], ["apothecary.now", "hh.askHer", "hh.care", "hh.sit"], "her"),
  P("her.mirror", "The mirror got loud", "An old voice about your body is talking.", ["mirror", "ugly", "hate my body", "my body", "appearance", "looks", "weight"], ["hh.eyes", "rm.captive", "hh.askHer", "tend.evidenceBank"], "her"),
  P("her.overfunction", "About to overfunction", "You can feel yourself picking up what isn't yours.", ["overfunction", "rescue", "fix it for him", "pick it up", "carrying it", "his problem"], ["rc.pause", "rc.whose", "rc.boundaries"], "her"),
  P("her.lie", "An old lie is running me", "A line from the past has the wheel.", ["old lie", "lie", "believing", "not enough", "worthless", "old story", "shame"], ["tend.shameInterrupter", "rm.captive", "rm.rehearse", "rm.live"], "her"),
  P("her.wordNotKept", "A word wasn't kept", "The plan you wrote on a steady day, then landing it, then repair if it's needed.", ["word wasn't kept", "didn't do it", "broke his word", "he forgot", "didn't follow through"], ["rc.now", "rc.landed", "tend.repair"], "her"),
  P("her.lonely", "Lonely", "A quiet hour that's turned into a heavy one.", ["lonely", "alone", "no one to call", "isolated", "no friends"], ["orchard.lonely", "hh.sit", "hh.know", "orchard.people"], "her"),
  P("her.cantStart", "Can't start", "The thing is there and you aren't moving.", ["can't start", "cant start", "stuck", "procrastinating", "frozen", "avoiding"], ["tend.smallestStep", "tend.focusMode", "fitness.five"], "her"),
  P("her.yesNo", "About to say yes when I mean no", "The fawn is up. Slow it down, then say the true thing.", ["say yes", "mean no", "fawn", "people pleasing", "can't say no", "agreed to"], ["lr.fawn", "lr.pause", "lr.boundary"], "her"),
  P("her.spiral", "Spiraling", "Looping, ruminating, the same thought on repeat.", ["spiral", "spiraling", "looping", "ruminating", "can't stop thinking", "overthinking", "obsessing"], ["tend.loopBreaker", "tend.sitWithIt", "fitness.somatic", "hh.sit"], "her"),
  P("her.confused", "Confused about someone", "Someone's behavior doesn't add up and the story in your head is loud.", ["confused about", "mixed signals", "what did they mean", "why did they", "left on read", "weird about"], ["orchard.compass", "lr.someone", "rc.whose"], "her"),

  // His
  P("john.survival", "Survival mode", "Zoomed in, braced, checked out. Water first, then widen.", ["survival", "survival mode", "braced", "zoomed in", "checked out", "shut down", "numb"], ["mm.mirror", "mm.landing", "mm.mentor"], "john"),
  P("john.cantStart", "Can't start", "It needs doing and you aren't moving.", ["can't start", "cant start", "stuck", "procrastinating", "putting off", "avoiding"], ["tend.smallestStep", "mm.tired", "mm.quests"], "john"),
  P("john.defensive", "Defensive after a fight", "The shield went up. Find the one percent that's true, then repair.", ["defensive", "fight", "argued", "she said", "conflict", "got defensive", "blew up"], ["mm.shield", "mm.landing", "tend.repair"], "john"),
  P("john.loop", "The loop", "Your brain won't let go of the one thing.", ["loop", "looping", "can't stop thinking", "overthinking", "ruminating", "obsessing"], ["tend.loopBreaker", "mm.mentor", "mm.horizon"], "john"),
  P("john.failed", "I failed again", "The old verdict is back. Check it against what actually happened.", ["failed", "failure", "screwed up", "messed up", "not enough", "condemned", "guilty"], ["mm.noCondemnation", "mm.seen", "mm.mentor"], "john"),
  P("john.absent", "I've been absent", "Here and not here. One way back into the room.", ["absent", "checked out", "not present", "zoned out", "distant", "gone"], ["mm.mirror", "mm.present", "keptWord.ways"], "john"),

  // Either
  P("either.heavy", "Low and heavy", "Not a crisis, just heavy. Somewhere to land, then one small true thing.", ["low", "heavy", "sad", "down", "blue", "flat", "depressed"], ["tend.anchor", "hub.talk", "tend.smallestStep"]),
  P("either.money", "Money is scaring me", "Look at it once, then put the worry down.", ["money", "broke", "bills", "can't afford", "rent", "debt", "money worries"], ["storehouse.worries", "storehouse.month", "storehouse.lifeboat"]),
  P("either.sensory", "Sensory overload", "Too loud, too bright, too much. Out of it, then a small next.", ["sensory", "too loud", "too bright", "too much", "overload", "overstimulated"], ["tend.groundMe", "tend.shutdownRecovery", "tend.smallestStep"]),
];

export const PATH_MAP: Record<string, Path> = Object.fromEntries(PATHS.map((p) => [p.key, p]));

/** Paths whose every step this person can open. */
export function availablePaths(tools: ToolEntry[], paths: Path[] = PATHS): Path[] {
  const keys = new Set(tools.map((t) => t.key));
  return paths.filter((p) => p.steps.every((s) => keys.has(s)));
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** The best path for what someone typed, if any. Same scoring spirit as searchTools. */
export function searchPaths(text: string, paths: Path[]): Path[] {
  const q = normalize(text);
  if (q.length < 2) return [];
  const words = q.split(" ").filter((w) => w.length >= 3);
  const scored = paths.map((p) => {
    let score = 0;
    for (const w of p.words) {
      const nw = normalize(w);
      if (q.includes(nw)) score += nw.includes(" ") ? 4 : 3;
      else if (words.some((qw) => nw.startsWith(qw))) score += 1;
    }
    if (normalize(p.name).includes(q)) score += 3;
    return { p, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).map((s) => s.p);
}

/** The compact list the coach reads. Only paths this person can start. */
export function coachPathList(paths: Path[], tools: ToolEntry[] = TOOL_INDEX): string {
  const name = (k: string) => tools.find((t) => t.key === k)?.name ?? k;
  return paths.map((p) => `${p.key}: ${p.name} (${p.steps.map(name).join(", then ")}). ${p.when}`).join("\n");
}

/** A path someone built themselves, kept in their hub settings. */
export interface CustomPath {
  key: string;
  name: string;
  words: string[];
  steps: string[];
}

/** Every path this person can use: the built-in ones they can open, plus their own. */
export function pathsFor(tools: ToolEntry[], custom: CustomPath[]): Path[] {
  const keys = new Set(tools.map((t) => t.key));
  const mine: Path[] = custom.filter((c) => c.steps.length > 0 && c.steps.every((s) => keys.has(s))).map((c) => ({ key: c.key, name: c.name, when: "One of your own.", words: c.words, steps: c.steps, who: "either" }));
  return [...mine, ...availablePaths(tools)];
}

/** Where someone is on a path, kept in hub settings so it follows them across devices. */
export interface PathState {
  key: string;
  /** Index of the step they're on. */
  step: number;
  startedAt: number;
}

export function readPathState(moduleSettings: Record<string, unknown> | undefined): PathState | null {
  const raw = (moduleSettings?.hub as { path?: unknown } | undefined)?.path;
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<PathState>;
  if (typeof p.key !== "string" || typeof p.step !== "number") return null;
  return { key: p.key, step: p.step, startedAt: typeof p.startedAt === "number" ? p.startedAt : 0 };
}

export function readCustomPaths(moduleSettings: Record<string, unknown> | undefined): CustomPath[] {
  const raw = (moduleSettings?.hub as { paths?: unknown } | undefined)?.paths;
  if (!Array.isArray(raw)) return [];
  return raw.filter((c): c is CustomPath => !!c && typeof c === "object" && typeof (c as CustomPath).key === "string" && typeof (c as CustomPath).name === "string" && Array.isArray((c as CustomPath).steps));
}
