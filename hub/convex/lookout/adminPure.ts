/**
 * The Lookout's assistant, pure: what it may change, the shape it answers
 * in, and how each change is checked before it's made. Changes that pass
 * are applied straight away (Jen, 2026-10-29: "it delivers it to the
 * appropriate sections and updates automatically"), each with an undo, and
 * by the same rules as an edit by hand (admin.ts). Anything unclear becomes
 * a question instead.
 */
import { MANUAL_MOVES, STATUSES, type Status } from "./pure.ts";

export const CHANGE_KINDS = ["roleUpdate", "roleRemove", "roleAdd", "answerSet", "noteAdd", "noteRemove", "jobStatus", "jobNote", "jobApplied"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

/**
 * One proposed change. Flat on purpose: every field is always present, and
 * an empty string means "leave this alone".
 */
export interface Change {
  kind: ChangeKind;
  /** One plain sentence saying what this change does, shown beside its checkbox. */
  summary: string;
  roleId: string;
  jobId: string;
  noteId: string;
  key: string;
  status: string;
  text: string;
  employer: string;
  title: string;
  start: string;
  /** "set" uses `end`; "current" clears the end date; "unchanged" leaves it. */
  endAction: "unchanged" | "set" | "current";
  end: string;
  location: string;
  duties: string;
  achievements: string;
  tools: string;
  sales: "unchanged" | "yes" | "no";
  /** For jobApplied: how it's known that it went through. */
  how: "email" | "page" | "unsure" | "other" | "";
  /** For jobApplied: the day he applied, YYYY-MM-DD, when they say. */
  date: string;
}

export const ADMIN_SYSTEM = `You are the Lookout's assistant. The Lookout is a private job search tool for one person; the people writing to you are that person or their partner, keeping the profile and job list up to date. Answer briefly and warmly in plain language.

You can make changes to:
- the work history: roleUpdate (change fields of a job; to mark a job as ended set endAction "set" with end, to mark it current set endAction "current"), roleRemove, roleAdd;
- interview answers: answerSet (key from the list given, the full new answer);
- standing notes for the writer about how to present his history: noteAdd (text), noteRemove (noteId);
- jobs being considered: jobStatus (jobId and one of the allowed next statuses listed for that job), jobNote (jobId, text to add to its notes), jobApplied (he applied on the employer's site: jobId; how is "email" or "page" only if they say a confirmation email or page came, "unsure" if they don't say or aren't sure; date as YYYY-MM-DD only if they give the day, using today's date for "this morning" or "today"; text for any other detail). Match jobs by employer and title; if more than one could fit, or the job isn't in the list, ask (a job not in the list is added first with Add a job).

Rules that are never broken:
- Change only what the message actually says. Never invent dates, employers, titles, numbers, duties, or reasons. If something you need is missing or ambiguous (which job, what end date), make no change for it and ask a short, specific question in the reply.
- Dates are "YYYY-MM" or "YYYY", exactly as the person gave them. "No longer current" without a date is a question, not a guess.
- Use only ids that appear in the context. Never touch anything not mentioned.
- Leave every field you aren't changing as an empty string, endAction "unchanged", and sales "unchanged".
- Each change has a one sentence summary naming the job or answer it touches, like "Customer Service Rep at Mountain Supply: ended 2025-06."
- Your changes are made as soon as you answer, and each can be undone. In the reply, say plainly what you changed and what you need to know for anything you didn't.
- If the message is a question rather than an update, answer it from the context and change nothing.`;

export function adminSchema() {
  const str = { type: "string" };
  const fields = ["kind", "summary", "roleId", "jobId", "noteId", "key", "status", "text", "employer", "title", "start", "endAction", "end", "location", "duties", "achievements", "tools", "sales", "how", "date"];
  return {
    type: "object",
    additionalProperties: false,
    required: ["reply", "changes"],
    properties: {
      reply: str,
      changes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: fields,
          properties: {
            ...Object.fromEntries(fields.map((f) => [f, str])),
            kind: { type: "string", enum: [...CHANGE_KINDS] },
            endAction: { type: "string", enum: ["unchanged", "set", "current"] },
            sales: { type: "string", enum: ["unchanged", "yes", "no"] },
            how: { type: "string", enum: ["", "email", "page", "unsure", "other"] },
          },
        },
      },
    },
  };
}

export interface AdminContext {
  roles: { id: string; employer: string; title: string; start: string; end?: string; confirmed: boolean }[];
  answerKeys: string[];
  notes: { id: string }[];
  jobs: { id: string; status: string }[];
}

/** Statuses a job can be in before it's recorded as applied. */
export const BEFORE_APPLYING = ["new", "review", "saved", "preparing", "ready", "approved", "passed"];

const DATE = /^\d{4}(-(0[1-9]|1[0-2]))?$/;
const s = (x: unknown) => (typeof x === "string" ? x.trim() : "");

/**
 * Check a proposed change against what exists. Returns the cleaned change,
 * or null when it points at something that isn't there or asks for a step
 * that isn't allowed. Dropped changes are never shown.
 */
export function vetChange(raw: Record<string, unknown>, ctx: AdminContext): Change | null {
  const kind = s(raw.kind) as ChangeKind;
  if (!CHANGE_KINDS.includes(kind)) return null;
  const endAction = (["unchanged", "set", "current"].includes(s(raw.endAction)) ? s(raw.endAction) : "unchanged") as Change["endAction"];
  const sales = (["unchanged", "yes", "no"].includes(s(raw.sales)) ? s(raw.sales) : "unchanged") as Change["sales"];
  const c: Change = {
    kind,
    summary: s(raw.summary).slice(0, 300),
    roleId: s(raw.roleId),
    jobId: s(raw.jobId),
    noteId: s(raw.noteId),
    key: s(raw.key),
    status: s(raw.status),
    text: s(raw.text).slice(0, 4000),
    employer: s(raw.employer).slice(0, 120),
    title: s(raw.title).slice(0, 120),
    start: s(raw.start),
    endAction,
    end: s(raw.end),
    location: s(raw.location).slice(0, 120),
    duties: s(raw.duties).slice(0, 6000),
    achievements: s(raw.achievements).slice(0, 6000),
    tools: s(raw.tools).slice(0, 2000),
    sales,
    how: (["email", "page", "unsure", "other"].includes(s(raw.how)) ? s(raw.how) : "") as Change["how"],
    date: s(raw.date),
  };
  if (!c.summary) return null;
  if (c.start && !DATE.test(c.start)) return null;
  if (c.endAction === "set" && !DATE.test(c.end)) return null;
  const role = ctx.roles.find((r) => r.id === c.roleId);
  switch (kind) {
    case "roleUpdate": {
      if (!role) return null;
      const start = c.start || role.start;
      if (c.endAction === "set" && start && c.end < start) return null;
      const changes = c.employer || c.title || c.start || c.endAction !== "unchanged" || c.location || c.duties || c.achievements || c.tools || c.sales !== "unchanged";
      return changes ? c : null;
    }
    case "roleRemove":
      return role ? c : null;
    case "roleAdd":
      if (!c.employer || !c.title || !c.start) return null;
      if (c.endAction === "set" && c.end < c.start) return null;
      return c;
    case "answerSet":
      return ctx.answerKeys.includes(c.key) && c.key !== "disclose" && c.text ? c : null;
    case "noteAdd":
      return c.text ? c : null;
    case "noteRemove":
      return ctx.notes.some((n) => n.id === c.noteId) ? c : null;
    case "jobStatus": {
      const job = ctx.jobs.find((j) => j.id === c.jobId);
      if (!job || !(STATUSES as readonly string[]).includes(c.status)) return null;
      return (MANUAL_MOVES[job.status as Status] ?? []).includes(c.status as Status) ? c : null;
    }
    case "jobApplied": {
      const job = ctx.jobs.find((j) => j.id === c.jobId);
      if (!job || !BEFORE_APPLYING.includes(job.status)) return null;
      if (c.date && !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) return null;
      return { ...c, how: c.how || "unsure" };
    }
    case "jobNote":
      return ctx.jobs.some((j) => j.id === c.jobId) && c.text ? c : null;
  }
}
