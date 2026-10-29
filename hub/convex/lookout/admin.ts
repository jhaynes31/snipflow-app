import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "../_generated/server";
import { cleanText } from "../lib";
import { vetChange, type AdminContext, type Change } from "./adminPure";
import { requireLookout, type Access } from "./data";
import { INTAKE } from "./intake";
import { MANUAL_MOVES, type Status } from "./pure";

/**
 * The Lookout's assistant: plain instructions ("I uploaded the resume, but
 * these two jobs are no longer current") turned into changes in the right
 * places. The model's answer is checked against what exists (adminPure.ts
 * vetChange) and then applied at once, by the same rules as a hand edit:
 * history and answers written by the partner wait for the owner's
 * confirmation. Every change keeps what it replaced, so it can be undone.
 */

async function context(ctx: Parameters<typeof requireLookout>[0], a: Access) {
  const roles = await ctx.db.query("loRoles").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
  const answers = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId)).collect();
  const notes = await ctx.db.query("loNotes").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
  const jobs = (await ctx.db.query("loJobs").withIndex("by_owner_status", (q) => q.eq("ownerId", a.ownerId)).collect()).sort((x, y) => y.statusAt - x.statusAt).slice(0, 60);
  return { roles, answers, notes, jobs };
}

function vetCtx(c: Awaited<ReturnType<typeof context>>): AdminContext {
  return {
    roles: c.roles.map((r) => ({ id: r._id, employer: r.employer, title: r.title, start: r.start, end: r.end, confirmed: r.confirmed })),
    answerKeys: INTAKE.map((q) => q.key),
    notes: c.notes.map((n) => ({ id: n._id })),
    jobs: c.jobs.map((j) => ({ id: j._id, status: j.status })),
  };
}

export const messages = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const rows = await ctx.db.query("loAdmin").withIndex("by_owner_time", (q) => q.eq("ownerId", a.ownerId)).order("desc").take(60);
    const names = new Map<string, string>([[a.me.profile._id, "You"]]);
    if (a.me.partner) names.set(a.me.partner._id, a.me.partner.displayName);
    return rows.reverse().map((m) => ({ _id: m._id, role: m.role, text: m.text, applied: m.applied.map((x) => x.summary), undone: !!m.undoneAt, createdAt: m.createdAt, author: names.get(m.authorId) ?? "" }));
  },
});

export const notes = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    return await ctx.db.query("loNotes").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
  },
});

export const removeNote = mutation({
  args: { id: v.id("loNotes") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const n = await ctx.db.get(args.id);
    if (!n || n.ownerId !== a.ownerId) throw new ConvexError("That note isn't here.");
    await ctx.db.delete(n._id);
  },
});

/** What the assistant may see: the history, the answers, the notes, the jobs, and the recent conversation. */
export const forAssistant = internalQuery({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const c = await context(ctx, a);
    const recent = await ctx.db.query("loAdmin").withIndex("by_owner_time", (q) => q.eq("ownerId", a.ownerId)).order("desc").take(10);
    const ownerName = a.role === "owner" ? a.me.profile.displayName : a.me.partner?.displayName ?? "the person looking for work";
    const writer = a.me.profile.displayName;
    const block = [
      `<search_for>${ownerName}</search_for>`,
      `<writing_now>${writer}${a.role === "owner" ? " (the person the search is for)" : ` (${ownerName}'s partner, helping)`}</writing_now>`,
      `<today>${new Date().toISOString().slice(0, 10)}</today>`,
      `<work_history>\n${c.roles.map((r) => `<job id="${r._id}">${r.title} at ${r.employer}, ${r.start || "start unknown"} to ${r.end || "current"}${r.location ? `, ${r.location}` : ""}${r.sales ? ", sales role" : ""}${r.confirmed ? "" : ", not yet confirmed"}\nDuties: ${r.duties.slice(0, 400) || "none given"}\nAchievements: ${r.achievements.slice(0, 300) || "none given"}\nTools: ${r.tools.slice(0, 200) || "none given"}</job>`).join("\n") || "No jobs yet."}\n</work_history>`,
      `<interview_answers>\n${INTAKE.filter((q) => q.key !== "disclose").map((q) => `<answer key="${q.key}" question="${q.question.replace(/"/g, "'")}">${c.answers.find((x) => x.key === q.key)?.answer.slice(0, 400) ?? ""}</answer>`).join("\n")}\n</interview_answers>`,
      `<writer_notes>\n${c.notes.map((n) => `<note id="${n._id}">${n.text}</note>`).join("\n") || "None."}\n</writer_notes>`,
      `<jobs_considered>\n${c.jobs.map((j) => `<listing id="${j._id}" status="${j.status}" allowed_next="${(MANUAL_MOVES[j.status as Status] ?? []).join(",")}">${j.title} at ${j.employer}</listing>`).join("\n") || "None yet."}\n</jobs_considered>`,
    ].join("\n");
    return { block, history: recent.reverse().map((m) => ({ role: m.role, text: m.text })) };
  },
});

type Undo =
  | { t: "rolePatch"; id: Id<"loRoles">; prev: Partial<Doc<"loRoles">> }
  | { t: "roleRestore"; doc: Omit<Doc<"loRoles">, "_id" | "_creationTime"> }
  | { t: "delete"; table: "loRoles" | "loNotes" | "loAnswers"; id: string }
  | { t: "answerPatch"; id: Id<"loAnswers">; prev: Partial<Doc<"loAnswers">> }
  | { t: "noteRestore"; doc: Omit<Doc<"loNotes">, "_id" | "_creationTime"> }
  | { t: "jobPatch"; id: Id<"loJobs">; prev: Partial<Doc<"loJobs">> };

function strip<T extends { _id: unknown; _creationTime: unknown }>(doc: T): Omit<T, "_id" | "_creationTime"> {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

async function apply(ctx: MutationCtx, a: Access, c: Change, now: number): Promise<Undo> {
  const confirmed = a.role === "owner";
  switch (c.kind) {
    case "roleUpdate": {
      const r = (await ctx.db.get(c.roleId as Id<"loRoles">))!;
      const prev: Partial<Doc<"loRoles">> = { employer: r.employer, title: r.title, start: r.start, end: r.end, location: r.location, duties: r.duties, achievements: r.achievements, tools: r.tools, sales: r.sales, confirmed: r.confirmed, updatedAt: r.updatedAt };
      const patch: Partial<Doc<"loRoles">> = { updatedAt: now, confirmed: confirmed && r.confirmed };
      if (c.employer) patch.employer = c.employer;
      if (c.title) patch.title = c.title;
      if (c.start) patch.start = c.start;
      if (c.endAction === "set") patch.end = c.end;
      if (c.endAction === "current") patch.end = undefined;
      if (c.location) patch.location = c.location;
      if (c.duties) patch.duties = c.duties;
      if (c.achievements) patch.achievements = c.achievements;
      if (c.tools) patch.tools = c.tools;
      if (c.sales !== "unchanged") patch.sales = c.sales === "yes";
      await ctx.db.patch(r._id, patch);
      return { t: "rolePatch", id: r._id, prev };
    }
    case "roleRemove": {
      const r = (await ctx.db.get(c.roleId as Id<"loRoles">))!;
      await ctx.db.delete(r._id);
      return { t: "roleRestore", doc: strip(r) };
    }
    case "roleAdd": {
      const id = await ctx.db.insert("loRoles", { ownerId: a.ownerId, visibility: "private", employer: c.employer, title: c.title, start: c.start, end: c.endAction === "set" ? c.end : undefined, location: c.location || undefined, channels: [], duties: c.duties, achievements: c.achievements, tools: c.tools, sales: c.sales === "yes", confirmed, createdAt: now, updatedAt: now });
      return { t: "delete", table: "loRoles", id };
    }
    case "answerSet": {
      const row = await ctx.db.query("loAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", a.ownerId).eq("key", c.key)).first();
      if (row) {
        await ctx.db.patch(row._id, { answer: c.text, skipped: false, confirmed, updatedAt: now });
        return { t: "answerPatch", id: row._id, prev: { answer: row.answer, skipped: row.skipped, confirmed: row.confirmed, updatedAt: row.updatedAt } };
      }
      const id = await ctx.db.insert("loAnswers", { ownerId: a.ownerId, visibility: "private", key: c.key, answer: c.text, skipped: false, confirmed, updatedAt: now });
      return { t: "delete", table: "loAnswers", id };
    }
    case "noteAdd": {
      const id = await ctx.db.insert("loNotes", { ownerId: a.ownerId, visibility: "private", text: c.text, authorId: a.me.profile._id, createdAt: now });
      return { t: "delete", table: "loNotes", id };
    }
    case "noteRemove": {
      const n = (await ctx.db.get(c.noteId as Id<"loNotes">))!;
      await ctx.db.delete(n._id);
      return { t: "noteRestore", doc: strip(n) };
    }
    case "jobStatus": {
      const j = (await ctx.db.get(c.jobId as Id<"loJobs">))!;
      await ctx.db.patch(j._id, { status: c.status, statusAt: now });
      return { t: "jobPatch", id: j._id, prev: { status: j.status, statusAt: j.statusAt } };
    }
    case "jobNote": {
      const j = (await ctx.db.get(c.jobId as Id<"loJobs">))!;
      await ctx.db.patch(j._id, { notes: [j.notes, c.text].filter(Boolean).join("\n").slice(0, 6000) });
      return { t: "jobPatch", id: j._id, prev: { notes: j.notes } };
    }
  }
}

/**
 * Save the exchange and make the changes. Each proposed change is checked
 * again here, against the data as it is now; one that no longer fits is
 * skipped and said so.
 */
export const record = internalMutation({
  args: { message: v.string(), reply: v.string(), changes: v.array(v.any()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const now = Date.now();
    await ctx.db.insert("loAdmin", { ownerId: a.ownerId, visibility: "private", authorId: a.me.profile._id, role: "user", text: cleanText(args.message, 8000, "Message"), applied: [], createdAt: now });
    const vctx = vetCtx(await context(ctx, a));
    const applied: { summary: string; undo: Undo }[] = [];
    let skipped = 0;
    for (const raw of args.changes.slice(0, 30)) {
      const c = vetChange((raw ?? {}) as Record<string, unknown>, vctx);
      if (!c) {
        skipped++;
        continue;
      }
      // A job removed earlier in the same message can't be changed again.
      if ((c.kind === "roleUpdate" || c.kind === "roleRemove") && !(await ctx.db.get(c.roleId as Id<"loRoles">))) continue;
      applied.push({ summary: c.summary, undo: await apply(ctx, a, c, now) });
    }
    let reply = args.reply.trim() || (applied.length ? "Done." : "I didn't change anything.");
    if (skipped) reply += `\n\n(${skipped === 1 ? "One change" : `${skipped} changes`} couldn't be made because ${skipped === 1 ? "it didn't" : "they didn't"} match anything here. Try saying it another way.)`;
    if (applied.length && a.role !== "owner" && applied.some((x) => ["rolePatch", "delete", "answerPatch"].includes(x.undo.t))) {
      const owner = a.me.partner?.displayName ?? "The person this search is for";
      reply += `\n\n${owner} will see the changed history and answers marked for a quick confirmation before they're used in an application.`;
    }
    await ctx.db.insert("loAdmin", { ownerId: a.ownerId, visibility: "private", authorId: a.me.profile._id, role: "assistant", text: reply.slice(0, 8000), applied, createdAt: now + 1 });
    return { reply, applied: applied.length };
  },
});

/** Put back everything one assistant reply changed, last change first. */
export const undo = mutation({
  args: { id: v.id("loAdmin") },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const m = await ctx.db.get(args.id);
    if (!m || m.ownerId !== a.ownerId || m.role !== "assistant") throw new ConvexError("That isn't here.");
    if (m.undoneAt) return;
    for (const { undo } of [...m.applied].reverse() as { undo: Undo }[]) {
      if (undo.t === "rolePatch") {
        if (await ctx.db.get(undo.id)) await ctx.db.patch(undo.id, undo.prev);
      } else if (undo.t === "roleRestore") {
        await ctx.db.insert("loRoles", undo.doc);
      } else if (undo.t === "delete") {
        const row = await ctx.db.get(undo.id as Id<typeof undo.table>);
        if (row) await ctx.db.delete(row._id);
      } else if (undo.t === "answerPatch") {
        if (await ctx.db.get(undo.id)) await ctx.db.patch(undo.id, undo.prev);
      } else if (undo.t === "noteRestore") {
        await ctx.db.insert("loNotes", undo.doc);
      } else if (undo.t === "jobPatch") {
        if (await ctx.db.get(undo.id)) await ctx.db.patch(undo.id, undo.prev);
      }
    }
    await ctx.db.patch(m._id, { undoneAt: Date.now() });
  },
});
