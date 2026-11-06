import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned, type Me } from "../lib";

/**
 * Us (2026-11-06): the loop map and the agreements are one shared row the
 * two of them edit together. Each person's side of the dance and their
 * catches are their own, private unless an answer is shared on purpose.
 */

/** The couple's shared row: mine or my partner's, whichever exists. */
async function usRow(ctx: QueryCtx | MutationCtx, me: Me): Promise<Doc<"rtUs"> | null> {
  const mine = await ctx.db.query("rtUs").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).first();
  if (mine) return mine;
  if (!me.partner) return null;
  const theirs = await ctx.db.query("rtUs").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).first();
  return theirs && theirs.visibility === "shared" ? theirs : null;
}

async function usRowOrNew(ctx: MutationCtx, me: Me): Promise<Doc<"rtUs">> {
  const existing = await usRow(ctx, me);
  if (existing) return existing;
  const id = await ctx.db.insert("rtUs", { ownerId: me.profile._id, visibility: "shared", trigger: "", steps: [], ends: "", agreements: {}, signed: [], updatedAt: Date.now(), updatedBy: me.profile._id });
  return (await ctx.db.get(id))!;
}

const step = v.object({ who: v.id("profiles"), does: v.string(), feels: v.string(), thinks: v.string(), needs: v.string() });

export const ours = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const row = await usRow(ctx, me);
    return { row, me: me.profile._id, partner: me.partner ? { id: me.partner._id, name: me.partner.displayName } : null };
  },
});

export const saveLoop = mutation({
  args: { trigger: v.string(), steps: v.array(step), ends: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await usRowOrNew(ctx, me);
    const people = new Set([me.profile._id, me.partner?._id].filter(Boolean));
    for (const s of args.steps) if (!people.has(s.who)) throw new ConvexError("A step has to be one of the two of you.");
    await ctx.db.patch(row._id, {
      trigger: args.trigger.trim().slice(0, 600),
      steps: args.steps.slice(0, 12).map((s) => ({ who: s.who, does: s.does.trim().slice(0, 400), feels: s.feels.trim().slice(0, 300), thinks: s.thinks.trim().slice(0, 300), needs: s.needs.trim().slice(0, 300) })),
      ends: args.ends.trim().slice(0, 600),
      updatedAt: Date.now(),
      updatedBy: me.profile._id,
    });
  },
});

export const saveAgreement = mutation({
  args: { key: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await usRowOrNew(ctx, me);
    const agreements = { ...row.agreements, [args.key.slice(0, 40)]: args.text.trim().slice(0, 1000) };
    // A change unsigns both; each signs again when they've read it.
    await ctx.db.patch(row._id, { agreements, signed: [], updatedAt: Date.now(), updatedBy: me.profile._id });
  },
});

export const sign = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const row = await usRowOrNew(ctx, me);
    if (row.signed.includes(me.profile._id)) return;
    await ctx.db.patch(row._id, { signed: [...row.signed, me.profile._id] });
  },
});

// ---------- My side ----------

export const mySide = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("rtSide").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const theirs = me.partner ? (await ctx.db.query("rtSide").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).collect()).filter((r) => r.visibility === "shared") : [];
    return { mine, theirs, partnerName: me.partner?.displayName ?? null };
  },
});

export const saveSide = mutation({
  args: { key: v.string(), text: v.string(), share: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = args.key.slice(0, 40);
    const existing = await ctx.db.query("rtSide").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id).eq("key", key)).first();
    const text = args.text.trim().slice(0, 4000);
    if (existing) {
      if (!text) { await ctx.db.delete(existing._id); return; }
      await ctx.db.patch(existing._id, { text, updatedAt: Date.now(), ...(args.share !== undefined ? { visibility: args.share ? "shared" : "private" } : {}) });
    } else if (text) {
      await ctx.db.insert("rtSide", { ownerId: me.profile._id, visibility: args.share ? "shared" : "private", key, text, updatedAt: Date.now() });
    }
  },
});

export const shareSide = mutation({
  args: { id: v.id("rtSide"), share: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rtSide", args.id);
    await ctx.db.patch(row._id, { visibility: args.share ? "shared" : "private" });
  },
});

// ---------- I caught it ----------

export const catches = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    return await ctx.db.query("rtCatches").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const addCatch = mutation({
  args: { role: v.string(), what: v.string(), instead: v.optional(v.string()), next: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("rtCatches", { ownerId: me.profile._id, visibility: "private", role: args.role.slice(0, 20), what: cleanText(args.what, 2000, "What happened"), instead: optionalText(args.instead, 2000, "What I did instead"), next: optionalText(args.next, 2000, "Next time"), createdAt: Date.now() });
  },
});

export const removeCatch = mutation({
  args: { id: v.id("rtCatches") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const row = await requireOwned(ctx, me, "rtCatches", args.id);
    await ctx.db.delete(row._id);
  },
});

/** For the coach: the shared loop and agreements, my own side, and the partner's shared answers. */
export async function usContext(ctx: QueryCtx, me: Me): Promise<string[]> {
  const out: string[] = [];
  const row = await usRow(ctx, me);
  const name = (id: Id<"profiles">) => (id === me.profile._id ? me.profile.displayName : me.partner?.displayName ?? "their partner");
  if (row && (row.trigger || row.steps.length)) {
    out.push(`Their loop, as they mapped it together: starts with "${row.trigger}". ${row.steps.map((s, i) => `${i + 1}. ${name(s.who)} ${s.does}${s.feels ? ` (feels: ${s.feels})` : ""}${s.thinks ? ` (thinks: ${s.thinks})` : ""}${s.needs ? ` (needs: ${s.needs})` : ""}`).join(" ")}${row.ends ? ` It usually ends: ${row.ends}.` : ""}`);
  }
  if (row && Object.keys(row.agreements).length) out.push(`Their agreements: ${Object.entries(row.agreements).filter(([, t]) => t.trim()).map(([k, t]) => `${k}: ${t}`).join(" | ")}${row.signed.length === 2 ? " (both signed)" : ""}`);
  const mine = await ctx.db.query("rtSide").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
  if (mine.length) out.push(`${me.profile.displayName}'s own side of the dance, in their words: ${mine.map((r) => `${r.key}: ${r.text}`).join(" | ")}`);
  if (me.partner) {
    const theirs = (await ctx.db.query("rtSide").withIndex("by_owner", (q) => q.eq("ownerId", me.partner!._id)).collect()).filter((r) => r.visibility === "shared");
    if (theirs.length) out.push(`What ${me.partner.displayName} chose to share about their side: ${theirs.map((r) => `${r.key}: ${r.text}`).join(" | ")}`);
  }
  return out;
}
