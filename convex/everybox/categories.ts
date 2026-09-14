import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import {
  cleanCadence,
  cleanText,
  currentMembership,
  requireCategory,
  requireMembership,
} from "./lib";

/**
 * All live categories for the household. Freshness is computed on the client
 * from `lastTendedAt` and `idealCadenceDays` so the display stays accurate as
 * time passes without re-querying.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return [];
    const all = await ctx.db
      .query("ebCategories")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
      .collect();
    return all
      .filter((c) => c.archivedAt === undefined)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  },
});

/** One category with its full history (tending events and context notes). */
export const get = query({
  args: { categoryId: v.id("ebCategories") },
  handler: async (ctx, args) => {
    const m = await currentMembership(ctx);
    if (!m) return null;
    const category = await ctx.db.get(args.categoryId);
    if (!category || category.householdId !== m.household._id) return null;

    const events = await ctx.db
      .query("ebTendingEvents")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .order("desc")
      .take(100);
    const notes = await ctx.db
      .query("ebCategoryNotes")
      .withIndex("by_category", (q) => q.eq("categoryId", category._id))
      .order("desc")
      .take(100);
    return { category, events, notes };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    icon: v.string(),
    idealCadenceDays: v.number(),
    tenderId: v.optional(v.id("ebPartners")),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const tenderId = args.tenderId ?? m.partner._id;
    const tender = await ctx.db.get(tenderId);
    if (!tender || tender.householdId !== m.household._id) {
      throw new Error("The tender must be a partner in your household.");
    }
    const existing = await ctx.db
      .query("ebCategories")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
      .collect();
    const sortOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 1;
    return await ctx.db.insert("ebCategories", {
      householdId: m.household._id,
      name: cleanText(args.name, 50, "Name"),
      icon: cleanText(args.icon, 8, "Icon"),
      idealCadenceDays: cleanCadence(args.idealCadenceDays),
      tenderId,
      sortOrder,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    categoryId: v.id("ebCategories"),
    name: v.optional(v.string()),
    icon: v.optional(v.string()),
    idealCadenceDays: v.optional(v.number()),
    tenderId: v.optional(v.id("ebPartners")),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    const patch: Partial<typeof category> = {};
    if (args.name !== undefined) patch.name = cleanText(args.name, 50, "Name");
    if (args.icon !== undefined) patch.icon = cleanText(args.icon, 8, "Icon");
    if (args.idealCadenceDays !== undefined) {
      patch.idealCadenceDays = cleanCadence(args.idealCadenceDays);
    }
    if (args.tenderId !== undefined) {
      const tender = await ctx.db.get(args.tenderId);
      if (!tender || tender.householdId !== m.household._id) {
        throw new Error("The tender must be a partner in your household.");
      }
      patch.tenderId = args.tenderId;
    }
    await ctx.db.patch(category._id, patch);
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("ebCategories")) },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    let i = 1;
    for (const id of args.orderedIds) {
      const category = await requireCategory(ctx, m, id);
      await ctx.db.patch(category._id, { sortOrder: i++ });
    }
  },
});

/** Soft delete. History is kept; the category simply leaves the dashboard. */
export const archive = mutation({
  args: { categoryId: v.id("ebCategories") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    await ctx.db.patch(category._id, { archivedAt: Date.now() });
  },
});

export const restore = mutation({
  args: { categoryId: v.id("ebCategories") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    await ctx.db.patch(category._id, { archivedAt: undefined });
  },
});

export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return [];
    const all = await ctx.db
      .query("ebCategories")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
      .collect();
    return all.filter((c) => c.archivedAt !== undefined);
  },
});

/**
 * Log a tending event. Only the category's tender can do this: shared
 * visibility, not shared control.
 */
export const tend = mutation({
  args: {
    categoryId: v.id("ebCategories"),
    note: v.optional(v.string()),
    /** Optional back-dated time (e.g. "we did this Tuesday"). Never in the future. */
    tendedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    if (category.tenderId !== m.partner._id) {
      throw new Error("Only the tender of this category can mark it tended.");
    }
    const now = Date.now();
    const tendedAt = Math.min(args.tendedAt ?? now, now);
    const note = args.note?.trim() ? cleanText(args.note, 500, "Note") : undefined;
    await ctx.db.insert("ebTendingEvents", {
      householdId: m.household._id,
      categoryId: category._id,
      partnerId: m.partner._id,
      tendedAt,
      note,
    });
    if (category.lastTendedAt === undefined || tendedAt > category.lastTendedAt) {
      await ctx.db.patch(category._id, { lastTendedAt: tendedAt });
    }
  },
});

/** Either partner can leave a context note. It never alters freshness. */
export const addNote = mutation({
  args: { categoryId: v.id("ebCategories"), text: v.string() },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const category = await requireCategory(ctx, m, args.categoryId);
    await ctx.db.insert("ebCategoryNotes", {
      householdId: m.household._id,
      categoryId: category._id,
      partnerId: m.partner._id,
      text: cleanText(args.text, 500, "Note"),
      createdAt: Date.now(),
    });
  },
});

export const deleteNote = mutation({
  args: { noteId: v.id("ebCategoryNotes") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const note = await ctx.db.get(args.noteId);
    if (!note || note.householdId !== m.household._id) throw new Error("Note not found.");
    if (note.partnerId !== m.partner._id) throw new Error("You can only remove your own notes.");
    await ctx.db.delete(note._id);
  },
});
