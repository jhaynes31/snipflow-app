/**
 * Crisis wording detection. Pure, so the same check runs in the browser
 * (text fields show the "Need help now" card as someone types) and on the
 * server (the coach stops its normal flow before the model is called).
 *
 * It errs toward care: a false positive shows a kind card with the 988
 * number, which costs nothing. A miss costs more. Even so, everyday
 * phrases like "dying to see it" or "kill some time" stay quiet.
 */

export type CrisisLevel = "none" | "crisis";

export interface CrisisCheck {
  level: CrisisLevel;
  /** The pattern that matched, for tests and logs. Never shown to the person. */
  matched?: string;
}

/** Ordinary phrases that contain a trigger word but mean nothing serious. */
const SAFE_PHRASES = [
  /\bdying (to|for)\b/,
  /\bkill(ing|s|ed)? (some |a little |a bit of )?time\b/,
  /\bkill(ing|s|ed)? it\b/,
  /\bkilled (the|that) (workout|run|presentation|meeting|test)\b/,
  /\b(my|the) (phone|battery|laptop|car|plant|tomatoes?|basil) (is |are )?(dying|died|dead)\b/,
  /\bdead (tired|end|line|zone|battery|quiet|serious|on)\b/,
  /\bdeadline/,
  /\bkill (the|this|that) (lights?|engine|music|noise|process|app|tab|feature|idea|bug)\b/,
  /\bsuicide (prevention|hotline|lifeline)\b/,
  /\b(cutting|cut) (back|down|it out|corners|the|a|my (hair|nails|grass|lawn))\b/,
  /\bhurt(s|ing)? (my|their|his|her) (feelings|back|knee|shoulder|neck|head|foot|hand|wrist|ankle|hip)\b/,
  /\b(work|job|schedule|traffic|week|heat|weather|homework) is killing me\b/,
];

const CRISIS_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "suicide", re: /\bsuicid(e|al)\b/ },
  { name: "wantToDie", re: /\b(want|wanted|wanting|wish|wishing|ready|going|planning|plan|trying|tempted) (to )?(die|be dead|not (be alive|exist|wake up|be here anymore|be here)|disappear forever|end (it|things|my life|it all))\b/ },
  { name: "killMyself", re: /\b(kill|hurt|harm|cut|cutting|hang|shoot|poison|drown|overdose|od'?ing on|end)\w* (myself|my self)\b/ },
  { name: "wishNotWake", re: /\b(wish|hope|hoping|wishing) (i|that i|to) ?(could |would |didn'?t |don'?t |just |could just |would just )?(not wake up|never wake up|never woke up|die|was dead|were dead|be dead|wasn'?t here|weren'?t here|wasn'?t alive|didn'?t exist)\b/ },
  { name: "endMyLife", re: /\b(end|ending|take|taking) my (own )?life\b/ },
  { name: "betterOffDead", re: /\bbetter off (dead|without me|if i (was|were) (gone|dead|not here))\b/ },
  { name: "noReasonToLive", re: /\b(no|not any|nothing) (reason|point) (to|in) (live|living|go(ing)? on|keep(ing)? going|stay(ing)? alive)\b/ },
  { name: "dontWantToLive", re: /\b(don'?t|do not|can'?t|cannot) want to (live|be alive|go on|keep going|be here)\b/ },
  { name: "unalive", re: /\bunalive\b/ },
  { name: "selfHarm", re: /\bself[- ]?harm\w*\b/ },
  { name: "cutMyself", re: /\b(cut|cutting|burn|burning|hurting) (myself|my (arms?|legs?|wrists?|thighs?|skin))\b/ },
  { name: "wantToHurtMyself", re: /\b(want|urge|urges|thinking|thoughts?) (to|of|about) (hurt|harm|cut|kill)\w*\b/ },
  { name: "notSafe", re: /\b(i'?m|i am|we'?re|we are|not feeling|don'?t feel|do not feel) not safe\b/ },
  { name: "unsafe", re: /\b(i'?m|i am|i feel|feeling|we'?re|we are) unsafe\b/ },
  { name: "unsafeHere", re: /\b(not|un)safe (at home|here|right now|tonight|with (him|her|them))\b/ },
  { name: "hurtMe", re: /\b(he|she|they|someone) (is|are|was|were|will|might|could|gonna|going to) (going to |gonna )?(hurt|kill|hit|beat) (me|us|the kids|my kids)\b/ },
  { name: "afraidForLife", re: /\b(afraid|scared|fear) for my life\b/ },
  { name: "plan", re: /\b(i have|i've got|got|made|making) a plan to (die|end|kill|hurt)\b/ },
  { name: "goodbye", re: /\b(say(ing)? goodbye to everyone|wrote (a|my) (goodbye|suicide) (note|letter))\b/ },
  { name: "pills", re: /\b(took|take|taking|swallow(ed)?) (all|a bunch of|too many|a lot of|the whole bottle of) (the |my )?(pills|meds|medication|tablets)\b/ },
  { name: "everyoneBetterOff", re: /\beveryone would be (better|happier) (off )?without me\b/ },
];

function normalise(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

/** Returns "crisis" when the text suggests suicide, self-harm, or being unsafe. */
export function detectCrisis(text: string | null | undefined): CrisisCheck {
  if (!text) return { level: "none" };
  let t = normalise(text);
  if (t.trim().length < 3) return { level: "none" };
  for (const safe of SAFE_PHRASES) t = t.replace(new RegExp(safe.source, "g"), " ");
  for (const p of CRISIS_PATTERNS) {
    if (p.re.test(t)) return { level: "crisis", matched: p.name };
  }
  return { level: "none" };
}

/** True when any of several text fields reads as crisis wording. */
export function anyCrisis(texts: (string | null | undefined)[]): boolean {
  return texts.some((t) => detectCrisis(t).level === "crisis");
}

/**
 * The care response the coach gives instead of a normal reply. Fixed
 * wording, never generated, so it is the same every time and can be tested.
 */
export function crisisReply(partnerName: string | null): string {
  const partnerLine = partnerName
    ? ` There is a button below to tell ${partnerName} with one tap; they will see it at the top of their home screen right away.`
    : "";
  return (
    "I'm really glad you told me, and I'm taking it seriously. What you're carrying sounds heavy, and you don't have to carry it alone right now. " +
    "Please reach a person who can be with you in this: call or text 988 (the Suicide & Crisis Lifeline) any hour, or call 911 if you're in danger right now." +
    partnerLine +
    " I'm a support tool and I can't keep you safe on my own. If you want, I'll stay here and we can take the next few minutes one small step at a time."
  );
}

/**
 * Reassurance-loop detection. When the last few messages from the person ask
 * for the same reassurance again, the coach names it gently instead of
 * answering it again. Pure and deliberately simple: word overlap between the
 * recent questions, plus the classic phrasings.
 */
const REASSURANCE_PHRASES = [
  /\bare you sure\b/,
  /\bpromise( me)?\b/,
  /\bjust tell me\b/,
  /\btell me (again|one more time)\b/,
  /\b(really|honestly|definitely) (okay|ok|fine|alright)\b/,
  /\bdo you (really |honestly )?think\b/,
  /\b(is|are) (it|that|we|they|i) (okay|ok|fine|normal|bad|going to be okay)\b/,
  /\bwhat if\b/,
];

function words(text: string): Set<string> {
  return new Set(
    normalise(text)
      .split(" ")
      .filter((w) => w.length > 2),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

/** True when the person's recent messages look like the same reassurance being asked for again. */
export function detectReassuranceLoop(userMessages: string[]): boolean {
  const recent = userMessages.slice(-4);
  if (recent.length < 3) return false;
  const asks = recent.filter((m) => REASSURANCE_PHRASES.some((p) => p.test(normalise(m))));
  if (asks.length >= 3) return true;
  if (asks.length === 0) return false;
  const sets = recent.map(words);
  let similarPairs = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      if (overlap(sets[i], sets[j]) >= 0.6) similarPairs++;
    }
  }
  return similarPairs >= 2 || (similarPairs >= 1 && asks.length >= 2);
}
