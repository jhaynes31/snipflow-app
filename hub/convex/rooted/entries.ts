import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned } from "../lib";

/**
 * Rooted (2026-11-03): "Where I am today" reads and the map of past people.
 * Every row is the person's own and private; nothing is counted or scored,
 * and the partner never sees any of it.
 */
const pattern = v.union(v.literal("secure"), v.literal("anxious"), v.literal("avoidant"), v.literal("disorganized"), v.literal("unsure"));

function level(n: number, label: string): number {
  if (!Number.isInteger(n) || n < 0 || n > 3) throw new Error(`${label}: pick 0 to 3.`);
  return n;
}

export const checks = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("rtChecks").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const addCheck = mutation({
  args: { secure: v.number(), anxious: v.number(), avoidant: v.number(), disorganized: v.number(), pulled: v.array(v.string()), steadied: v.array(v.string()), note: v.optional(v.string()), felt: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("rtChecks", {
      ownerId: me.profile._id,
      visibility: "private",
      secure: level(args.secure, "Secure"),
      anxious: level(args.anxious, "Anxious"),
      avoidant: level(args.avoidant, "Avoidant"),
      disorganized: level(args.disorganized, "Disorganized"),
      pulled: args.pulled.map((t) => t.trim().slice(0, 200)).filter(Boolean).slice(0, 20),
      steadied: args.steadied.map((t) => t.trim().slice(0, 200)).filter(Boolean).slice(0, 20),
      note: optionalText(args.note, 4000, "Note"),
      felt: optionalText(args.felt, 600, "Felt"),
      createdAt: Date.now(),
    });
  },
});

export const removeCheck = mutation({
  args: { id: v.id("rtChecks") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rtChecks", args.id);
    await ctx.db.delete(row._id);
  },
});

export const people = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("rtPeople").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
  },
});

const personArgs = { name: v.string(), when: v.string(), theirPattern: pattern, tells: v.array(v.string()), cost: v.string(), taught: v.string(), ended: v.optional(v.string()) };

function cleanPerson(args: { name: string; when: string; theirPattern: "secure" | "anxious" | "avoidant" | "disorganized" | "unsure"; tells: string[]; cost: string; taught: string; ended?: string }) {
  return {
    name: cleanText(args.name, 80, "Who"),
    when: cleanText(args.when, 80, "When"),
    theirPattern: args.theirPattern,
    tells: args.tells.map((t) => t.trim().slice(0, 120)).filter(Boolean).slice(0, 30),
    cost: cleanText(args.cost, 4000, "What it cost"),
    taught: cleanText(args.taught, 4000, "What it taught"),
    ended: optionalText(args.ended, 2000, "How it ended"),
  };
}

export const addPerson = mutation({
  args: personArgs,
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("rtPeople", { ownerId: me.profile._id, visibility: "private", ...cleanPerson(args), createdAt: Date.now() });
  },
});

export const editPerson = mutation({
  args: { id: v.id("rtPeople"), ...personArgs },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rtPeople", args.id);
    const { id: _id, ...rest } = args;
    void _id;
    await ctx.db.patch(row._id, cleanPerson(rest));
  },
});

export const removePerson = mutation({
  args: { id: v.id("rtPeople") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rtPeople", args.id);
    await ctx.db.delete(row._id);
  },
});
