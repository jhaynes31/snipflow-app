import { FOUND_VIA_OPTIONS } from "~/lib/attribution";
import { checkEmail, checkName, checkPhone } from "~/lib/contactValidation";

/**
 * The Guild (recruiting spec). Config, the list of facts only John may fill
 * in, and the pure helpers shared by the public Guild Hall, the interest
 * form, and the admin Guild tab.
 *
 * Rule 2.3: every claim about the role comes from John's confirmed facts.
 * Nothing in this file states a role detail; it only names what he must
 * provide.
 */

export const GUILD_CONFIG = {
  recruitPhone: "316-633-3330",
  recruitPhoneE164: "+13166333330",
  smsKeyword: "INTERVIEW",
  presentedBy: "The Foster Financial Group",
  tagline: "Protect what matters most, because life is unpredictable.",
  /** Days without Quest Log progress before a recruit is flagged as stalled (Phase 5). */
  stallDays: 10,
  /** The four requirements from the flyer. */
  requirements: [
    { id: "age", text: "Must be 18 or older", icon: "18+" },
    { id: "background", text: "Pass a background check", icon: "✓" },
    { id: "internet", text: "Have internet access", icon: "📶" },
    { id: "device", text: "Must have a laptop or phone", icon: "💻" },
  ],
  /** Section 6.2 flag lists, scanned before any recruiting output is approved (Phase 2). */
  earningsFlagWords: ["unlimited income", "six figures", "financial freedom", "passive income", "get rich", "be your own boss", "quit your job", "ground floor", "limited spots", "only a few openings"],
  hiringSafeFlagWords: ["young", "energetic", "recent grad", "recent grads", "retiree", "retirees", "moms", "dads", "digital native", "digital natives", "guys"],
  titleFlagWords: ["financial advisor", "financial planner", "investment adviser", "investment advisor", "wealth manager"],
};

/** The text link that opens a prefilled message on both iPhone and Android. */
export function smsLink(body = GUILD_CONFIG.smsKeyword): string {
  return `sms:${GUILD_CONFIG.recruitPhoneE164}?&body=${encodeURIComponent(body)}`;
}

// ── Guild facts (Section 3): John fills these in ──────────────────

export interface FactField {
  key: string;
  label: string;
  /** What John should cover, in plain words. */
  help: string;
  required: boolean;
  multiline: boolean;
  /** A fixed choice instead of free text. */
  options?: Array<{ id: string; label: string }>;
  /** Where on the Guild Hall page it appears. */
  usedIn: string;
}

export const GUILD_FACT_FIELDS: FactField[] = [
  { key: "roleTitle", label: "Role title", help: "The name of the role. Avoid regulated titles like Financial Advisor or Investment Adviser unless confirmed allowed. The flyer says \"Remote Financial Services Positions\".", required: true, multiline: false, usedIn: "Hero" },
  { key: "careerPaths", label: "Career paths", help: "The paths available: life insurance, financial services, and the optional investment path. One or two plain sentences on each.", required: true, multiline: true, usedIn: "What the work is" },
  { key: "roleSummary", label: "What the work involves", help: "One to three plain sentences on the day-to-day work.", required: true, multiline: true, usedIn: "What the work is" },
  { key: "workArrangement", label: "Work arrangement", help: "Independent contractor or employee, and how recruits relate to The Foster Financial Group.", required: true, multiline: true, usedIn: "What the work is" },
  { key: "schedule", label: "Schedule", help: "How flexible the hours are.", required: true, multiline: true, usedIn: "What the work is" },
  { key: "interviewFormat", label: "Interview format", help: "Video or phone, and roughly how long.", required: true, multiline: false, usedIn: "How it works" },
  { key: "licensing", label: "Licensing", help: "Whether an insurance license is required, what getting one involves, and which states recruits can work in.", required: true, multiline: true, usedIn: "How it works" },
  { key: "licensingSupport", label: "Licensing support", help: "What help you give with licensing, if any.", required: true, multiline: true, usedIn: "How it works" },
  { key: "training", label: "Training", help: "What training or mentoring is provided, if any.", required: true, multiline: true, usedIn: "How it works" },
  { key: "investmentLicensing", label: "Optional investment path", help: "Which licenses, how and when a recruit can pursue them (for example whether a firm sponsors them), and that it is optional. No returns, performance, or products.", required: true, multiline: true, usedIn: "How it works" },
  { key: "payStructure", label: "How pay works", help: "General terms only, for example commission-based. No dollar figures, ranges, or percentages.", required: true, multiline: true, usedIn: "Straight answers" },
  { key: "recruitCosts", label: "What recruits pay for", help: "Course, exam, fingerprinting, or license fees, or \"None\". Say it plainly.", required: true, multiline: true, usedIn: "Straight answers" },
  { key: "winStage", label: "When a recruit counts as a win", help: "Used by the scoreboard.", required: true, multiline: false, options: [{ id: "contracted", label: "When they are contracted" }, { id: "first_sale", label: "At their first sale" }], usedIn: "Scoreboard" },
  { key: "johnFullName", label: "Your full name (optional)", help: "Builds trust on the Meet John section.", required: false, multiline: false, usedIn: "Meet John" },
  { key: "licenseLookup", label: "License lookup link (optional)", help: "A web address where people can verify your license, such as your state insurance department's lookup.", required: false, multiline: false, usedIn: "Meet John and FAQ" },
];

export interface FaqItem {
  key: string;
  question: string;
  /** The spec's one suggested wording; John must still confirm it. */
  suggested?: string;
}

export const GUILD_FAQ: FaqItem[] = [
  { key: "faq_legit", question: "Is this legit? How can I check?", suggested: "Fair question, and you should ask it. Interviews are always free, and you'll never be asked to pay or share financial information to interview." },
  { key: "faq_experience", question: "Do I need experience?" },
  { key: "faq_license", question: "Do I need a license already?" },
  { key: "faq_investments", question: "Can I work with investments?" },
  { key: "faq_pay", question: "How does pay work?" },
  { key: "faq_costs", question: "Does it cost anything to get started?" },
  { key: "faq_time", question: "How much time does it take?" },
  { key: "faq_interview", question: "What happens in the interview?" },
];

export interface GuildFact {
  key: string;
  value: string;
  confirmed: boolean;
}
export type GuildFacts = Record<string, GuildFact>;

/** Every key that must be filled and confirmed before the page can go live. */
export function requiredFactKeys(): string[] {
  return [...GUILD_FACT_FIELDS.filter((f) => f.required).map((f) => f.key), ...GUILD_FAQ.map((f) => f.key)];
}

/** Keys still empty or unconfirmed. */
export function missingFacts(facts: GuildFacts): string[] {
  return requiredFactKeys().filter((k) => !(facts[k]?.value ?? "").trim() || !facts[k]?.confirmed);
}

export function guildIsLive(facts: GuildFacts): boolean {
  return missingFacts(facts).length === 0;
}

export function factLabel(key: string): string {
  return GUILD_FACT_FIELDS.find((f) => f.key === key)?.label ?? GUILD_FAQ.find((f) => f.key === key)?.question ?? key;
}

export function factValue(facts: GuildFacts | Record<string, string>, key: string): string {
  const v = facts[key];
  if (!v) return "";
  return typeof v === "string" ? v : v.value;
}

// ── Recruits (Section 4) ──────────────────────────────────────────

export const RECRUIT_STAGES = [
  { id: "interested", label: "Interested" },
  { id: "interview_booked", label: "Interview booked" },
  { id: "interviewed", label: "Interviewed" },
  { id: "getting_licensed", label: "Getting licensed" },
  { id: "licensed", label: "Licensed" },
  { id: "contracted", label: "Contracted" },
  { id: "first_sale", label: "First sale" },
  { id: "not_moving_forward", label: "Not moving forward" },
] as const;
export type RecruitStage = (typeof RECRUIT_STAGES)[number]["id"];

export function isRecruitStage(v: unknown): v is RecruitStage {
  return RECRUIT_STAGES.some((s) => s.id === v);
}
export function stageLabel(id: string): string {
  return RECRUIT_STAGES.find((s) => s.id === id)?.label ?? id;
}

export const NOT_MOVING_REASONS = [
  { id: "not_a_fit", label: "Not a fit" },
  { id: "withdrew", label: "Withdrew" },
  { id: "no_response", label: "No response" },
  { id: "didnt_complete_requirements", label: "Didn't complete requirements" },
  { id: "other", label: "Other" },
] as const;
export type NotMovingReason = (typeof NOT_MOVING_REASONS)[number]["id"];
export function reasonLabelRecruit(id: string): string {
  return NOT_MOVING_REASONS.find((r) => r.id === id)?.label ?? "";
}

export const RECRUIT_SOURCES = [
  { id: "text", label: "Texted John" },
  { id: "interest_form", label: "Interest form" },
  { id: "fit_quiz", label: "Fit quiz" },
  { id: "manual", label: "Added by hand" },
] as const;
export type RecruitSource = (typeof RECRUIT_SOURCES)[number]["id"];
export function sourceLabel(id: string): string {
  return RECRUIT_SOURCES.find((s) => s.id === id)?.label ?? id;
}

/** "How did you hear about us?": the Quest Board's options plus the flyer (Section 5.3). */
export const HEARD_ABOUT_OPTIONS: Array<{ id: string; label: string }> = [
  ...FOUND_VIA_OPTIONS.filter((o) => o.id !== "other"),
  { id: "flyer", label: "A flyer" },
  { id: "other", label: "Other" },
];
export function heardAboutLabel(id: string): string {
  return HEARD_ABOUT_OPTIONS.find((o) => o.id === id)?.label ?? (id ? id : "");
}

export const BEST_TIME_OPTIONS = ["Mornings", "Afternoons", "Evenings", "Weekends", "Any time"];

// ── Interest form (Rule 2.5) ──────────────────────────────────────

export interface InterestInput {
  name: string;
  email: string;
  phone: string;
  state: string;
  bestTime: string;
  heardAbout: string;
  note: string;
  confirmed18: boolean;
  emailConsent: boolean;
}

export interface InterestCheck {
  ok: boolean;
  errors: Partial<Record<keyof InterestInput | "contact", string>>;
  clean: InterestInput;
}

/** The same checks run in the browser and on the server. */
export function checkInterest(raw: Partial<InterestInput> | undefined): InterestCheck {
  const t = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const clean: InterestInput = {
    name: t(raw?.name, 120),
    email: t(raw?.email, 200),
    phone: t(raw?.phone, 40),
    state: t(raw?.state, 40),
    bestTime: BEST_TIME_OPTIONS.includes(t(raw?.bestTime, 40)) ? t(raw?.bestTime, 40) : "",
    heardAbout: HEARD_ABOUT_OPTIONS.some((o) => o.id === raw?.heardAbout) ? String(raw?.heardAbout) : "",
    note: t(raw?.note, 500),
    confirmed18: raw?.confirmed18 === true,
    emailConsent: raw?.emailConsent === true,
  };
  const errors: InterestCheck["errors"] = {};
  const n = checkName(clean.name);
  if (!n.ok) errors.name = n.message ?? "Please enter your name.";
  else clean.name = n.value!;
  if (clean.email) {
    const e = checkEmail(clean.email);
    if (!e.ok) errors.email = e.message ?? "Please enter a real email.";
    else clean.email = e.value!;
  }
  if (clean.phone) {
    const p = checkPhone(clean.phone);
    if (!p.ok) errors.phone = p.message ?? "Please enter a real phone number.";
    else clean.phone = p.value!;
  }
  if (!clean.email && !clean.phone) errors.contact = "Add an email or a phone number so John can reach you.";
  if (!clean.confirmed18) errors.confirmed18 = "You need to be 18 or older to apply.";
  return { ok: Object.keys(errors).length === 0, errors, clean };
}
