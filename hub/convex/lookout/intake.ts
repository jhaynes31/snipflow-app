/**
 * The Lookout's career interview: one question at a time, in an order that
 * starts easy. Every answer is his own words and is saved as he goes. The
 * job history itself is kept as structured entries (one per job) on the
 * History screen; these questions cover everything around it.
 *
 * `kind` tells the matcher what an answer is: "must" answers are hard
 * requirements, "prefer" answers are preferences, "about" answers are
 * background for writing his materials. Nothing here is guessed or filled
 * in for him.
 */

export type IntakeKind = "about" | "must" | "prefer";

export interface IntakeQuestion {
  key: string;
  topic: string;
  question: string;
  hint?: string;
  kind: IntakeKind;
  /** Shown on his resume header or used in documents. */
  usedFor?: "contact" | "documents" | "matching";
  /** A short answer box instead of a long one. */
  short?: boolean;
}

export const INTAKE: IntakeQuestion[] = [
  { key: "name", topic: "Contact", question: "What name should go at the top of your resume?", kind: "about", usedFor: "contact", short: true },
  { key: "email", topic: "Contact", question: "Which email address should employers use?", kind: "about", usedFor: "contact", short: true },
  { key: "phone", topic: "Contact", question: "Which phone number, if any, should go on applications?", hint: "Leave it blank if you'd rather be reached by email first.", kind: "about", usedFor: "contact", short: true },
  { key: "cityLine", topic: "Contact", question: "How should your location read on a resume?", hint: "For example: Charleston, West Virginia. Or just: West Virginia (Remote).", kind: "about", usedFor: "contact", short: true },
  { key: "link", topic: "Contact", question: "A LinkedIn or portfolio link, if you have one you're happy with.", kind: "about", usedFor: "contact", short: true },

  { key: "channels", topic: "Customer service", question: "Across your customer service years, which ways did you help people: phone, email, chat, tickets, in person? Roughly how much of each?", kind: "about", usedFor: "documents" },
  { key: "complaints", topic: "Customer service", question: "Tell me about a complaint or a tangled problem you resolved that you're quietly proud of. What happened, what did you do, and how did it end?", hint: "One real example is worth more than ten adjectives. It can become a resume line, a cover letter paragraph, or an interview answer.", kind: "about", usedFor: "documents" },
  { key: "software", topic: "Tools", question: "Which software have you used at work? Help desk tools, CRMs, order systems, spreadsheets, anything.", hint: "Zendesk, Salesforce, Freshdesk, Shopify, Excel, Google Sheets, an in-house system. Name what you remember; it's fine if you don't remember versions.", kind: "about", usedFor: "documents" },
  { key: "writing", topic: "Tools", question: "What writing or documentation have you done? Macros, help articles, process notes, training guides, case notes, emails.", kind: "about", usedFor: "documents" },
  { key: "admin", topic: "Tools", question: "Any administrative, records, data entry, scheduling, or organizing work, at a job or in the pet sitting business?", kind: "about", usedFor: "documents" },
  { key: "numbers", topic: "Evidence", question: "Any measurable results you can back up? Satisfaction scores, quality audit scores, tickets handled, awards, a backlog you cleared.", hint: "Only numbers you're sure of. If you're not sure, leave it out; we never estimate for you.", kind: "about", usedFor: "documents" },
  { key: "education", topic: "Evidence", question: "Education, certifications, and trainings, with the year if you know it.", kind: "about", usedFor: "documents" },
  { key: "sales", topic: "This year", question: "About the two sales jobs this year: what did each actually involve day to day, and what parts went well even if the job didn't?", hint: "This is for finding what you're good at, not for judging how the jobs went.", kind: "about", usedFor: "documents" },
  { key: "transition", topic: "This year", question: "When an employer asks why you're moving on from sales, what's a true answer you're comfortable giving?", hint: "For example: I learned I do my best work in support and operations, where the goal is solving problems well, not closing. You approve the wording before it's used anywhere.", kind: "about", usedFor: "documents" },
  { key: "business", topic: "This year", question: "What do you do in the pet sitting business? Scheduling, client messages, bookkeeping, records?", hint: "Only include it on applications if you want to.", kind: "about", usedFor: "documents" },

  { key: "enjoy", topic: "What fits", question: "What kinds of tasks do you enjoy, or lose track of time doing?", kind: "prefer", usedFor: "matching" },
  { key: "avoid", topic: "What fits", question: "What tasks do you want to avoid, beyond cold calling and sales quotas?", kind: "prefer", usedFor: "matching" },
  { key: "industries", topic: "What fits", question: "Any industries you'd like to work in, or rather not? Any job types you're curious about?", kind: "prefer", usedFor: "matching" },
  { key: "grow", topic: "What fits", question: "Skills you'd be willing to learn for the right job?", kind: "prefer", usedFor: "matching" },

  { key: "pay", topic: "Requirements", question: "The plan says $25 an hour guaranteed is the floor. Is that right, and is there a number that would feel really good?", hint: "The floor goes in Settings as a hard rule. The good number only helps ranking.", kind: "must", usedFor: "matching", short: true },
  { key: "benefits", topic: "Requirements", question: "Do you need health insurance or other benefits from the job, or are they a bonus?", kind: "must", usedFor: "matching" },
  { key: "hours", topic: "Requirements", question: "The plan says 30 to 35 hours a week, never more than 35. Is that right?", kind: "must", usedFor: "matching", short: true },
  { key: "schedule", topic: "Requirements", question: "Which time zone do you want your workday in, and what hours would you like if it isn't fully flexible?", hint: "The plan's first choice is fully flexible; second is about 6:00 AM to 2:30 PM.", kind: "prefer", usedFor: "matching" },
  { key: "contact", topic: "Requirements", question: "How much customer contact is all right? For example: none, email and tickets only, a few calls a week.", kind: "must", usedFor: "matching" },
  { key: "equipment", topic: "Requirements", question: "What equipment and internet do you have while traveling? Laptop, a second screen, typical internet speed, a quiet space?", hint: "Some employers require hard wired internet or a dedicated room. This helps spot those early.", kind: "must", usedFor: "matching" },
  { key: "disclose", topic: "Privacy", question: "Would you ever want an employer told about AuDHD or accommodations? You can say no, or not yet.", hint: "The answer stays here. Nothing about your health goes into any application unless you change this to yes.", kind: "must", usedFor: "documents", short: true },
];

export const INTAKE_KEYS = INTAKE.map((q) => q.key);

export function nextQuestion(answered: Set<string>, skipped: Set<string>): IntakeQuestion | null {
  return INTAKE.find((q) => !answered.has(q.key) && !skipped.has(q.key)) ?? INTAKE.find((q) => !answered.has(q.key)) ?? null;
}

/** Things the writer must never guess. If these are blank, it asks instead. */
export const MUST_HAVE_FOR_DOCUMENTS = ["name", "email"];

export const CHANNELS = ["Phone", "Email", "Chat", "Tickets", "Social media", "In person", "Back office"];
