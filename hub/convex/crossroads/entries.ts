import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { cleanText, optionalText, requireMe } from "../lib";

/**
 * The Crossroads. Answers are each person's own and visible to both once
 * written, because the decision is joint. Places, steps, and settings are
 * shared and either person can change them.
 */

async function settingsRow(ctx: QueryCtx | MutationCtx): Promise<Doc<"crSettings"> | null> {
  return await ctx.db.query("crSettings").first();
}

export const answers = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("crAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", me.profile._id)).collect();
    const theirs = me.partner ? await ctx.db.query("crAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", me.partner!._id)).collect() : [];
    return { mine, theirs, me: me.profile._id, partnerName: me.partner?.displayName ?? null, myName: me.profile.displayName };
  },
});

export const answer = mutation({
  args: { key: v.string(), importance: v.optional(v.number()), text: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = cleanText(args.key, 40, "Key");
    if (args.importance !== undefined && (args.importance < 0 || args.importance > 5)) throw new ConvexError("Importance is 0 to 5.");
    const text = optionalText(args.text, 2000, "Your answer");
    const existing = await ctx.db.query("crAnswers").withIndex("by_owner_key", (q) => q.eq("ownerId", me.profile._id).eq("key", key)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { importance: args.importance ?? existing.importance, text: args.text === undefined ? existing.text : text, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("crAnswers", { ownerId: me.profile._id, visibility: "shared", key, importance: args.importance, text, updatedAt: Date.now() });
  },
});

export const places = query({
  args: {},
  handler: async (ctx) => {
    await requireMe(ctx);
    const rows = await ctx.db.query("crPlaces").collect();
    const s = await settingsRow(ctx);
    return { overrides: rows, settings: s ?? { path: "undecided" as const, chosenPlace: undefined } };
  },
});

export const addPlace = mutation({
  args: { name: v.string(), kind: v.union(v.literal("country"), v.literal("state")), line: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const name = cleanText(args.name, 60, "Name");
    const key = "custom-" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await ctx.db.query("crPlaces").withIndex("by_key", (q) => q.eq("key", key)).first();
    if (existing) throw new ConvexError("That place is already on the list.");
    return await ctx.db.insert("crPlaces", { ownerId: me.profile._id, visibility: "shared", key, name, kind: args.kind, line: optionalText(args.line, 200, "Line"), ratings: {}, createdAt: Date.now() });
  },
});

export const setPlace = mutation({
  args: { key: v.string(), ratings: v.optional(v.any()), note: v.optional(v.string()), shortlisted: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = cleanText(args.key, 60, "Key");
    const existing = await ctx.db.query("crPlaces").withIndex("by_key", (q) => q.eq("key", key)).first();
    const patch = { ratings: args.ratings, note: args.note === undefined ? undefined : optionalText(args.note, 600, "Note"), shortlisted: args.shortlisted };
    if (existing) {
      await ctx.db.patch(existing._id, { ratings: args.ratings ?? existing.ratings, note: args.note === undefined ? existing.note : patch.note, shortlisted: args.shortlisted ?? existing.shortlisted });
      return existing._id;
    }
    return await ctx.db.insert("crPlaces", { ownerId: me.profile._id, visibility: "shared", key, ratings: args.ratings ?? {}, note: patch.note, shortlisted: args.shortlisted, createdAt: Date.now() });
  },
});

export const removePlace = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const existing = await ctx.db.query("crPlaces").withIndex("by_key", (q) => q.eq("key", args.key)).first();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const setSettings = mutation({
  args: { path: v.optional(v.union(v.literal("abroad"), v.literal("domestic"), v.literal("undecided"))), chosenPlace: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const row = await settingsRow(ctx);
    if (row) {
      await ctx.db.patch(row._id, { path: args.path ?? row.path, chosenPlace: args.chosenPlace === undefined ? row.chosenPlace : args.chosenPlace || undefined, updatedAt: Date.now() });
      return;
    }
    await ctx.db.insert("crSettings", { path: args.path ?? "undecided", chosenPlace: args.chosenPlace || undefined, updatedAt: Date.now() });
  },
});

export const steps = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("crSteps").collect();
    const s = await settingsRow(ctx);
    const names: Record<string, string> = { [me.profile._id]: me.profile.displayName };
    if (me.partner) names[me.partner._id] = me.partner.displayName;
    return { rows, path: s?.path ?? "undecided", names, me: me.profile._id, partnerId: me.partner?._id ?? null };
  },
});

export const setStep = mutation({
  args: { key: v.string(), status: v.optional(v.union(v.literal("todo"), v.literal("doing"), v.literal("done"), v.literal("skip"))), who: v.optional(v.id("profiles")), clearWho: v.optional(v.boolean()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = cleanText(args.key, 40, "Key");
    const existing = await ctx.db.query("crSteps").withIndex("by_key", (q) => q.eq("key", key)).first();
    const note = args.note === undefined ? undefined : optionalText(args.note, 600, "Note");
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status ?? existing.status, who: args.clearWho ? undefined : args.who ?? existing.who, note: args.note === undefined ? existing.note : note, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("crSteps", { ownerId: me.profile._id, visibility: "shared", key, status: args.status ?? "todo", who: args.clearWho ? undefined : args.who, note, updatedAt: Date.now() });
  },
});
