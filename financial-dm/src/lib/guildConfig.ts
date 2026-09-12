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
  /** Legally protected titles: never used for anyone. */
  titleFlagWords: ["investment adviser", "investment advisor", "registered investment adviser", "certified financial planner"],
  /** Fine for John himself (confirmed 12 Sep 2026). Flagged only when a post describes the role offered to recruits this way, since recruits start as the role title. */
  roleTitleFlagWords: ["financial advisor", "financial planner", "wealth manager"],
  /** Amendment, Section 6: phrases that make a legitimate post read as a scam. */
  scamPatternFlagWords: ["no experience needed, we'll show you everything", "no experience needed, we will show you everything", "message me for details", "dm me for details", "life-changing opportunity", "life changing opportunity", "not a job, a lifestyle"],
};

/** The text link that opens a prefilled message on both iPhone and Android. */
export function smsLink(body = GUILD_CONFIG.smsKeyword): string {
  return `sms:${GUILD_CONFIG.recruitPhoneE164}?&body=${encodeURIComponent(body)}`;
}

// ── Guild facts: John fills these in ──────────────────────────────
// Trust-first amendment, Section 2: two tiers. Trust facts are required
// and public. Presentation facts are John's own reference for the
// interview and are never published anywhere.

export type FactTier = "trust" | "presentation";

export interface FactField {
  key: string;
  label: string;
  /** What John should cover, in plain words. */
  help: string;
  tier: FactTier;
  /** Must be filled and confirmed before the page goes public (trust tier only). */
  required: boolean;
  multiline: boolean;
  /** A fixed choice instead of free text. */
  options?: Array<{ id: string; label: string }>;
  /** Where on the Guild Hall page it appears, or "Never published". */
  usedIn: string;
  /** A draft John may accept or rewrite. Never shown publicly until confirmed. */
  suggested?: string;
}

/** The dual-purpose disclosure draft (amendment, Section 4). John may reword it; the substance must stay. */
export const MEETING_COVERS_DRAFT =
  "Here's what to expect: we'll walk through what the work actually involves, how it's paid, and whether it fits what you're looking for. If it's helpful, I can also answer questions about your own coverage or finances. No pressure either way, and it costs you nothing to find out.";

export const GUILD_FACT_FIELDS: FactField[] = [
  // Trust facts (required, public)
  { key: "industry", label: "The industry, in plain words", help: "For example \"life insurance and financial services\". Naming the field is the first thing careful people check.", tier: "trust", required: true, multiline: false, usedIn: "What this is" },
  { key: "roleTitle", label: "Role title", help: "The name of the role a recruit starts in. John can call himself a Financial Advisor, but the role offered should be what a new recruit actually is on day one. Investment Adviser and Certified Financial Planner are legally protected; leave those out. The flyer says \"Remote Financial Services Positions\".", tier: "trust", required: true, multiline: false, usedIn: "Hero" },
  { key: "roleSummary", label: "What the work involves", help: "One or two plain sentences.", tier: "trust", required: true, multiline: true, usedIn: "What this is" },
  { key: "workArrangement", label: "Work arrangement", help: "Independent contractor or employee, and how recruits relate to The Foster Financial Group.", tier: "trust", required: true, multiline: true, usedIn: "What this is" },
  { key: "meetingCovers", label: "What the conversation covers", help: "The key piece. Say plainly that the meeting covers the opportunity, and that you can also help with the person's own coverage or financial questions if useful. This disclosure must stay in whatever you write.", tier: "trust", required: true, multiline: true, usedIn: "What the conversation covers, FAQ", suggested: MEETING_COVERS_DRAFT },
  { key: "costToInterview", label: "Cost to interview", help: "Confirm that interviewing is free and that no payment or financial information is ever requested to interview.", tier: "trust", required: true, multiline: true, usedIn: "Straight answers" },
  { key: "recruitCosts", label: "What recruits pay for to get started (optional)", help: "John keeps the figures for the interview, so the page and the FAQ say there are startup costs you pay yourself and that he goes through them on the call. Fill this in only if you decide to put them on the page.", tier: "trust", required: false, multiline: true, usedIn: "Straight answers, only if filled in" },
  { key: "payBasis", label: "Pay basis", help: "Commission-based, salaried, or something else. General only: no figures and no details. The details are for the conversation.", tier: "trust", required: true, multiline: false, usedIn: "Straight answers, FAQ" },
  { key: "licensingRequired", label: "Is a license required?", help: "Whether a license is required, and whether recruits can get one with your help. One or two sentences.", tier: "trust", required: true, multiline: true, usedIn: "Straight answers" },
  { key: "investmentPathExists", label: "The optional investment path (optional)", help: "One sentence saying an optional investment licensing path exists, if there is one. No returns, performance, or products. Leave blank and the page will not mention it.", tier: "trust", required: false, multiline: false, usedIn: "Straight answers, only if filled in" },
  { key: "interviewFormat", label: "Interview format", help: "Video or phone, and roughly how long.", tier: "trust", required: true, multiline: false, usedIn: "Straight answers, FAQ" },
  { key: "johnFullName", label: "Your full name", help: "Required. A real name is one of the strongest trust signals. Confirm you are happy for it to be public.", tier: "trust", required: true, multiline: false, usedIn: "Meet John" },
  { key: "licenseLookup", label: "License lookup link (optional)", help: "Optional, and entirely your call. Leave it blank if you would rather not publish anything about your license. Nothing on the page mentions it unless you fill this in.", tier: "trust", required: false, multiline: false, usedIn: "Meet John and FAQ" },
  { key: "statesServed", label: "States recruits can work in (optional)", help: "Only if limited. Leave blank if not.", tier: "trust", required: false, multiline: false, usedIn: "Straight answers" },
  { key: "guildHallPaused", label: "Pause the public page", help: "Set to Yes to hide the Guild Hall, the fit quiz, and the Guild forge without touching any of your answers. Set it back to No to bring them back.", tier: "trust", required: false, multiline: false, options: [{ id: "no", label: "No, keep it public" }, { id: "yes", label: "Yes, hide it for now" }], usedIn: "On/off switch" },
  { key: "fitQuizApproved", label: "Fit quiz copy approved", help: "The \"Is This Quest for You?\" quiz at /guild/quiz stays hidden until you have read its questions, results, and scoring and are happy with them. Use the \"Preview the fit quiz\" link at the top of this page (only you can see it before it goes public), then set this to Yes.", tier: "trust", required: false, multiline: false, options: [{ id: "yes", label: "Yes, the quiz can go public" }, { id: "no", label: "Not yet" }], usedIn: "Fit quiz" },
  // Presentation facts (John's reference, never published)
  { key: "compensationDetails", label: "How pay actually works", help: "Your interview notes. Never shown to the public or to any generator.", tier: "presentation", required: false, multiline: true, usedIn: "Never published" },
  { key: "businessOwnership", label: "What building your own business here means", help: "Your interview notes.", tier: "presentation", required: false, multiline: true, usedIn: "Never published" },
  { key: "growthPath", label: "Team structure and advancement", help: "Your interview notes.", tier: "presentation", required: false, multiline: true, usedIn: "Never published" },
  { key: "trainingDetails", label: "Training and support, day to day", help: "Your interview notes.", tier: "presentation", required: false, multiline: true, usedIn: "Never published" },
  { key: "licensingDetails", label: "The full licensing process, timelines, and support", help: "Your notes. The Quest Log may later show this to recruits who have already joined.", tier: "presentation", required: false, multiline: true, usedIn: "Never published (Quest Log later)" },
  { key: "scheduleDetails", label: "Hours and flexibility", help: "Your interview notes.", tier: "presentation", required: false, multiline: true, usedIn: "Never published" },
  { key: "winStage", label: "When a recruit counts as a win", help: "Used by the scoreboard only.", tier: "presentation", required: false, multiline: false, options: [{ id: "contracted", label: "When they are contracted" }, { id: "first_sale", label: "At their first sale" }], usedIn: "Scoreboard only" },
];

export interface FaqItem {
  key: string;
  question: string;
  /** What John's answer should do (amendment, Section 5). */
  guidance: string;
  /** Legitimacy questions may never be deferred to the conversation. */
  legitimacy: boolean;
}

export const GUILD_FAQ: FaqItem[] = [
  { key: "faq_legit", question: "Is this legit? How can I check?", guidance: "Name the industry and the company. Answer it fully; never save this one for the conversation.", legitimacy: true },
  { key: "faq_experience_license", question: "Do I need experience or a license already?", guidance: "Answer directly.", legitimacy: true },
  { key: "faq_costs", question: "Does it cost anything to interview or get started?", guidance: "Answer directly, matching your cost-to-interview and recruit-costs answers above. Never defer this one.", legitimacy: true },
  { key: "faq_pay", question: "How does pay work?", guidance: "Your pay basis in one general sentence, then something like \"The details are what the conversation is for.\" A real partial answer first, never a bare deflection.", legitimacy: false },
  { key: "faq_interview", question: "What happens in the interview?", guidance: "The format plus what the conversation covers, including that you can also help with their own coverage or finances if useful.", legitimacy: true },
];

export interface GuildFact {
  key: string;
  value: string;
  confirmed: boolean;
}
export type GuildFacts = Record<string, GuildFact>;

/** Every key that must be filled and confirmed before the page can go live: required trust facts and all FAQ answers. */
export function requiredFactKeys(): string[] {
  return [...GUILD_FACT_FIELDS.filter((f) => f.tier === "trust" && f.required).map((f) => f.key), ...GUILD_FAQ.map((f) => f.key)];
}

/** Keys the public page is allowed to see: trust facts and FAQ answers, and only when confirmed. */
export function publicFactKeys(): string[] {
  return [...GUILD_FACT_FIELDS.filter((f) => f.tier === "trust").map((f) => f.key), ...GUILD_FAQ.map((f) => f.key)];
}

export function isPresentationFact(key: string): boolean {
  return GUILD_FACT_FIELDS.some((f) => f.key === key && f.tier === "presentation");
}

/** Keys still empty or unconfirmed. */
export function missingFacts(facts: GuildFacts): string[] {
  return requiredFactKeys().filter((k) => !(facts[k]?.value ?? "").trim() || !facts[k]?.confirmed);
}

/** Every required answer confirmed, and John has not paused the page. */
export function guildIsLive(facts: GuildFacts): boolean {
  return missingFacts(facts).length === 0 && facts.guildHallPaused?.value !== "yes";
}

export function factLabel(key: string): string {
  return GUILD_FACT_FIELDS.find((f) => f.key === key)?.label ?? GUILD_FAQ.find((f) => f.key === key)?.question ?? key;
}

export function factValue(facts: GuildFacts | Record<string, string>, key: string): string {
  const v = facts[key];
  if (!v) return "";
  return typeof v === "string" ? v : v.value;
}

/** The facts a visitor may see: public keys only, confirmed only. Presentation facts never pass through here. */
export function publicFacts(facts: GuildFacts): Record<string, string> {
  const allowed = new Set(publicFactKeys());
  return Object.fromEntries(
    Object.values(facts)
      .filter((f) => allowed.has(f.key) && f.confirmed && f.value.trim())
      .map((f) => [f.key, f.value]),
  );
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
