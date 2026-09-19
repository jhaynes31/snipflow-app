import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { emitEvent } from "../events";
import { access, cleanText, optionalText, requireMe, requireOwned } from "../lib";

const step = v.object({ id: v.string(), text: v.string(), done: v.boolean() });
const part = v.object({
  id: v.string(),
  name: v.string(),
  needsFirst: v.optional(v.string()),
  blocker: v.optional(v.string()),
  planIfBlocked: v.optional(v.string()),
  steps: v.array(step),
});

/** My projects, newest first. */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db
      .query("tendProjects")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id))
      .order("desc")
      .take(30);
  },
});

/** The partner's projects they shared for body-doubling. */
export const sharedWithMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return [];
    return (await ctx.db
      .query("tendProjects")
      .withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id))
      .order("desc")
      .take(30)).filter((p) => access(me, p) === "full");
  },
});

export const get = query({
  args: { id: v.id("tendProjects") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await ctx.db.get(args.id);
    if (!p) return null;
    return access(me, p) === "full" ? p : null;
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const now = Date.now();
    return await ctx.db.insert("tendProjects", {
      ownerId: me.profile._id,
      visibility: "private",
      title: cleanText(args.title, 120, "Project"),
      parts: [],
      status: "open",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Save any of the walk's answers. Only the fields passed change. */
export const save = mutation({
  args: {
    id: v.id("tendProjects"),
    title: v.optional(v.string()),
    done: v.optional(v.string()),
    parts: v.optional(v.array(part)),
    firstAction: v.optional(v.string()),
    firstActionWhen: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("finished"))),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "tendProjects", args.id);
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = cleanText(args.title, 120, "Project");
    if (args.done !== undefined) patch.done = optionalText(args.done, 400, "Done");
    if (args.parts !== undefined) {
      patch.parts = args.parts.slice(0, 40).map((x) => ({
        ...x,
        name: cleanText(x.name, 120, "Part"),
        needsFirst: optionalText(x.needsFirst, 300, "Needs first"),
        blocker: optionalText(x.blocker, 300, "Blocker"),
        planIfBlocked: optionalText(x.planIfBlocked, 300, "Plan"),
        steps: x.steps.slice(0, 60).map((s) => ({ ...s, text: cleanText(s.text, 200, "Step") })),
      }));
    }
    if (args.firstAction !== undefined) patch.firstAction = optionalText(args.firstAction, 300, "First action");
    if (args.firstActionWhen !== undefined) patch.firstActionWhen = optionalText(args.firstActionWhen, 120, "When");
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(p._id, patch);
  },
});

/** Share with the partner for body-doubling, or take it back. Sharing is explicit. */
export const setShared = mutation({
  args: { id: v.id("tendProjects"), shared: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "tendProjects", args.id);
    await ctx.db.patch(p._id, { visibility: args.shared ? "shared" : "private", updatedAt: Date.now() });
  },
});

/**
 * Send to Every Box. Tend never touches Every Box's tables: it emits an
 * event, and Every Box's own listener (convex/moduleHooks.ts) decides what
 * to make of it, inside Every Box.
 */
export const sendToEveryBox = mutation({
  args: { id: v.id("tendProjects") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "tendProjects", args.id);
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "tend",
      name: "project.sendToEveryBox",
      payload: {
        projectId: p._id,
        title: p.title,
        firstAction: p.firstAction ?? null,
        parts: p.parts.map((x) => x.name),
      },
    });
    await ctx.db.patch(p._id, { sentToEveryBoxAt: Date.now(), updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("tendProjects") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const p = await requireOwned(ctx, me, "tendProjects", args.id);
    await ctx.db.delete(p._id);
  },
});
