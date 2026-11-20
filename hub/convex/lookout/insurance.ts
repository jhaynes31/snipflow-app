/**
 * The "Insurance Sales, Inbound/W-2" preset (spec update, 2026-11-20).
 *
 * John has been through Globe Life, Primerica, and other sales jobs that
 * promised support and never gave it. This preset's job is to keep those
 * out. Everything it judges by is here, in one place: the search words,
 * the green and red flags, the company blocklist, the company watchlist,
 * and the screening checklist. The words, blocklist, and watchlist are
 * editable in Settings; the flag patterns live here.
 *
 * Pure: no database, no fetching. Tested in tests/insurance.test.ts.
 */
import { negated, parsePay } from "./pure.ts";
import { boardFromUrl, type Source } from "./sources.ts";

export const INSURANCE_PRESET = "insurance";
export const INSURANCE_NAME = "Insurance Sales, Inbound/W-2";

export interface WatchEntry {
  name: string;
  /** The careers page, or any job on the company's board. */
  url: string;
  /** What to type into their search box when there's no feed to read. */
  search?: string;
  note?: string;
  enabled: boolean;
}

export interface InsuranceConfig {
  enabled: boolean;
  keywords: string[];
  blocklist: string[];
  watchlist: WatchEntry[];
  /** Show jobs from blocklisted companies in the list. Off by default. */
  showBlocked: boolean;
}

/** Search words, combined as each site allows (Settings can change them). */
export const DEFAULT_KEYWORDS = [
  "licensed inbound sales",
  "inbound insurance sales",
  "inbound life insurance agent",
  "warm transfer insurance",
  "life insurance sales agent",
  "insurance sales consultant",
  "direct sales center insurance",
  "paid training life insurance license",
];

/** Companies whose jobs are hidden by default (Settings can change this). */
export const DEFAULT_BLOCKLIST = ["Globe Life", "American Income Life", "Primerica"];

/** Employers known to hire for the right kind of job (Settings can change this). */
export const DEFAULT_WATCHLIST: WatchEntry[] = [
  { name: "Mutual of Omaha", url: "https://www.mutualofomaha.com/careers", search: "Inbound Insurance Sales Consultant", note: "Hourly plus commission; pays for the licensing exam. Applications only through their own site.", enabled: true },
  { name: "SelectQuote", url: "https://careers.selectquote.com/", search: "Sales Agent Life", note: "Base pay plus commission, paid training, license reimbursed. Mixed reviews: chargebacks, lead quality.", enabled: true },
  { name: "Ethos", url: "https://boards.greenhouse.io/ethoslife", search: "Sales", note: "W-2 hourly plus commission. Often asks for 2 to 3 years of phone sales experience. Read from their public board.", enabled: true },
  { name: "Lifequotes.com", url: "https://www.lifequotes.com/careers", search: "Agent", note: "Part time, hourly base plus bonuses, paid training. License needed on day one (reimbursed).", enabled: true },
];

export function defaultInsurance(): InsuranceConfig {
  return { enabled: false, keywords: [...DEFAULT_KEYWORDS], blocklist: [...DEFAULT_BLOCKLIST], watchlist: DEFAULT_WATCHLIST.map((w) => ({ ...w })), showBlocked: false };
}

// ---------- Flags ----------

export type Badge = "strong" | "maybe" | "avoid";
export const BADGE_LABEL: Record<Badge, string> = { strong: "Strong fit", maybe: "Maybe", avoid: "Avoid" };

interface Flag {
  tag: string;
  re: RegExp;
}
interface RedFlag extends Flag {
  /** What the flag does to the badge. */
  level: "avoid" | "maybe";
  /** The tag to give instead when the words are negated ("no cold calling"). */
  whenNegated?: string;
}

/** Signs of the right kind of job. */
export const GREEN_FLAGS: Flag[] = [
  { tag: "W-2 employee", re: /\bw-?2\b|\bemployee status\b|\bas an? (?:w-?2 )?employee\b|\bfull[\s-]time employee\b|\bemployee,? not (?:a )?contractor\b/i },
  { tag: "Hourly wage", re: /\bhourly (?:wage|pay|rate|base|compensation)\b|\bper hour\b|\ban hour\b|\/\s?(?:hour|hr)\b/i },
  { tag: "Base pay", re: /\bbase (?:pay|salary|wage|rate|compensation)\b|\bsalary (?:plus|\+|and) commission\b|\bbase (?:plus|\+|and) (?:uncapped )?commission\b|\bguaranteed (?:base|pay|wage)\b/i },
  { tag: "Inbound calls", re: /\binbound\b/i },
  { tag: "Warm transfers", re: /\bwarm transfers?\b|\bwarm leads?\b/i },
  { tag: "Leads provided", re: /\b(?:every |all |the )?leads? (?:is |are |will be )?(?:provided|supplied|given|included)\b|\b(?:provided|free|company[\s-]provided|pre[\s-]qualified|qualified|exclusive) leads\b|\bwe (?:provide|supply|generate) (?:the|all|your|high[\s-]quality)? ?leads\b|\bleads at no cost\b|\bno (?:cost|charge) for leads\b|\bnever pay for leads\b|\bno need to (?:buy|purchase) leads\b/i },
  { tag: "No cold calling", re: /\bno cold[\s-]?call(?:ing|s)?\b|\bzero cold[\s-]?call(?:ing|s)?\b|\bnot? (?:a )?cold[\s-]?calling\b|\bwithout cold[\s-]?calling\b/i },
  { tag: "Paid training", re: /\bpaid training\b|\btraining (?:is )?paid\b|\bpaid (?:licens\w+ )?(?:classes|course|program)\b/i },
  { tag: "Licensing paid", re: /\blicens\w* (?:costs?|fees?|exam|exams)?\s*(?:are |is |fully |will be )?(?:paid|reimbursed|covered|sponsored)\b|\b(?:pay|cover|reimburse|sponsor)(?:s|ed|ing)? (?:for )?(?:your |the )?(?:cost of )?(?:licens\w+|license exam)\b|\blicens\w+ reimbursement\b|\bwe (?:will )?(?:get you|help you get) licensed\b/i },
  { tag: "Benefits", re: /\b401\s?\(?k\)?\b|\bhealth (?:insurance|benefits|coverage|plan)\b|\bmedical,? dental\b|\bdental,? (?:and )?vision\b|\bpto\b|\bpaid time off\b|\bpaid vacation\b/i },
];

/** Signs of the wrong kind of job. Each sets the badge to Avoid or Maybe. */
export const RED_FLAGS: RedFlag[] = [
  { tag: "1099 or contractor", level: "avoid", re: /\b1099\b|\bindependent contractor\b|\bcontractor (?:position|role|status)\b|\bself[\s-]employed\b/i },
  { tag: "Commission only", level: "avoid", re: /\bcommission[\s-]only\b|\b100%[\s-]commission\b|\bstraight commission\b|\bno base (?:pay|salary|wage)\b|\bcommission[\s-]based (?:only|position|compensation|pay|income)\b|\bfull commission\b|\bpaid (?:on|by) commission only\b/i },
  { tag: "You pay for leads", level: "avoid", whenNegated: "Leads provided", re: /\blead costs?\b|\bcost of leads\b|\bcost per lead\b|\b(?:buy|buying|purchase|purchasing|pay for|paying for|invest in|investing in) (?:your (?:own )?|the )?leads\b|\bleads? (?:are |is )?(?:purchased|bought|paid for) by (?:you|the agent)\b/i },
  { tag: "Recruiting or team building", level: "avoid", re: /\bbuild (?:your|a) (?:own )?(?:team|agency|downline)\b|\bagency (?:builder|building|ownership|owner track)\b|\boverrides?\b|\bbecome an? (?:agency )?owner\b|\bdownline\b|\brecruit(?:ing|ment)? (?:and|&|or) (?:train|develop|build|lead)\w*\b|\brecruit(?:ing)? (?:new )?(?:agents|a team|your own team|other agents)\b|\bteam[\s-]building bonus\w*\b|\bmlm\b|\bmulti[\s-]level\b/i },
  { tag: "Warm market", level: "avoid", re: /\bfriends (?:and|&|,) family\b|\bfamily (?:and|&|,) friends\b|\bpeople you know\b|\byour (?:personal |own |existing )?network\b|\bnatural market\b|\bwarm market\b|\bmake a list\b|\bproject 100\b|\bsphere of influence\b|\bpersonal contacts\b/i },
  { tag: "Cold calling", level: "avoid", whenNegated: "No cold calling", re: /\bcold[\s-]?call(?:ing|s|er|ers)?\b|\bcold[\s-]?dial(?:ing|s)?\b|\boutbound (?:sales )?(?:calls|calling|dials|dialing|prospecting)\b|\bprospecting\b|\bsmile and dial\b|\bdials? per (?:day|hour|shift)\b|\bdoor[\s-]knock\w*\b/i },
  { tag: "Hype language", level: "maybe", re: /\bunlimited (?:income|earnings?|earning potential|commission)\b|\bbe your own boss\b|\bfinancial freedom\b|\bsix[\s-]figures?\b|\b6[\s-]figures?\b|\bfirst year (?:income|earnings) (?:of |up to )?\$?1\d\d,?\d{3}\b|\bno (?:income )?cap\b|\bsky'?s the limit\b/i },
  { tag: "Travel or door-to-door", level: "avoid", re: /\bdoor[\s-]to[\s-]door\b|\btravel (?:is )?required\b|\brequired to travel\b|\bmust be (?:willing|able) to travel\b|\bin[\s-]home (?:sales|presentations?|appointments?|visits?)\b|\bfield (?:sales|agent|underwriter|representative)\b|\bassigned territory\b|\breliable (?:transportation|vehicle)\b/i },
];

/** Large established carriers and direct-to-consumer insurers: a green flag when the employer is one. */
export const ESTABLISHED = ["Mutual of Omaha", "SelectQuote", "Ethos", "Lifequotes", "Aflac", "Allstate", "Progressive", "GEICO", "Liberty Mutual", "Nationwide", "USAA", "Humana", "UnitedHealth", "Cigna", "Aetna", "eHealth", "GoHealth", "Assurance IQ", "Lemonade", "Policygenius", "Haven Life", "MetLife", "Prudential", "Lincoln Financial", "Transamerica", "Pacific Life", "New York Life", "MassMutual", "Guardian", "Principal", "Unum", "Colonial Life", "Northwestern Mutual", "John Hancock", "Banner Life", "Protective", "Fidelity Life", "Zander", "Health IQ", "SmartFinancial", "QuoteWizard", "EverQuote"];

/** Whether a company is on the blocklist, by name or a plain part of it. */
export function isBlocked(employer: string, blocklist: string[]): string | null {
  const e = employer.toLowerCase();
  for (const b of blocklist) {
    const w = b.trim().toLowerCase();
    if (w && e.includes(w)) return b.trim();
  }
  return null;
}

/** An insurance sales title worth reading, as the preset's sites return many other sales jobs. */
export function insuranceTitleFits(title: string): boolean {
  const t = title.toLowerCase();
  if (/\b(?:manager|supervisor|director|vp|vice president|head of|team lead|recruiter|trainer|underwriter|actuar\w+|claims|adjuster|engineer|developer|analyst|marketing|account executive|account manager|business development|bdr|sdr|appointment setter|telemarket\w*)\b/.test(t)) return false;
  const insurance = /\b(?:insurance|life|medicare|health|annuit\w*|final expense|benefits?)\b/.test(t);
  const sales = /\b(?:sales|agent|producer|consultant|advisor|representative|rep|specialist|closer|enroll\w*)\b/.test(t);
  const inbound = /\binbound\b|\blicensed\b|\bwarm transfer\b/.test(t);
  return (insurance && sales) || (inbound && sales);
}

export interface Fit {
  badge: Badge;
  green: string[];
  red: string[];
  /** On the blocklist, by this name. */
  blocked: string | null;
  /** Why the badge is what it is, in a sentence. */
  why: string;
  /** For sorting: Strong first, then Maybe, then Avoid. */
  score: number | null;
}

export interface ScreeningAnswer {
  key: string;
  asked: boolean;
  /** "" until answered; "good", "bad", or "unsure". */
  answer: string;
  note: string;
}

/**
 * Read a listing for the preset's flags. Negations are honored: "no cold
 * calling" is a green flag, "never pay for leads" means leads are provided.
 * The company itself can be a flag too (established carrier, or blocked).
 */
export function fitOf(job: { title: string; employer: string; description: string }, cfg: Pick<InsuranceConfig, "blocklist">, screening: ScreeningAnswer[] = []): Fit {
  const text = `${job.title}\n${job.description}`;
  const green = new Set<string>();
  const red = new Set<string>();
  let level: "ok" | "maybe" | "avoid" = "ok";
  for (const f of RED_FLAGS) {
    const re = new RegExp(f.re.source, f.re.flags.includes("g") ? f.re.flags : `${f.re.flags}g`);
    let hit = false;
    for (const m of text.matchAll(re)) {
      if (negated(text, m.index ?? 0)) {
        if (f.whenNegated) green.add(f.whenNegated);
        continue;
      }
      hit = true;
    }
    if (hit) {
      red.add(f.tag);
      if (f.level === "avoid") level = "avoid";
      else if (level === "ok") level = "maybe";
    }
  }
  for (const f of GREEN_FLAGS) if (f.re.test(text)) green.add(f.tag);
  // "No cold calling" and "Cold calling" can't both stand; the negated form wins when the listing says it plainly.
  if (green.has("No cold calling") && red.has("Cold calling") && GREEN_FLAGS.find((g) => g.tag === "No cold calling")!.re.test(text)) {
    red.delete("Cold calling");
    if (level === "avoid" && ![...red].some((t) => RED_FLAGS.find((r) => r.tag === t)?.level === "avoid")) level = [...red].length ? "maybe" : "ok";
  }
  if (ESTABLISHED.some((n) => job.employer.toLowerCase().includes(n.toLowerCase()))) green.add("Established carrier");
  const blocked = isBlocked(job.employer, cfg.blocklist);

  // The screening answers John writes down during interviews override what the listing said.
  const bad = screeningAvoid(screening);
  for (const b of bad) red.add(b);
  if (bad.length) level = "avoid";

  const pay = ["W-2 employee", "Hourly wage", "Base pay"].some((t) => green.has(t));
  const support = ["Inbound calls", "Warm transfers", "Leads provided", "No cold calling", "Paid training"].some((t) => green.has(t));
  let badge: Badge;
  let why: string;
  if (level === "avoid") {
    badge = "avoid";
    why = `Avoid: ${[...red].join(", ").toLowerCase()}.`;
  } else if (level === "maybe") {
    badge = "maybe";
    why = `Maybe: ${[...red].join(", ").toLowerCase()}; read it closely.`;
  } else if (pay && support) {
    badge = "strong";
    why = `Strong fit: ${[...green].join(", ").toLowerCase()}.`;
  } else {
    badge = "maybe";
    why = pay ? "Maybe: pay looks stable, but the listing doesn't say the calls are inbound or the leads are provided. Ask." : support ? "Maybe: inbound or provided leads, but the listing doesn't say W-2, hourly, or base pay. Ask." : "Maybe: the listing doesn't say enough about pay, calls, or leads. Ask.";
  }
  const score = badge === "avoid" ? null : badge === "strong" ? Math.min(100, 80 + green.size * 2) : Math.min(79, 50 + green.size * 3 - red.size * 5);
  return { badge, green: [...green], red: [...red], blocked, why, score };
}

// ---------- Screening checklist ----------

export interface ScreeningQuestion {
  key: string;
  question: string;
  /** The answer that keeps the job; the one that ends it. Free text when absent. */
  good?: string;
  bad?: string;
  /** A bad answer here marks the job Avoid on its own. */
  critical: boolean;
  /** The tag shown when the answer is bad. */
  tag?: string;
}

export const SCREENING: ScreeningQuestion[] = [
  { key: "w2", question: "Is this W-2 or 1099?", good: "W-2", bad: "1099", critical: true, tag: "Screening: it's 1099" },
  { key: "hourly", question: "Is there an hourly wage, and does it continue after training?", good: "Yes, and it continues", bad: "No, or it stops after training", critical: false },
  { key: "leads", question: "Who pays for the leads?", good: "The company", bad: "The agent", critical: true, tag: "Screening: agents pay for leads" },
  { key: "recruit", question: "Will I be asked to recruit, or to make a list of people I know?", good: "No", bad: "Yes", critical: true, tag: "Screening: recruiting or warm market expected" },
  { key: "training", question: "What does training look like week by week, and who do I go to when I'm stuck?", critical: false },
  { key: "retention", question: "What share of agents in the last hiring class are still there after six months?", critical: false },
];

/** The tags for screening answers that end a job on their own. */
export function screeningAvoid(answers: ScreeningAnswer[]): string[] {
  const out: string[] = [];
  for (const q of SCREENING) {
    if (!q.critical) continue;
    const a = answers.find((x) => x.key === q.key);
    if (a && a.answer === "bad") out.push(q.tag ?? `Screening: ${q.question}`);
  }
  return out;
}

/** A clean, bounded set of answers to store. */
export function cleanScreening(answers: ScreeningAnswer[]): ScreeningAnswer[] {
  return SCREENING.map((q) => {
    const a = answers.find((x) => x.key === q.key);
    return { key: q.key, asked: !!a?.asked, answer: a && ["good", "bad", "unsure"].includes(a.answer) ? a.answer : "", note: (a?.note ?? "").trim().slice(0, 2000) };
  });
}

// ---------- Sources ----------

/** Pay as the listing states it, labeled with the day it was read, never treated as permanent. */
export function payAsListed(description: string, discoveredAt: number): string | null {
  const p = parsePay(description);
  if (!p) return null;
  const day = new Date(discoveredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${p.quote.trim()} (as listed on ${day})`;
}

/**
 * Where the preset looks, built from its words each search so a change in
 * Settings takes effect at once: the remote boards' search, the key-based
 * sites when their keys are in, and any watchlist company whose careers
 * page is on a board the Lookout can read.
 */
export function insuranceSources(cfg: Pick<InsuranceConfig, "keywords" | "watchlist">): Source[] {
  const preset = INSURANCE_PRESET;
  const words = cfg.keywords.map((k) => k.replace(/["']/g, "").trim()).filter(Boolean).slice(0, 12);
  const out: Source[] = [
    { kind: "remotive", token: "search:insurance sales", name: "Remotive: insurance sales", enabled: true, preset },
    { kind: "remotive", token: "search:inbound sales", name: "Remotive: inbound sales", enabled: true, preset },
    { kind: "remotive", token: "search:licensed insurance", name: "Remotive: licensed insurance", enabled: true, preset },
    { kind: "himalayas", token: "insurance sales", name: "Himalayas: insurance sales", enabled: true, preset },
    { kind: "himalayas", token: "inbound sales agent", name: "Himalayas: inbound sales agent", enabled: true, preset },
    { kind: "himalayas", token: "life insurance agent", name: "Himalayas: life insurance agent", enabled: true, preset },
    { kind: "jobicy", token: "insurance", name: "Jobicy: insurance", enabled: true, preset },
    { kind: "themuse", token: "Sales", name: "The Muse: sales, remote", enabled: true, preset },
    ...words.map((w) => ({ kind: "adzuna" as const, token: w, name: `Adzuna: ${w}`, enabled: true, preset })),
    ...words.slice(0, 6).map((w) => ({ kind: "jooble" as const, token: w, name: `Jooble: ${w}`, enabled: true, preset })),
  ];
  for (const w of cfg.watchlist) {
    if (!w.enabled) continue;
    const b = boardFromUrl(w.url);
    if (b) out.push({ kind: b.kind, token: b.token, name: w.name, enabled: true, preset });
  }
  return out;
}

/** The one source for a watchlist entry, when its careers page is on a readable board. */
export function watchSource(w: WatchEntry): Source | null {
  const b = boardFromUrl(w.url);
  return b ? { kind: b.kind, token: b.token, name: w.name, enabled: true, preset: INSURANCE_PRESET } : null;
}

export function cleanConfig(c: Partial<InsuranceConfig>, current: InsuranceConfig): InsuranceConfig {
  const list = (xs: string[] | undefined, fallback: string[], max: number, len: number) => (xs ? xs.map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, max) : fallback);
  return {
    enabled: c.enabled ?? current.enabled,
    keywords: list(c.keywords, current.keywords, 30, 80),
    blocklist: list(c.blocklist, current.blocklist, 60, 80),
    watchlist: (c.watchlist ?? current.watchlist).map((w) => ({ name: w.name.trim().slice(0, 80), url: w.url.trim().slice(0, 500), search: w.search?.trim().slice(0, 120) || undefined, note: w.note?.trim().slice(0, 400) || undefined, enabled: !!w.enabled })).filter((w) => w.name && /^https?:\/\//i.test(w.url)).slice(0, 40),
    showBlocked: c.showBlocked ?? current.showBlocked,
  };
}
