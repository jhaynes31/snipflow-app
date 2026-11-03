import { ConvexError, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { cleanText, optionalText } from "../lib";
import { AGENCIES } from "./agencies";
import { requireLookout } from "./data";

/**
 * The Agencies page: the built in list merged with what's been noted about
 * each one, plus any added by hand. A row is only written once something
 * is noted, so the list itself can change without touching saved notes.
 * Not part of his profile, so either of them can keep it up to date.
 */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const a = await requireLookout(ctx);
    const rows = await ctx.db.query("loAgencies").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).collect();
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const builtIn = AGENCIES.map((ag) => {
      const r = byKey.get(ag.key);
      return { key: ag.key, name: ag.name, site: ag.site, focus: ag.focus, group: ag.group, custom: false, lastCheckedAt: r?.lastCheckedAt, signedUp: r?.signedUp ?? false, recruiter: r?.recruiter, contact: r?.contact, followUpAt: r?.followUpAt, notes: r?.notes, hidden: r?.hidden ?? false };
    });
    const custom = rows.filter((r) => r.key.startsWith("custom:")).map((r) => ({ key: r.key, name: r.name, site: r.site, focus: r.focus ?? "", group: "general" as const, custom: true, lastCheckedAt: r.lastCheckedAt, signedUp: r.signedUp, recruiter: r.recruiter, contact: r.contact, followUpAt: r.followUpAt, notes: r.notes, hidden: r.hidden }));
    return [...builtIn, ...custom];
  },
});

const cleanSite = (s: string | undefined) => {
  const t = optionalText(s, 120, "Web address");
  return t?.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "").toLowerCase();
};

export const update = mutation({
  args: {
    key: v.string(),
    checkedNow: v.optional(v.boolean()),
    signedUp: v.optional(v.boolean()),
    recruiter: v.optional(v.string()),
    contact: v.optional(v.string()),
    followUpAt: v.optional(v.union(v.number(), v.null())),
    notes: v.optional(v.string()),
    hidden: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const known = AGENCIES.find((x) => x.key === args.key);
    const row = await ctx.db.query("loAgencies").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).filter((q) => q.eq(q.field("key"), args.key)).first();
    if (!known && !row) throw new ConvexError("That agency isn't here.");
    const patch: Partial<Doc<"loAgencies">> = { updatedAt: Date.now() };
    if (args.checkedNow) patch.lastCheckedAt = Date.now();
    if (args.signedUp !== undefined) patch.signedUp = args.signedUp;
    if (args.recruiter !== undefined) patch.recruiter = optionalText(args.recruiter, 120, "Recruiter");
    if (args.contact !== undefined) patch.contact = optionalText(args.contact, 200, "Contact");
    if (args.followUpAt !== undefined) patch.followUpAt = args.followUpAt ?? undefined;
    if (args.notes !== undefined) patch.notes = optionalText(args.notes, 4000, "Notes");
    if (args.hidden !== undefined) patch.hidden = args.hidden;
    if (row) await ctx.db.patch(row._id, patch);
    else await ctx.db.insert("loAgencies", { ownerId: a.ownerId, visibility: "shared", key: args.key, name: known!.name, site: known!.site, focus: known!.focus, signedUp: false, hidden: false, ...patch, updatedAt: Date.now() });
  },
});

export const add = mutation({
  args: { name: v.string(), site: v.optional(v.string()), focus: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    const now = Date.now();
    await ctx.db.insert("loAgencies", { ownerId: a.ownerId, visibility: "shared", key: `custom:${now}`, name: cleanText(args.name, 120, "Agency name"), site: cleanSite(args.site), focus: optionalText(args.focus, 300, "What they place"), signedUp: false, hidden: false, updatedAt: now });
  },
});

export const remove = mutation({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const a = await requireLookout(ctx);
    if (!args.key.startsWith("custom:")) throw new ConvexError("Built in agencies can be hidden instead.");
    const row = await ctx.db.query("loAgencies").withIndex("by_owner", (q) => q.eq("ownerId", a.ownerId)).filter((q) => q.eq(q.field("key"), args.key)).first();
    if (row) await ctx.db.delete(row._id);
  },
});
