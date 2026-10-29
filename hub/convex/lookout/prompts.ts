/**
 * The Lookout's instructions to the writing model, and the shapes it must
 * answer in. Pure, so the rules can be read and tested. The model drafts;
 * it never decides. Every fact it may use is handed to it, every claim it
 * makes is checked against the same facts afterwards (writing.ts), and
 * anything it doesn't know becomes a question for him.
 */
import { FACT_KEYS, FACT_LABEL, INTERACTION_KINDS, SCHEDULE_KINDS } from "./pure.ts";

export const LOOKOUT_MODEL = "claude-opus-5-5";

const TRUTH = `Rules that are never broken:
- Use only the facts given to you: his confirmed work history and his own interview answers. Never invent or round an employer, title, date, number, tool, certification, achievement, or responsibility.
- If something important is missing, don't fill the gap. Leave it out and add a short, specific question for him to the "questions" list instead.
- You may choose what to emphasize, reorder, and reword. You may use the job's own terms where they truly describe his real experience.
- Write without any hyphen or dash characters at all: no hyphens, en dashes, em dashes, or dash bullets. Write "follow up", "2019 to 2022", "detail oriented", and use commas or new sentences instead of dashes.
- Never mention health, diagnoses, neurodivergence, disability, or accommodations unless the facts say he chose to share them.
- Plain, warm, specific, professional language in his voice. No clichés ("results driven", "team player", "proven track record", "passionate about"), no filler, no exaggeration. Vary sentence openings.
- Don't present sales work as customer service, and don't make sales the center of his story. Describe sales roles by their true, transferable parts (written follow up, record keeping, product knowledge, resolving concerns).
- You make no claims about AI detection. The goal is a truthful application he can discuss comfortably in an interview.`;

export const RESUME_SYSTEM = `You draft a tailored resume for one real person applying to one job. ${TRUTH}

The resume is assembled from your answer by code: employer names, titles, and dates are filled in from his history, so you only return the wording.
- summary: two or three sentences about what he does well that matters for this job.
- skills: 6 to 12 short items, each one supported by his history or answers.
- roles: for each role worth including, its roleId exactly as given and 2 to 5 bullets. Start bullets with a varied action verb. Include a number only if that exact number appears in the facts.
- education: lines exactly as he gave them; empty if he gave none.
- questions: what you'd need to ask him to make this stronger. Empty if nothing is missing.`;

export const LETTER_SYSTEM = `You draft a cover letter for one real person applying to one job. ${TRUTH}

The letter is 250 to 380 words in four short paragraphs: why this role and this employer (from the listing, specifically); one or two real examples from his history that show he can do the work; how he works (independent, careful, written, organized), only as far as the facts show it; a short, plain close. Address it "Dear Hiring Team," unless a name is in the listing. Sign with his name. If the honest reason he wants this role isn't in the facts, ask him in "questions" rather than inventing one.`;

export const ANSWERS_SYSTEM = `You draft answers to an employer's application questions for one real person. ${TRUTH}

Answer each question in his voice, briefly and specifically. For eligibility, legal, salary, availability, or yes/no questions, answer only from his facts; if the facts don't settle it, write "ASK FIRST" as the answer and add a question. Never answer for him that he is authorized, available, or willing to do something unless the facts say so.`;

export const READ_SYSTEM = `You read a job listing for a person with firm requirements: fully remote from his home state, able to work while traveling in the United States, guaranteed base pay, 35 hours a week or fewer, no cold calling, no sales quotas, no commission only pay, little phone work, few scheduled video meetings, no constant live customer contact.

For each fact, answer only from what the listing actually says. "unknown" is the right answer whenever the listing doesn't say. Quote the listing's own words in "quote" (under 200 characters) whenever you answer yes or no; leave quote empty for unknown. Never guess from the company's reputation.
- value: for payMin and payMax a plain number; payUnit one of hour, week, month, year; hours a number of hours per week; employment "employee" or "contractor"; schedule one of ${SCHEDULE_KINDS.join(", ")}; interaction one of ${INTERACTION_KINDS.join(", ")}. Otherwise empty.
- state "yes" for a fact means the listing says it is true. For coldCalling, salesQuota, commissionOnly, phoneHeavy, meetingsFrequent, realtimeConstant, and weekendsOrOnCall, "yes" means the listing includes that thing.`;

/** The facts the reader may report. Legitimacy and whether it's open are checked by people and pages, not read. */
export const READABLE: string[] = FACT_KEYS.filter((k) => k !== "legitimate" && k !== "open");

export function readerSchema() {
  const one = { type: "object", additionalProperties: false, required: ["state", "value", "quote"], properties: { state: { type: "string", enum: ["yes", "no", "unknown"] }, value: { type: "string" }, quote: { type: "string" } } };
  return { type: "object", additionalProperties: false, required: READABLE, properties: Object.fromEntries(READABLE.map((k) => [k, { ...one, description: FACT_LABEL[k as keyof typeof FACT_LABEL] }])) };
}

export const RESUME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "skills", "roles", "education", "questions"],
  properties: {
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    roles: { type: "array", items: { type: "object", additionalProperties: false, required: ["roleId", "bullets"], properties: { roleId: { type: "string" }, bullets: { type: "array", items: { type: "string" } } } } },
    education: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
};

export const LETTER_SCHEMA = { type: "object", additionalProperties: false, required: ["letter", "questions"], properties: { letter: { type: "string" }, questions: { type: "array", items: { type: "string" } } } };

export const ANSWERS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answers", "questions"],
  properties: {
    answers: { type: "array", items: { type: "object", additionalProperties: false, required: ["question", "answer"], properties: { question: { type: "string" }, answer: { type: "string" } } } },
    questions: { type: "array", items: { type: "string" } },
  },
};

export interface DraftInput {
  job: { title: string; employer: string; description: string };
  roles: { id: string; employer: string; title: string; start: string; end?: string; location?: string; channels: string[]; duties: string; achievements: string; tools: string; sales: boolean }[];
  answers: { key: string; question: string; answer: string }[];
  allowHealthDisclosure: boolean;
}

/** The facts block every draft is written from. */
export function factsBlock(d: DraftInput): string {
  const roles = d.roles.map((r) => `<role id="${r.id}">\nEmployer: ${r.employer}\nTitle: ${r.title}\nDates: ${r.start} to ${r.end || "present"}${r.location ? `\nLocation: ${r.location}` : ""}\nChannels: ${r.channels.join(", ") || "not given"}${r.sales ? "\nThis was a sales role." : ""}\nDuties:\n${r.duties || "not given"}\nAchievements:\n${r.achievements || "not given"}\nTools: ${r.tools || "not given"}\n</role>`).join("\n");
  const answers = d.answers.map((a) => `<answer topic="${a.key}">\nQ: ${a.question}\nA: ${a.answer}\n</answer>`).join("\n");
  return `<his_history>\n${roles || "No confirmed work history yet."}\n</his_history>\n<his_answers>\n${answers || "No confirmed answers yet."}\n</his_answers>\n<sharing_health_details>${d.allowHealthDisclosure ? "He has said yes to sharing them where relevant." : "No. Never mention them."}</sharing_health_details>`;
}

export function jobBlock(d: DraftInput): string {
  return `<job>\nTitle: ${d.job.title}\nEmployer: ${d.job.employer}\nListing:\n${d.job.description.slice(0, 30000)}\n</job>`;
}
