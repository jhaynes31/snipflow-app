/**
 * The Lookout's writing rules, pure and tested: the no-dash rule for every
 * resume and cover letter, the resume assembled from verified facts, and
 * the quality review a document must pass before it's shown as ready.
 *
 * The no-dash rule: a finished resume or letter holds no hyphen, en dash,
 * em dash, minus sign, or dash separator of any kind. Phrases are rewritten
 * so they still read well ("2019 to 2022", "follow up", "detail oriented"),
 * never just deleted.
 */

/** Every dash-like character: hyphen, soft hyphen, the Unicode dash block, minus, small and full width hyphens. */
export const DASH_CHARS = "-­֊־᐀᠆‐‑‒–—―⁃−⸗⸚⸺⸻⹀〜〰゠︱︲﹘﹣－";
const D = `[${DASH_CHARS.replace(/-/, "\\-")}]`;
const DASH = new RegExp(D, "g");

export function findDashes(text: string): { index: number; char: string; context: string }[] {
  const out: { index: number; char: string; context: string }[] = [];
  for (const m of text.matchAll(DASH)) out.push({ index: m.index!, char: m[0], context: text.slice(Math.max(0, m.index! - 20), m.index! + 20) });
  return out;
}

/** Hyphenated words with a better unhyphenated spelling. Anything else becomes two words. */
const JOINED: Record<string, string> = {
  "e-mail": "email",
  "e-mails": "emails",
  "e-commerce": "ecommerce",
  "co-worker": "coworker",
  "co-workers": "coworkers",
  "co-op": "co op",
  "on-boarding": "onboarding",
  "log-in": "login",
  "set-up": "setup",
  "wi-fi": "WiFi",
  "multi-task": "multitask",
  "multi-tasking": "multitasking",
  "multi-tasker": "multitasker",
  "re-enter": "reenter",
  "re-organize": "reorganize",
  "re-organized": "reorganized",
  "pre-screen": "prescreen",
  "pre-screened": "prescreened",
  "non-profit": "nonprofit",
  "non-profits": "nonprofits",
  "check-in": "check in",
  "follow-up": "follow up",
  "follow-ups": "follow ups",
  "sign-up": "sign up",
  "self-starter": "self starter",
  "t-shirt": "T shirt",
  "x-ray": "X ray",
  "x-rays": "X rays",
  "add-on": "add on",
  "add-ons": "add ons",
  "one-on-one": "one on one",
  "day-to-day": "day to day",
  "end-to-end": "end to end",
  "up-to-date": "up to date",
  "start-up": "startup",
  "work-life": "work and life",
};
const PREFIXES = ["pre", "re", "co", "non", "multi", "sub", "inter", "post", "semi", "anti", "micro", "mid"];
const MONTHS = "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";

function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase() && /[A-Z]/.test(source)) return replacement.toUpperCase();
  if (source[0] && source[0] === source[0].toUpperCase() && /[A-Z]/.test(source[0])) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

/**
 * Rewrite every dash so the sentence still reads. Ordered from the most
 * specific shape to the least: bullets, separators, ranges, phone numbers,
 * clause dashes, known words, prefixes, then any word pair left.
 */
export function scrubDashes(input: string): string {
  let t = input.replace(/­/g, "");
  // A line that is only dashes (a decorative rule) goes.
  t = t.replace(new RegExp(`^[ \\t]*${D}{2,}[ \\t]*$`, "gm"), "");
  // A dash used as a bullet becomes a bullet.
  t = t.replace(new RegExp(`^([ \\t]*)${D}+[ \\t]+`, "gm"), "$1• ");
  // Phone numbers: 304-555-0123 becomes 304.555.0123.
  t = t.replace(new RegExp(`\\b(\\d{3})${D}(\\d{3})${D}(\\d{4})\\b`, "g"), "$1.$2.$3");
  t = t.replace(new RegExp(`\\((\\d{3})\\)\\s*(\\d{3})${D}(\\d{4})\\b`, "g"), "($1) $2.$3");
  // Ranges of dates, years, and numbers read "to".
  t = t.replace(new RegExp(`((?:${MONTHS})\\.?\\s+\\d{4}|\\d{4}|\\d{1,2}/\\d{4})\\s*${D}{1,2}\\s*(present|current|now|today|(?:${MONTHS})\\.?\\s+\\d{4}|\\d{4}|\\d{1,2}/\\d{4})`, "gi"), "$1 to $2");
  t = t.replace(new RegExp(`\\b(${MONTHS})\\s*${D}\\s*(${MONTHS})\\b`, "g"), "$1 to $2");
  t = t.replace(new RegExp(`(\\$?\\d[\\d,.]*%?[kK]?)\\s*${D}{1,2}\\s*(\\$?\\d[\\d,.]*%?[kK]?)`, "g"), "$1 to $2");
  // A minus in front of a number reads "minus".
  t = t.replace(new RegExp(`(^|\\s)${D}(\\d)`, "gm"), "$1minus $2");
  t = t.replace(new RegExp(`\\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)([a-z]*)\\s*${D}\\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)([a-z]*)`, "g"), "$1$2 to $3$4");
  // An unspaced en dash between words is a range ("Ohio–Texas"); read it "to".
  t = t.replace(/([A-Za-z])–([A-Za-z])/g, "$1 to $2");
  // Clause dashes (spaced dashes, em dashes, doubled hyphens) become commas.
  t = t.replace(new RegExp(`\\s*[\\u2014\\u2015\\u2E3A\\u2E3B]+\\s*|\\s+${D}{1,3}\\s+|\\s*-{2,3}\\s*`, "g"), ", ");
  // Known words with a better joined or spaced spelling.
  t = t.replace(new RegExp(`\\b[A-Za-z]+(?:${D}[A-Za-z]+)+\\b`, "g"), (w) => {
    const key = w.replace(DASH, "-").toLowerCase();
    if (JOINED[key]) return matchCase(w, JOINED[key]);
    const parts = w.split(DASH);
    if (parts.length === 2 && PREFIXES.includes(parts[0].toLowerCase()) && /^[a-z]/.test(parts[1])) return parts[0] + parts[1];
    return parts.join(" ");
  });
  // Anything left (a dash between a letter and a number, a stray mark) becomes a space.
  t = t.replace(DASH, " ");
  // Tidy what the rewrites leave behind.
  t = t
    .replace(/[ \t]+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.;:!?])/g, "$1")
    .replace(/^\s*,\s*/gm, "")
    .replace(/,\s*$/gm, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
  return t;
}

// ---------- The resume, assembled from verified facts ----------

export interface RoleIn {
  id: string;
  employer: string;
  title: string;
  /** YYYY-MM. */
  start: string;
  /** YYYY-MM, or empty for a current job. */
  end?: string;
  location?: string;
  confirmed: boolean;
}

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  link?: string;
}

export interface ResumeDraft {
  summary: string;
  skills: string[];
  roles: { roleId: string; bullets: string[] }[];
  education: string[];
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function monthYear(ym: string | undefined): string {
  if (!ym) return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * Plain text in standard sections, ready for an applicant tracking system:
 * no tables, no columns, no graphics. Employer names, titles, and dates come
 * straight from the confirmed history; only the wording of bullets and the
 * summary is drafted.
 */
export function renderResume(contact: Contact, draft: ResumeDraft, roles: RoleIn[]): string {
  const lines: string[] = [];
  lines.push(contact.name.toUpperCase());
  const reach = [contact.location, contact.phone, contact.email, contact.link].filter(Boolean).join(" | ");
  if (reach) lines.push(reach);
  lines.push("");
  if (draft.summary.trim()) lines.push("SUMMARY", draft.summary.trim(), "");
  if (draft.skills.length) lines.push("SKILLS", draft.skills.join(", "), "");
  const byId = new Map(roles.map((r) => [r.id, r]));
  const used = draft.roles.filter((r) => byId.has(r.roleId));
  if (used.length) {
    lines.push("EXPERIENCE");
    for (const r of used) {
      const role = byId.get(r.roleId)!;
      lines.push(`${role.title}, ${role.employer}${role.location ? `, ${role.location}` : ""}`);
      lines.push(`${monthYear(role.start)} to ${monthYear(role.end)}`);
      for (const b of r.bullets) if (b.trim()) lines.push(`• ${b.trim()}`);
      lines.push("");
    }
  }
  if (draft.education.length) lines.push("EDUCATION AND TRAINING", ...draft.education, "");
  return scrubDashes(lines.join("\n")).trim() + "\n";
}

// ---------- Quality review ----------

export interface Issue {
  level: "block" | "fix" | "note";
  text: string;
}

/** Phrases that sound like a template rather than a person. */
export const CLICHES = [
  "results-driven", "results driven", "team player", "go-getter", "go getter", "synergy", "think outside the box", "hard-working", "hardworking individual",
  "proven track record", "dynamic professional", "passionate about", "rockstar", "ninja", "guru", "self-starter", "self starter", "best of breed", "detail-oriented team player",
  "i am writing to express my interest", "i am excited to apply", "to whom it may concern", "i believe i would be a great fit", "leverage my skills", "fast-paced environment", "fast paced environment",
  "wear many hats", "hit the ground running", "value-add", "value add", "circle back", "move the needle", "game changer", "game-changer", "seasoned professional", "thought leader",
];

/** Personal health words that never go to an employer without his explicit yes. */
export const PRIVATE_WORDS = /\b(?:autis(?:m|tic)|adhd|add\b|audhd|neurodiver(?:gent|gence|sity)|disabilit(?:y|ies)|diagnos(?:is|ed)|anxiety|depression|medication|therapy|therapist)\b/i;

/** Numbers that count as claims: money, percentages, counts. Years in dates are checked elsewhere. */
function claimNumbers(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\$?\d[\d,]*(?:\.\d+)?\s*(?:%|percent|k\b)?/gi)) {
    const raw = m[0].trim();
    const n = raw.replace(/[$,\s]|percent|%|k/gi, "");
    if (/^(19|20)\d{2}$/.test(n)) continue;
    if (n.length === 0) continue;
    out.push(raw);
  }
  return out;
}

function normNum(s: string): string {
  return s.toLowerCase().replace(/[$,\s]/g, "").replace("percent", "%");
}

/**
 * Review a finished document against the source of truth. "block" issues
 * stop it from being marked ready; "fix" issues should be looked at; "note"
 * is information. Never claims anything about AI detection.
 */
export function reviewDocument(text: string, opts: { sourceText: string; kind: "resume" | "letter" | "answers"; employers?: string[]; allowHealthDisclosure?: boolean; jobText?: string }): Issue[] {
  const issues: Issue[] = [];
  const dashes = findDashes(text);
  if (dashes.length) issues.push({ level: "block", text: `${dashes.length} dash ${dashes.length === 1 ? "character remains" : "characters remain"}, near "${dashes[0].context.replace(/\n/g, " ")}".` });

  const source = opts.sourceText.toLowerCase().replace(/,/g, "");
  const sourceNums = new Set(claimNumbers(opts.sourceText).map(normNum));
  for (const n of claimNumbers(text)) {
    const k = normNum(n);
    if (!sourceNums.has(k) && !source.includes(k)) issues.push({ level: "block", text: `"${n}" isn't in his confirmed profile. Check it with him or take it out.` });
  }

  if (!opts.allowHealthDisclosure) {
    const m = PRIVATE_WORDS.exec(text);
    if (m) issues.push({ level: "block", text: `Mentions "${m[0]}". Personal and health details stay out unless he has said yes to sharing them.` });
  }

  const lower = text.toLowerCase();
  for (const c of CLICHES) if (lower.includes(c)) issues.push({ level: "fix", text: `"${c}" reads like a template. Say what he actually did instead.` });

  // Repetition: the same opening word on several bullets, or one word used too often.
  const bullets = text.split("\n").filter((l) => l.startsWith("• ")).map((l) => l.slice(2).split(/\s+/)[0]?.toLowerCase()).filter(Boolean);
  const openers = new Map<string, number>();
  for (const b of bullets) openers.set(b, (openers.get(b) ?? 0) + 1);
  for (const [w, n] of openers) if (n >= 3) issues.push({ level: "fix", text: `${n} bullets start with "${w}". Vary the verbs.` });
  const words = lower.match(/\b[a-z]{5,}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const limit = opts.kind === "resume" ? 6 : 4;
  for (const [w, n] of counts) if (n > limit && !["customer", "customers", "support", "service", "experience"].includes(w)) issues.push({ level: "note", text: `"${w}" appears ${n} times.` });

  if (opts.kind === "resume") {
    for (const h of ["EXPERIENCE"]) if (!text.includes(h)) issues.push({ level: "fix", text: `No ${h} section.` });
    if (/\t|\|.*\|.*\|/.test(text.split("\n").slice(2).join("\n"))) issues.push({ level: "fix", text: "Tabs or table-like lines can confuse applicant tracking systems." });
    if (text.length > 7000) issues.push({ level: "note", text: "Longer than two pages. Consider trimming older roles." });
  }
  if (opts.kind === "answers" && /\bASK FIRST\b/.test(text)) issues.push({ level: "block", text: "Some answers need the person applying: look for ASK FIRST and fill those in with what's true." });
  if (opts.kind === "letter") {
    const wc = text.split(/\s+/).filter(Boolean).length;
    if (wc > 420) issues.push({ level: "fix", text: `${wc} words. Most good letters are 250 to 400.` });
    if (wc < 120) issues.push({ level: "note", text: `${wc} words. That may be too short to say why this job.` });
  }
  if (opts.employers?.length) {
    for (const e of opts.employers) if (e && opts.kind === "resume" && !text.includes(e)) issues.push({ level: "note", text: `${e} isn't on this version.` });
  }
  return issues;
}

export function blocking(issues: Issue[]): boolean {
  return issues.some((i) => i.level === "block");
}

/** The source of truth as one text, for the claim check. */
export function profileText(parts: { answers: { question: string; answer: string }[]; roles: { employer: string; title: string; start: string; end?: string; duties: string; achievements: string; tools: string; channels: string[] }[] }): string {
  const lines: string[] = [];
  for (const r of parts.roles) {
    lines.push(`${r.title} at ${r.employer}, ${r.start} to ${r.end || "present"}. Channels: ${r.channels.join(", ")}.`);
    if (r.duties) lines.push(r.duties);
    if (r.achievements) lines.push(r.achievements);
    if (r.tools) lines.push(`Tools: ${r.tools}`);
  }
  for (const a of parts.answers) if (a.answer.trim()) lines.push(`${a.question} ${a.answer}`);
  return lines.join("\n");
}
