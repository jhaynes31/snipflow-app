/**
 * The Lookout's pure engine: the facts a job is judged on, the hard filters
 * that reject a job outright, the weighted ranking for jobs that pass, and
 * the listing scanner that reads a posting for warning signs. No database,
 * no network, so every rule here is unit-tested (tests/lookout.test.ts).
 *
 * Three rules hold everywhere:
 * 1. A failed mandatory requirement always rejects. No score overrides it.
 * 2. An unknown mandatory fact never passes. It sends the job to "check this".
 * 3. A fact is labeled with where it came from. Only a person marks "verified".
 */

// ---------- Facts ----------

/** Where a fact came from. Only "verified" is a person's confirmation. */
export type FactSource = "none" | "listing" | "ai" | "verified";
export type YesNo = "yes" | "no" | "unknown";

export interface Fact {
  state: YesNo;
  /** A number or short value when the fact has one (pay, hours, schedule kind). */
  value?: string;
  source: FactSource;
  /** The words in the listing, or what the person was told and by whom. */
  note?: string;
}

export const FACT_KEYS = [
  "remote",
  "wvEligible",
  "travelOk",
  "international",
  "noOffice",
  "payGuaranteed",
  "payMin",
  "payMax",
  "payUnit",
  "commissionOnly",
  "hours",
  "reducedHoursOk",
  "employment",
  "benefits",
  "coldCalling",
  "salesQuota",
  "phoneHeavy",
  "meetingsFrequent",
  "realtimeConstant",
  "interaction",
  "schedule",
  "weekendsOrOnCall",
  "legitimate",
  "open",
] as const;
export type FactKey = (typeof FACT_KEYS)[number];
export type Facts = Partial<Record<FactKey, Fact>>;

export const FACT_LABEL: Record<FactKey, string> = {
  remote: "Fully remote",
  wvEligible: "Hires people who live in West Virginia",
  travelOk: "Can work from other US states while traveling",
  international: "Can work from outside the US (a bonus)",
  noOffice: "No office days, no relocation",
  payGuaranteed: "Pay is a guaranteed base wage",
  payMin: "Guaranteed pay, low end",
  payMax: "Guaranteed pay, high end",
  payUnit: "Pay is quoted per",
  commissionOnly: "Commission only",
  hours: "Hours per week",
  reducedHoursOk: "Employer confirmed 35 hours or fewer is fine",
  employment: "Employee (W2) or contractor (1099)",
  benefits: "Benefits",
  coldCalling: "Cold calling",
  salesQuota: "Sales quotas, upselling, or lead targets",
  phoneHeavy: "Substantial phone work",
  meetingsFrequent: "Frequent scheduled video meetings",
  realtimeConstant: "Constant real time customer contact",
  interaction: "How much direct customer contact",
  schedule: "Schedule",
  weekendsOrOnCall: "Weekends, on call, or mandatory overtime",
  legitimate: "Employer checked out as real",
  open: "Vacancy still open",
};

/** The facts a job cannot be approved without. An unknown here means "check this". */
export const CRITICAL: FactKey[] = ["remote", "wvEligible", "travelOk", "noOffice", "payGuaranteed", "payMin", "commissionOnly", "hours", "coldCalling", "salesQuota", "phoneHeavy", "meetingsFrequent", "realtimeConstant", "legitimate"];

export const SCHEDULE_KINDS = ["async", "early", "predictable", "shifts", "unknown"] as const;
export type ScheduleKind = (typeof SCHEDULE_KINDS)[number];
export const SCHEDULE_LABEL: Record<ScheduleKind, string> = {
  async: "Flexible and asynchronous: he picks when, deadlines are met",
  early: "Predictable early day, around 6:00 AM to 2:30 PM",
  predictable: "Another predictable schedule",
  shifts: "Assigned or rotating shifts",
  unknown: "Not stated",
};

export const INTERACTION_KINDS = ["none", "written", "some", "constant", "unknown"] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];
export const INTERACTION_LABEL: Record<InteractionKind, string> = {
  none: "Back office: little or no customer contact",
  written: "Email and tickets, few calls or meetings",
  some: "Some calls, chat, or meetings",
  constant: "Constant live calls or chat",
  unknown: "Not stated",
};

export function fact(facts: Facts, key: FactKey): Fact {
  return facts[key] ?? { state: "unknown", source: "none" };
}

/**
 * Merge new facts into old ones. A verified fact is never overwritten by a
 * guess, and a guess never replaces a better-sourced one of the same kind.
 */
const RANK: Record<FactSource, number> = { none: 0, ai: 1, listing: 2, verified: 3 };
export function mergeFacts(old: Facts, incoming: Facts): Facts {
  const out: Facts = { ...old };
  for (const key of FACT_KEYS) {
    const next = incoming[key];
    if (!next) continue;
    const prev = out[key];
    if (prev?.source === "verified" && next.source !== "verified") continue;
    if (prev && prev.state !== "unknown" && (next.state === "unknown" || RANK[next.source] < RANK[prev.source])) continue;
    out[key] = next;
  }
  return out;
}

// ---------- Requirements (the person's own, editable) ----------

export interface Requirements {
  /** Lowest guaranteed base pay, dollars per hour. */
  minHourly: number;
  /** Most hours a week, including any required overtime. */
  maxHours: number;
  homeState: string;
}

export const DEFAULT_REQUIREMENTS: Requirements = { minHourly: 25, maxHours: 35, homeState: "West Virginia" };

export interface Weights {
  schedule: number;
  interaction: number;
  location: number;
  pay: number;
  independent: number;
  skills: number;
}

/** The plan's starting weights, as percentages. Settings can change them. */
export const DEFAULT_WEIGHTS: Weights = { schedule: 20, interaction: 20, location: 20, pay: 15, independent: 15, skills: 10 };

export const WEIGHT_LABEL: Record<keyof Weights, string> = {
  schedule: "Schedule flexibility",
  interaction: "Little direct customer contact",
  location: "Works from anywhere in the US",
  pay: "Guaranteed pay and benefits",
  independent: "Independent, written, low-interruption work",
  skills: "Fits his skills and experience",
};

// ---------- Pay ----------

const WEEKS = 52;

/**
 * Guaranteed dollars per hour. Annual salary is divided by the stated weekly
 * hours; without stated hours it can't be known, because a salary that
 * clears the bar at 35 hours may not at 45.
 */
export function hourlyOf(facts: Facts): number | null {
  const min = Number(fact(facts, "payMin").value);
  if (!Number.isFinite(min) || min <= 0) return null;
  const unit = fact(facts, "payUnit").value ?? "hour";
  if (unit === "hour") return min;
  const hours = Number(fact(facts, "hours").value);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  if (unit === "year") return min / (WEEKS * hours);
  if (unit === "month") return (min * 12) / (WEEKS * hours);
  if (unit === "week") return min / hours;
  return null;
}

/**
 * A contractor pays both halves of Social Security and Medicare (an extra
 * 7.65%) and gets no paid time off. This is the employee-equivalent rate,
 * an estimate for comparison only.
 */
export function contractorEquivalent(hourly: number): number {
  return Math.round(hourly * (1 - 0.0765) * 100) / 100;
}

export function money(n: number): string {
  return n >= 1000 ? `$${Math.round(n).toLocaleString("en-US")}` : `$${n.toFixed(2).replace(/\.00$/, "")}`;
}

// ---------- Hard filters ----------

export type CheckResult = "pass" | "fail" | "unknown";
export interface Check {
  key: string;
  label: string;
  result: CheckResult;
  why: string;
}

export type Verdict = "rejected" | "check" | "eligible";

function yes(f: Fact) {
  return f.state === "yes";
}
function no(f: Fact) {
  return f.state === "no";
}
function sourceNote(f: Fact): string {
  if (f.source === "verified") return " (verified)";
  if (f.source === "listing") return " (from the listing, not yet verified)";
  if (f.source === "ai") return " (read from the listing by the assistant, not yet verified)";
  return "";
}

/**
 * The mandatory requirements, in the plan's order. Each comes back pass,
 * fail, or unknown with a plain reason.
 */
export function hardChecks(facts: Facts, req: Requirements = DEFAULT_REQUIREMENTS): Check[] {
  const checks: Check[] = [];
  const add = (key: string, label: string, result: CheckResult, why: string) => checks.push({ key, label, result, why });

  const remote = fact(facts, "remote");
  const wv = fact(facts, "wvEligible");
  if (no(remote)) add("remoteWv", `Remote from ${req.homeState}`, "fail", `The job isn't fully remote${sourceNote(remote)}.`);
  else if (no(wv)) add("remoteWv", `Remote from ${req.homeState}`, "fail", `The employer doesn't hire in ${req.homeState}${sourceNote(wv)}.`);
  else if (yes(remote) && yes(wv)) add("remoteWv", `Remote from ${req.homeState}`, "pass", `Remote, and ${req.homeState} is allowed${sourceNote(wv)}.`);
  else add("remoteWv", `Remote from ${req.homeState}`, "unknown", `Not yet known whether someone living in ${req.homeState} can take it.`);

  const travel = fact(facts, "travelOk");
  if (no(travel)) add("travel", "Works while traveling in the US", "fail", `He would have to work from one place${sourceNote(travel)}.`);
  else if (yes(travel)) add("travel", "Works while traveling in the US", "pass", `Working from other states is allowed${sourceNote(travel)}.`);
  else add("travel", "Works while traveling in the US", "unknown", "Remote doesn't always mean he can work from another state. Ask about working while traveling.");

  const guaranteed = fact(facts, "payGuaranteed");
  const commission = fact(facts, "commissionOnly");
  const hourly = hourlyOf(facts);
  if (yes(commission) || no(guaranteed)) add("pay", `At least ${money(req.minHourly)} an hour guaranteed`, "fail", "There is no guaranteed base pay.");
  else if (hourly !== null && hourly < req.minHourly) add("pay", `At least ${money(req.minHourly)} an hour guaranteed`, "fail", `The guaranteed pay works out to ${money(hourly)} an hour${sourceNote(fact(facts, "payMin"))}.`);
  else if (hourly !== null && yes(guaranteed)) add("pay", `At least ${money(req.minHourly)} an hour guaranteed`, "pass", `Guaranteed pay works out to ${money(hourly)} an hour or more${sourceNote(fact(facts, "payMin"))}.`);
  else add("pay", `At least ${money(req.minHourly)} an hour guaranteed`, "unknown", hourly === null ? "The guaranteed base pay isn't stated in a way that can be checked." : "The pay is stated, but not yet whether it is guaranteed rather than earning potential.");

  const hoursFact = fact(facts, "hours");
  const hours = Number(hoursFact.value);
  const reduced = fact(facts, "reducedHoursOk");
  if (Number.isFinite(hours) && hours > req.maxHours && !yes(reduced)) add("hours", `${req.maxHours} hours a week or fewer`, "fail", `It asks for ${hours} hours a week${sourceNote(hoursFact)}.`);
  else if (Number.isFinite(hours) && hours > 0) add("hours", `${req.maxHours} hours a week or fewer`, "pass", hours > req.maxHours ? `Listed at ${hours}, but the employer confirmed a reduced schedule${sourceNote(reduced)}.` : `${hours} hours a week${sourceNote(hoursFact)}.`);
  else add("hours", `${req.maxHours} hours a week or fewer`, "unknown", "Weekly hours aren't stated.");

  if (yes(commission)) add("commission", "Not commission only", "fail", `Commission only${sourceNote(commission)}.`);
  else if (no(commission) || yes(guaranteed)) add("commission", "Not commission only", "pass", "There is a base wage.");
  else add("commission", "Not commission only", "unknown", "Not yet known whether there is a base wage.");

  const cold = fact(facts, "coldCalling");
  add("coldCalling", "No cold calling", yes(cold) ? "fail" : no(cold) ? "pass" : "unknown", yes(cold) ? `It involves cold calling or outbound prospecting${sourceNote(cold)}.` : no(cold) ? "No cold calling." : "Not yet known whether it involves outbound calls.");

  const office = fact(facts, "noOffice");
  add("office", "No office days or relocation", no(office) ? "fail" : yes(office) ? "pass" : "unknown", no(office) ? `It needs office time or a move${sourceNote(office)}.` : yes(office) ? "No office or relocation." : "Not yet known whether there are office days or travel to a site.");

  const bad: string[] = [];
  const unknown: string[] = [];
  for (const k of ["salesQuota", "phoneHeavy", "meetingsFrequent", "realtimeConstant"] as const) {
    const f = fact(facts, k);
    if (yes(f)) bad.push(FACT_LABEL[k].toLowerCase());
    else if (f.state === "unknown") unknown.push(FACT_LABEL[k].toLowerCase());
  }
  const weekends = fact(facts, "weekendsOrOnCall");
  if (bad.length) add("interaction", "Acceptable contact and schedule", "fail", `It includes ${bad.join(", ")}.`);
  else if (unknown.length) add("interaction", "Acceptable contact and schedule", "unknown", `Still to find out: ${unknown.join(", ")}.`);
  else add("interaction", "Acceptable contact and schedule", "pass", yes(weekends) ? "Contact is acceptable; note it includes weekends, on call, or overtime." : "Customer contact and meetings look acceptable.");

  const legit = fact(facts, "legitimate");
  add("legitimate", "A real employer and a real vacancy", no(legit) ? "fail" : yes(legit) ? "pass" : "unknown", no(legit) ? "This looks like a scam or a misleading listing." : yes(legit) ? `The employer checked out${sourceNote(legit)}.` : "Not yet checked that the employer and the listing are real.");

  const open = fact(facts, "open");
  if (no(open)) add("open", "Still open", "fail", "The listing has closed.");

  return checks;
}

export function verdictOf(checks: Check[]): Verdict {
  if (checks.some((c) => c.result === "fail")) return "rejected";
  if (checks.some((c) => c.result === "unknown")) return "check";
  return "eligible";
}

// ---------- Ranking ----------

export interface Ranked {
  verdict: Verdict;
  checks: Check[];
  /** 0 to 100. Present only when the job isn't rejected; a score never rescues a failed requirement. */
  score: number | null;
  parts: { key: keyof Weights; label: string; value: number; weight: number }[];
  strengths: string[];
  gaps: string[];
  uncertain: string[];
}

function scheduleScore(facts: Facts): number {
  const kind = (fact(facts, "schedule").value ?? "unknown") as ScheduleKind;
  const base = { async: 1, early: 0.85, predictable: 0.6, shifts: 0.25, unknown: 0.4 }[kind] ?? 0.4;
  return Math.max(0, base - (yes(fact(facts, "weekendsOrOnCall")) ? 0.25 : 0));
}

function interactionScore(facts: Facts): number {
  const kind = (fact(facts, "interaction").value ?? "unknown") as InteractionKind;
  return { none: 1, written: 0.75, some: 0.35, constant: 0, unknown: 0.4 }[kind] ?? 0.4;
}

function locationScore(facts: Facts): number {
  const travel = fact(facts, "travelOk");
  let s = yes(travel) ? 0.8 : travel.state === "unknown" ? 0.35 : 0;
  if (yes(fact(facts, "international"))) s += 0.2;
  return Math.min(1, s);
}

function payScore(facts: Facts, req: Requirements): number {
  const h = hourlyOf(facts);
  if (h === null) return 0.3;
  const effective = fact(facts, "employment").value === "contractor" ? contractorEquivalent(h) : h;
  // At the minimum: 0.4. At the minimum plus $15: 1.
  let s = 0.4 + Math.max(0, Math.min(1, (effective - req.minHourly) / 15)) * 0.6;
  if (yes(fact(facts, "benefits"))) s = Math.min(1, s + 0.1);
  return Math.max(0, Math.min(1, s));
}

/**
 * Words that tend to mean independent, focused, written work. Evidence only:
 * the Lookout reports what it found and never labels an employer
 * "neurodivergent friendly" on its own.
 */
export const SUPPORT_SIGNALS: { label: string; re: RegExp }[] = [
  { label: "Asynchronous communication", re: /\basync(?:hronous)?\b/i },
  { label: "Written communication valued", re: /\bwritten communication\b|\bwrite (?:clearly|well)\b|\bdocumentation\b/i },
  { label: "Documented processes", re: /\b(?:documented|standard operating) (?:process|procedure)s?\b|\bSOPs?\b|\bplaybooks?\b|\bknowledge base\b/i },
  { label: "Few meetings", re: /\b(?:few|minimal|limited|light) meetings\b|\bmeeting[\s-]?light\b|\bno daily stand[\s-]?ups?\b/i },
  { label: "Autonomy over how work is done", re: /\bautonom(?:y|ous)\b|\bindependent(?:ly)?\b|\bself[\s-]?directed\b|\bmanage your own (?:time|schedule)\b/i },
  { label: "Measured by results", re: /\bresults[\s-]?(?:oriented|based|driven)? (?:culture|environment|work)\b|\boutcomes? over (?:hours|presence)\b|\bnot (?:about )?hours (?:online|logged)\b/i },
  { label: "Focus time protected", re: /\bdeep work\b|\bfocus(?:ed)? time\b|\bfew interruptions\b/i },
  { label: "Accommodations offered", re: /\breasonable accommodations?\b|\baccommodations? (?:are )?available\b|\bneurodivers/i },
  { label: "Clear priorities and deadlines", re: /\bclear (?:expectations|priorities|goals|deadlines)\b/i },
];

export function supportSignals(text: string): string[] {
  return SUPPORT_SIGNALS.filter((s) => s.re.test(text)).map((s) => s.label);
}

const STOP = new Set("a an and are as at be by for from has have in is it of on or our that the their this to we will with you your who what when where which work job role team".split(" "));
export function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9+#\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
}

/** Share of the job's skill words that appear somewhere in his verified profile. */
export function skillsScore(jobText: string, profileText: string, skillWords: string[]): number {
  if (!profileText.trim()) return 0.3;
  const mine = tokens(profileText);
  const wanted = skillWords.filter((w) => jobText.toLowerCase().includes(w.toLowerCase()));
  if (wanted.length === 0) return 0.5;
  const have = wanted.filter((w) => w.toLowerCase().split(/\s+/).every((p) => mine.has(p)));
  return Math.max(0.1, have.length / wanted.length);
}

/** Skill words the matcher looks for in a listing. Matched only against what he has confirmed. */
export const SKILL_WORDS = ["zendesk", "salesforce", "hubspot", "freshdesk", "servicenow", "jira", "intercom", "gorgias", "excel", "google sheets", "data entry", "order processing", "order management", "quality assurance", "documentation", "knowledge base", "ticketing", "email support", "claims", "billing", "invoicing", "records", "scheduling", "crm", "returns", "refunds", "escalations", "complaints", "process improvement", "onboarding", "content moderation", "verification", "shopify", "quickbooks", "typing"];

export function rank(facts: Facts, opts: { req?: Requirements; weights?: Weights; jobText?: string; profileText?: string } = {}): Ranked {
  const req = opts.req ?? DEFAULT_REQUIREMENTS;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const checks = hardChecks(facts, req);
  const verdict = verdictOf(checks);
  const jobText = opts.jobText ?? "";
  const signals = supportSignals(jobText);
  const parts = [
    { key: "schedule" as const, value: scheduleScore(facts) },
    { key: "interaction" as const, value: interactionScore(facts) },
    { key: "location" as const, value: locationScore(facts) },
    { key: "pay" as const, value: payScore(facts, req) },
    { key: "independent" as const, value: Math.min(1, signals.length / 4) },
    { key: "skills" as const, value: skillsScore(jobText, opts.profileText ?? "", SKILL_WORDS) },
  ].map((p) => ({ ...p, label: WEIGHT_LABEL[p.key], weight: Math.max(0, weights[p.key]) }));
  const total = parts.reduce((s, p) => s + p.weight, 0) || 1;
  const score = verdict === "rejected" ? null : Math.round((parts.reduce((s, p) => s + p.value * p.weight, 0) / total) * 100);

  const strengths: string[] = [];
  const gaps: string[] = [];
  const uncertain = checks.filter((c) => c.result === "unknown").map((c) => c.why);
  const sched = (fact(facts, "schedule").value ?? "unknown") as ScheduleKind;
  if (sched === "async") strengths.push("He chooses when to work.");
  if (sched === "early") strengths.push("A predictable early day.");
  if (sched === "shifts") gaps.push("Assigned or rotating shifts.");
  const inter = (fact(facts, "interaction").value ?? "unknown") as InteractionKind;
  if (inter === "none") strengths.push("Back office work with little customer contact.");
  if (inter === "written") strengths.push("Written support: email and tickets.");
  if (inter === "some") gaps.push("Some calls, chat, or meetings.");
  if (yes(fact(facts, "international"))) strengths.push("Can also work from outside the US.");
  const h = hourlyOf(facts);
  if (h !== null && h >= req.minHourly + 5) strengths.push(`Pays ${money(h)} an hour or more, guaranteed.`);
  if (fact(facts, "employment").value === "contractor") gaps.push(`Contractor (1099): no benefits or paid time off, and he pays the extra 7.65% in payroll taxes${h !== null ? `, so ${money(h)} is like ${money(contractorEquivalent(h))} as an employee` : ""}.`);
  if (yes(fact(facts, "weekendsOrOnCall"))) gaps.push("Includes weekends, on call, or overtime.");
  for (const s of signals) strengths.push(`Listing mentions: ${s.toLowerCase()}.`);
  const skills = parts.find((p) => p.key === "skills")!.value;
  if (skills < 0.5 && opts.profileText) gaps.push("Some tools or skills in the listing aren't in his confirmed profile yet.");
  return { verdict, checks, score, parts, strengths, gaps, uncertain };
}

// ---------- The listing scanner ----------

export interface Finding {
  key: FactKey | "scam" | "misleading";
  fact?: Fact;
  quote: string;
  /** A plain warning to show, for flags. */
  warning?: string;
}

const US_STATES = ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"];

function quoteAround(text: string, index: number, length: number): string {
  const start = Math.max(0, text.lastIndexOf(".", index) + 1, index - 90);
  const endDot = text.indexOf(".", index + length);
  const end = Math.min(text.length, endDot === -1 ? index + length + 90 : Math.min(endDot + 1, index + length + 90));
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function first(text: string, re: RegExp): { index: number; length: number } | null {
  const m = re.exec(text);
  return m ? { index: m.index, length: m[0].length } : null;
}

const RULES: { key: FactKey; state: YesNo; value?: string; re: RegExp }[] = [
  { key: "coldCalling", state: "yes", re: /\bcold[\s-]?call|\boutbound (?:sales )?(?:calls|calling|dials)\b|\bprospecting\b|\bdials? per day\b|\bsmile and dial\b/i },
  { key: "salesQuota", state: "yes", re: /\bquotas?\b|\bupsell|\bcross[\s-]?sell|\bclose deals\b|\bclosing (?:deals|sales)\b|\blead generation\b|\bgenerate leads\b|\bbusiness development\b|\bbook of business\b|\b(?:revenue|sales|retention|conversion) targets?\b|\bon[\s-]target earnings\b|\bOTE\b|\bhit (?:your|monthly) numbers\b|\bsave (?:the )?(?:account|customer)s? from cancel/i },
  { key: "commissionOnly", state: "yes", re: /\bcommission[\s-]only\b|\b100% commission\b|\bstraight commission\b|\bunlimited earning potential\b|\bno base (?:pay|salary)\b/i },
  { key: "phoneHeavy", state: "yes", re: /\binbound calls?\b|\bphone support\b|\bcall cent(?:er|re)\b|\banswer(?:ing)? (?:incoming )?(?:phone )?calls\b|\b\d{2,3}\+? calls (?:per|a) (?:day|shift)\b|\bheadset\b|\bphone[\s-]based\b/i },
  { key: "meetingsFrequent", state: "yes", re: /\bdaily (?:stand[\s-]?ups?|video (?:calls|meetings)|huddles?)\b|\bcamera (?:must be |always )?on\b|\bclient[\s-]facing meetings\b|\bfrequent (?:video )?meetings\b|\bback[\s-]to[\s-]back meetings\b/i },
  { key: "realtimeConstant", state: "yes", re: /\blive chat\b.*\b(?:queue|concurrent)|\bconcurrent chats\b|\bhandle \d+ chats\b|\breal[\s-]time (?:customer )?(?:support|queue|contact)\b|\badherence to (?:schedule|queue)\b/i },
  { key: "remote", state: "no", re: /\bhybrid\b|\bon[\s-]?site\b|\bin[\s-]office\b|\bin the office \d|\bcommut/i },
  { key: "noOffice", state: "no", re: /\bhybrid\b|\bon[\s-]?site\b|\bin[\s-]office\b|\bmust relocate\b|\brelocation (?:is )?required\b|\bquarterly (?:in[\s-]person|onsite)\b|\boffice \d days\b/i },
  { key: "remote", state: "yes", re: /\b(?:fully|100%|completely) remote\b|\bremote[\s-]first\b|\bwork from (?:home|anywhere)\b/i },
  { key: "travelOk", state: "yes", re: /\b(?:work|live) (?:from )?anywhere in the (?:US|U\.S\.|United States)\b|\bwork from any (?:US )?state\b|\btravel(?:ing)? while working\b|\bwork while traveling\b|\bdigital nomad/i },
  { key: "travelOk", state: "no", re: /\bmust (?:work|reside|live) (?:from|in|at) (?:your|the|a|one) (?:home|primary residence|registered address|approved location)\b|\bwork only from (?:your|the) (?:home|registered) address\b|\bdedicated home office (?:at|in) your (?:home|residence) (?:only|at all times)\b|\bno working from (?:public|other) (?:places|locations)\b/i },
  { key: "international", state: "yes", re: /\bwork from anywhere in the world\b|\bglobally remote\b|\bremote \(?(?:worldwide|global|anywhere)\)?/i },
  { key: "weekendsOrOnCall", state: "yes", re: /\bweekends? (?:required|availability|shifts)\b|\bmust be available (?:on )?weekends\b|\bon[\s-]call\b|\bmandatory overtime\b|\bovertime (?:as needed|required)\b|\brotating shifts?\b|\bholidays? required\b/i },
  { key: "employment", state: "yes", value: "contractor", re: /\b1099\b|\bindependent contractor\b|\bcontract(?:or)? position\b|\bfreelance\b/i },
  { key: "employment", state: "yes", value: "employee", re: /\bW[\s-]?2\b|\bfull[\s-]time employee\b|\bpart[\s-]time employee\b/i },
  { key: "benefits", state: "yes", re: /\b(?:health|medical|dental|vision) insurance\b|\b401\(?k\)?\b|\bpaid time off\b|\bPTO\b|\bbenefits package\b/i },
];

const SCAM: { re: RegExp; warning: string }[] = [
  { re: /\bgift cards?\b/i, warning: "Mentions gift cards. Real employers never ask for gift cards." },
  { re: /\b(?:pay|purchase|buy) (?:for )?(?:your own )?(?:training|starter kit|equipment|software|background check)\b.*\b(?:reimburs|refund)|\b(?:training|registration|application|starter kit) fee\b/i, warning: "Asks for money up front for training, equipment, or fees." },
  { re: /\b(?:deposit|cash) (?:a |the |our )?check\b|\b(?:send|mail) you a check\b|\bcheck\b[^.]{0,60}\b(?:buy|purchase) (?:your |the )?equipment\b/i, warning: "Talks about depositing a check to buy equipment, a common fake check scam." },
  { re: /\b(?:bank|online banking) (?:login|password|credentials)\b|\bbank account (?:login|password)\b/i, warning: "Asks for banking logins. No employer needs these." },
  { re: /\binterview (?:via|over|on|through) (?:telegram|whatsapp|signal|google hangouts|teams chat|text)\b|\b(?:telegram|whatsapp)\b/i, warning: "Interviews over a chat app like Telegram or WhatsApp are a common scam sign." },
  { re: /\bno (?:interview|experience) (?:needed|required)\b.*\$\d{2,}|\bhired (?:on the spot|immediately) without (?:an )?interview\b/i, warning: "Promises a job without an interview at high pay." },
  { re: /\b(?:social security number|SSN)\b.*\b(?:before|to apply|in the application)\b/i, warning: "Asks for a Social Security number before an offer." },
  { re: /\breshipping\b|\bpackage (?:forwarding|inspector)\b|\bpayment processing agent\b|\btransfer funds\b/i, warning: "Describes reshipping or moving money, which are common fronts for fraud." },
  { re: /\bearn \$\d{3,}[\s,]*(?:a|per) (?:day|week) (?:from home|working)\b/i, warning: "Big earnings promises with little detail." },
];

const MISLEADING: { re: RegExp; warning: string }[] = [
  { re: /\bcustomer (?:service|success|care|support)\b[\s\S]*\b(?:upsell|quota|sales targets?|commission)\b/i, warning: "Called customer service, but the duties include sales targets or commission." },
  { re: /\bearning potential\b|\bup to \$\d/i, warning: "Quotes earning potential. That isn't guaranteed pay." },
];

/** Dollar amounts with what they are per. Returns the lowest guaranteed figure stated. */
export function parsePay(text: string): { min: number; max?: number; unit: "hour" | "year" | "month" | "week"; quote: string } | null {
  const range = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\s*(?:-|–|—|to)\s*\$?\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\s*(?:(?:\/|per|an?|USD)\s*)*(hour|hr|year|yr|annually|annual|month|mo|week|wk)?/i;
  const single = /\$\s?(\d[\d,]*(?:\.\d{1,2})?)\s*(k)?\s*(?:(?:\/|per|an?|USD)\s*)+(hour|hr|year|yr|annually|annual|month|mo|week|wk)\b/i;
  const num = (s: string, k?: string) => Number(s.replace(/,/g, "")) * (k ? 1000 : 1);
  const unitOf = (u: string | undefined, n: number): "hour" | "year" | "month" | "week" => {
    const x = (u ?? "").toLowerCase();
    if (x.startsWith("h")) return "hour";
    if (x.startsWith("mo")) return "month";
    if (x.startsWith("w")) return "week";
    if (x.startsWith("y") || x.startsWith("ann")) return "year";
    return n >= 1000 ? "year" : "hour";
  };
  const r = range.exec(text);
  if (r) {
    const min = num(r[1], r[2]);
    const max = num(r[3], r[4] ?? r[2]);
    return { min, max, unit: unitOf(r[5], min), quote: r[0].trim() };
  }
  const s = single.exec(text);
  if (s) {
    const min = num(s[1], s[2]);
    return { min, unit: unitOf(s[3], min), quote: s[0].trim() };
  }
  return null;
}

export function parseHours(text: string): { hours: number; quote: string } | null {
  const range = /\b([1-6]\d)\s*(?:-|–|—|to)\s*([1-6]\d)\s*(?:hours|hrs)\s*(?:a|per|\/)?\s*week/i.exec(text);
  if (range) return { hours: Math.max(Number(range[1]), Number(range[2])), quote: range[0] };
  const single = /\b([1-6]\d)\s*(?:\+\s*)?(?:hours|hrs)\s*(?:a|per|\/|each)\s*week/i.exec(text);
  if (single) return { hours: Number(single[1]), quote: single[0] };
  if (/\bfull[\s-]time\b/i.test(text) && !/\bpart[\s-]time\b/i.test(text)) {
    const m = /\bfull[\s-]time\b/i.exec(text)!;
    return { hours: 40, quote: `${m[0]} (usually 40 hours; ask whether 35 or fewer is possible)` };
  }
  return null;
}

/** What the listing says about where he can live, judged against the home state. */
export function stateEligibility(text: string, homeState = "West Virginia"): Finding | null {
  const abbrev = homeState === "West Virginia" ? "WV" : null;
  const home = new RegExp(`\\b${homeState}\\b${abbrev ? `|\\b${abbrev}\\b` : ""}`);
  const excluded = new RegExp(`(?:not (?:able to )?(?:hire|hiring|employ|available)|cannot (?:hire|employ)|excluding|except(?:ing)?|unable to hire)[^.]{0,160}(?:\\b${homeState}\\b${abbrev ? `|\\b${abbrev}\\b` : ""})`, "i");
  const ex = excluded.exec(text);
  if (ex) return { key: "wvEligible", fact: { state: "no", source: "listing", note: quoteAround(text, ex.index, ex[0].length) }, quote: quoteAround(text, ex.index, ex[0].length) };
  const cue = /\b(?:only (?:hire|hiring|considering) (?:candidates|applicants|residents)?\s*(?:in|from|who live in)|(?:must|need to) (?:reside|live|be located) in (?:one of )?(?:the following|these)|eligible states|states we (?:hire|employ) in|available in the following states|we can hire in)/i.exec(text);
  const named = US_STATES.filter((s) => new RegExp(`\\b${s}\\b`).test(text) && !(s === "Virginia" && /\bWest Virginia\b/.test(text) && !/(?<!West )\bVirginia\b/.test(text)));
  if (cue) {
    const q = quoteAround(text, cue.index, cue[0].length + 200);
    if (home.test(text)) return { key: "wvEligible", fact: { state: "yes", source: "listing", note: q }, quote: q };
    if (named.length >= 3) return { key: "wvEligible", fact: { state: "no", source: "listing", note: `Lists eligible states and ${homeState} isn't one: ${q}` }, quote: q };
  }
  const anywhere = /\b(?:anywhere in the (?:US|U\.S\.|United States)|all (?:50 )?(?:US )?states|any (?:US )?state|remote \((?:US|USA|United States)\))/i.exec(text);
  if (anywhere) {
    const q = quoteAround(text, anywhere.index, anywhere[0].length);
    return { key: "wvEligible", fact: { state: "yes", source: "listing", note: q }, quote: q };
  }
  return null;
}

/** Things a listing can rule out in so many words ("no cold calling", "zero quotas"). */
const NEGATABLE = new Set<FactKey>(["coldCalling", "salesQuota", "commissionOnly", "phoneHeavy", "meetingsFrequent", "realtimeConstant", "weekendsOrOnCall"]);

/** Whether the few words before a match say "no", "never", "without", and so on. */
export function negated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 30), index).toLowerCase();
  const clause = before.split(/[.;:!?\n]/).pop() ?? "";
  return /\b(?:no|not|never|without|zero|free of|don't|won't|doesn't|isn't|aren't|nor|instead of)\b[^,]*$/.test(clause);
}

/**
 * Read a listing for the facts it states and the warnings it carries.
 * Everything found here is labeled "listing": what the posting says, not
 * what has been confirmed.
 */
export function scanListing(text: string, homeState = "West Virginia"): { facts: Facts; findings: Finding[]; warnings: string[] } {
  const facts: Facts = {};
  const findings: Finding[] = [];
  const warnings: string[] = [];
  const set = (key: FactKey, f: Fact, quote: string) => {
    if (!facts[key]) {
      facts[key] = f;
      findings.push({ key, fact: f, quote });
    }
  };
  for (const rule of RULES) {
    const m = first(text, rule.re);
    if (!m) continue;
    const quote = quoteAround(text, m.index, m.length);
    if (negated(text, m.index)) {
      // "No cold calling", "never hybrid": the listing rules the thing out.
      if (NEGATABLE.has(rule.key) && rule.state === "yes") set(rule.key, { state: "no", source: "listing", note: quote }, quote);
      continue;
    }
    set(rule.key, { state: rule.state, value: rule.value, source: "listing", note: quote }, quote);
  }
  const pay = parsePay(text);
  if (pay) {
    set("payMin", { state: "yes", value: String(pay.min), source: "listing", note: pay.quote }, pay.quote);
    if (pay.max) set("payMax", { state: "yes", value: String(pay.max), source: "listing", note: pay.quote }, pay.quote);
    set("payUnit", { state: "yes", value: pay.unit, source: "listing", note: pay.quote }, pay.quote);
    if (!facts.commissionOnly && /\b(?:base (?:pay|salary|wage|rate)|hourly (?:rate|wage)|salary range|pay range|starting (?:pay|wage))\b/i.test(text)) {
      set("payGuaranteed", { state: "yes", source: "listing", note: pay.quote }, pay.quote);
    }
  }
  if (facts.commissionOnly?.state === "yes") set("payGuaranteed", { state: "no", source: "listing", note: facts.commissionOnly.note }, facts.commissionOnly.note ?? "");
  const hours = parseHours(text);
  if (hours) set("hours", { state: "yes", value: String(hours.hours), source: "listing", note: hours.quote }, hours.quote);
  const st = stateEligibility(text, homeState);
  if (st?.fact) set("wvEligible", st.fact, st.quote);

  // Schedule kind, most flexible first.
  if (/\basync(?:hronous)?\b|\bset your own (?:hours|schedule)\b|\bwork (?:whenever|when) (?:you want|it suits)\b|\bflexible hours\b.*\bdeadlines\b|\bfully flexible schedule\b/i.test(text)) set("schedule", { state: "yes", value: "async", source: "listing" }, "flexible and asynchronous");
  else if (/\b(?:[5-7](?::\d{2})?\s*(?:am|a\.m\.))\s*(?:-|–|—|to)\s*(?:1|2|3)(?::\d{2})?\s*(?:pm|p\.m\.)/i.test(text)) set("schedule", { state: "yes", value: "early", source: "listing" }, "an early day");
  else if (/\brotating shifts?\b|\bshifts? (?:assigned|vary)\b|\bovernight\b|\bsplit shifts?\b/i.test(text)) set("schedule", { state: "yes", value: "shifts", source: "listing" }, "shifts");
  else if (/\bmonday (?:-|–|—|to|through) friday\b|\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:-|–|—|to)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.test(text)) set("schedule", { state: "yes", value: "predictable", source: "listing" }, "a set schedule");

  // How much customer contact, from the worst sign found.
  if (facts.phoneHeavy?.state === "yes" || facts.realtimeConstant?.state === "yes") set("interaction", { state: "yes", value: "constant", source: "listing" }, "phone or live queue work");
  else if (facts.meetingsFrequent?.state === "yes" || /\b(?:video calls|zoom|phone calls)\b/i.test(text)) set("interaction", { state: "yes", value: "some", source: "listing" }, "some calls or meetings");
  else if (/\b(?:email|ticket)(?:s|ing)?[\s-]?(?:based|support|queue)\b|\bvia email and tickets\b/i.test(text)) set("interaction", { state: "yes", value: "written", source: "listing" }, "email and tickets");
  else if (/\bback[\s-]office\b|\bno customer (?:contact|interaction)\b|\bbehind the scenes\b|\bdata entry\b|\brecords? (?:management|maintenance)\b/i.test(text)) set("interaction", { state: "yes", value: "none", source: "listing" }, "back office");

  for (const s of SCAM) {
    const m = first(text, s.re);
    if (m) {
      warnings.push(s.warning);
      findings.push({ key: "scam", quote: quoteAround(text, m.index, m.length), warning: s.warning });
    }
  }
  if (warnings.length > 0) set("legitimate", { state: "no", source: "listing", note: warnings.join(" ") }, warnings[0]);
  for (const s of MISLEADING) {
    const m = first(text, s.re);
    if (m) {
      warnings.push(s.warning);
      findings.push({ key: "misleading", quote: quoteAround(text, m.index, m.length), warning: s.warning });
    }
  }
  return { facts, findings, warnings };
}

// ---------- Duplicates and changes ----------

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const keep = new URLSearchParams();
    for (const [k, v] of u.searchParams) if (!/^(utm_|ref|source|src|gh_src|lever-source|fbclid|gclid)/i.test(k)) keep.set(k, v);
    const q = keep.toString();
    return `${u.hostname.replace(/^www\./, "").toLowerCase()}${u.pathname.replace(/\/+$/, "").toLowerCase()}${q ? `?${q}` : ""}`;
  } catch {
    return url.trim().toLowerCase();
  }
}

function squash(s: string): string {
  return s.toLowerCase().replace(/\b(?:inc|llc|ltd|co|corp|corporation|company|the)\b/g, "").replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Same employer and same title is the same job, wherever it was found. */
export function dedupeKey(employer: string, title: string): string {
  return `${squash(employer)}|${squash(title).replace(/\b(?:remote|us|usa|work from home|wfh)\b/g, "").replace(/\s+/g, " ").trim()}`;
}

/** A short fingerprint of a listing's text, to notice when it changes. */
export function fingerprint(text: string): string {
  let h = 2166136261;
  const t = text.replace(/\s+/g, " ").trim().toLowerCase();
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// ---------- Pipeline ----------

export const STATUSES = ["new", "review", "saved", "preparing", "ready", "approved", "submitted", "interview", "offer", "rejected", "closed", "passed"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABEL: Record<Status, string> = {
  new: "Newly found",
  review: "Waiting for his review",
  saved: "Saved",
  preparing: "Preparing the application",
  ready: "Ready for his approval",
  approved: "Approved, not yet submitted",
  submitted: "Submitted",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Not selected",
  closed: "Position closed",
  passed: "Passed on",
};

/** Status moves a person can make by hand. Approval and submission have their own steps. */
export const MANUAL_MOVES: Record<Status, Status[]> = {
  new: ["review", "saved", "preparing", "passed"],
  review: ["saved", "preparing", "passed"],
  saved: ["review", "preparing", "passed"],
  preparing: ["saved", "passed"],
  ready: ["preparing", "passed"],
  approved: ["preparing", "passed"],
  submitted: ["interview", "rejected", "closed"],
  interview: ["offer", "rejected", "closed"],
  offer: ["closed"],
  rejected: [],
  closed: [],
  passed: ["review"],
};

/** Days after submitting to suggest a polite follow up. */
export const FOLLOW_UP_DAYS = 7;

// ---------- Asking instead of guessing ----------

const ASK: Partial<Record<FactKey, string>> = {
  wvEligible: "Are you able to employ someone who lives in West Virginia?",
  travelOk: "My family travels within the US for part of the year. Could I work from other US states while traveling, if I keep a reliable connection and a quiet workspace?",
  noOffice: "Is the role fully remote, with no office days, site visits, or relocation?",
  payGuaranteed: "Is the pay a guaranteed base wage, separate from any bonus?",
  payMin: "What is the guaranteed base pay range?",
  hours: "How many hours a week is the role? Would 30 to 35 hours a week be possible?",
  commissionOnly: "Is any part of the pay commission?",
  coldCalling: "Does the role involve any outbound calling?",
  salesQuota: "Are there sales, upsell, or retention targets?",
  phoneHeavy: "How much of the work is by phone, compared with email or tickets?",
  meetingsFrequent: "How many scheduled video meetings are there in a typical week?",
  realtimeConstant: "Is the work handled from a live queue, or can it be worked through in order during the day?",
  schedule: "Is the schedule flexible, or are there set hours? If set, which hours and time zone?",
  weekendsOrOnCall: "Are weekends, on call shifts, or overtime ever required?",
  employment: "Is this a W2 employee position or a contract (1099) role?",
};

/** One polite question for each requirement still unknown, in the order they matter. */
export function verificationQuestions(facts: Facts): string[] {
  const out: string[] = [];
  for (const key of ["wvEligible", "travelOk", "noOffice", "payGuaranteed", "payMin", "hours", "commissionOnly", "coldCalling", "salesQuota", "phoneHeavy", "meetingsFrequent", "realtimeConstant", "schedule", "weekendsOrOnCall", "employment"] as FactKey[]) {
    const f = fact(facts, key);
    if (f.state === "unknown" || (key === "schedule" && !f.value)) out.push(ASK[key]!);
  }
  return out;
}

/** A short note to a recruiter asking only what's still unknown. No personal or health details. */
export function verificationNote(facts: Facts, job: { title: string; employer: string }, name: string): string | null {
  const qs = verificationQuestions(facts);
  if (qs.length === 0) return null;
  return `Hello,\n\nI'm interested in the ${job.title} role at ${job.employer}. Before I apply, could you help me with a few questions?\n\n${qs.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nThank you for your time.\n\n${name}`.trim();
}

// ---------- Whose search ----------

/**
 * Which search to show someone: the one they last chose when both are open
 * to them, otherwise whichever one is. Null means neither, so they're
 * offered a start.
 */
export function chooseSearch(o: { mine: boolean; partnerOpen: boolean; want?: "self" | "partner" }): "self" | "partner" | null {
  if (o.want === "partner" && o.partnerOpen) return "partner";
  if (o.want === "self" && o.mine) return "self";
  if (o.partnerOpen && !o.mine) return "partner";
  if (o.mine) return "self";
  return null;
}
