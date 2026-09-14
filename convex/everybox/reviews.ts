import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { computeFreshness, stageChanged, type StageIndex } from "./freshness";
import type { Id } from "../_generated/dataModel";
import { currentMembership, requireMembership, type Ctx } from "./lib";

async function latestReview(ctx: Ctx, householdId: Id<"ebHouseholds">) {
  return await ctx.db
    .query("ebWeeklyReviews")
    .withIndex("by_household", (q) => q.eq("householdId", householdId))
    .order("desc")
    .first();
}

/**
 * The guided review only surfaces categories that *changed* since the last
 * review: tended, annotated, created, or drifted to a different stage.
 * Everything else is left alone so the whole ritual stays under two minutes.
 */
export const pending = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return null;
    const now = Date.now();
    const last = await latestReview(ctx, m.household._id);
    const since = last?.completedAt ?? 0;
    const snapshot = new Map<string, StageIndex>();
    for (const a of last?.acknowledgements ?? []) {
      snapshot.set(a.categoryId, a.stageAtReview as StageIndex);
    }

    const categories = (
      await ctx.db
        .query("ebCategories")
        .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
        .collect()
    ).filter((c) => c.archivedAt === undefined);

    const recentEvents = await ctx.db
      .query("ebTendingEvents")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id).gt("tendedAt", since))
      .collect();
    const recentNotes = await ctx.db
      .query("ebCategoryNotes")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id).gt("createdAt", since))
      .collect();

    const touched = new Set<string>();
    for (const e of recentEvents) touched.add(e.categoryId);
    for (const n of recentNotes) touched.add(n.categoryId);

    const surfaced = categories
      .map((c) => {
        const fresh = computeFreshness(c.lastTendedAt, c.idealCadenceDays, now);
        const before = snapshot.get(c._id);
        const reasons: string[] = [];
        if (c.createdAt > since) reasons.push("new");
        if (touched.has(c._id)) reasons.push("activity");
        if (!reasons.includes("new") && stageChanged(before, fresh.stage)) reasons.push("stage");
        return { category: c, stage: fresh.stage, previousStage: before ?? null, reasons };
      })
      .filter((x) => x.reasons.length > 0);

    return {
      lastReviewAt: last?.completedAt ?? null,
      totalCategories: categories.length,
      surfaced,
    };
  },
});

export const complete = mutation({
  args: {
    answers: v.array(
      v.object({
        categoryId: v.id("ebCategories"),
        answer: v.union(v.literal("yes"), v.literal("partial"), v.literal("no")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const now = Date.now();
    const categories = (
      await ctx.db
        .query("ebCategories")
        .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
        .collect()
    ).filter((c) => c.archivedAt === undefined);

    const answered = new Map(args.answers.map((a) => [a.categoryId, a.answer]));
    // Snapshot every live category so the next review can diff stages, even
    // for categories that weren't surfaced this time.
    const acknowledgements = categories.map((c) => ({
      categoryId: c._id,
      answer: answered.get(c._id) ?? ("skipped" as const),
      stageAtReview: computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage,
    }));

    const id = await ctx.db.insert("ebWeeklyReviews", {
      householdId: m.household._id,
      completedBy: m.partner._id,
      completedAt: now,
      acknowledgements,
    });
    await ctx.db.patch(m.household._id, { lastReviewAt: now });
    return id;
  },
});

export const history = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return [];
    return await ctx.db
      .query("ebWeeklyReviews")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
      .order("desc")
      .take(12);
  },
});
