import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanCadence, cleanText, currentMembership, requireCommitment, requireMembership } from "./lib";
import { isAssignee, uniqueIds } from "./tenders";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const m = await currentMembership(ctx);
    if (!m) return { open: [], done: [] };
    const all = await ctx.db
      .query("ebCommitments")
      .withIndex("by_household", (q) => q.eq("householdId", m.household._id))
      .collect();
    const open = all
      .filter((c) => c.status === "proposed" || c.status === "agreed" || c.status === "active")
      .sort((a, b) => b.createdAt - a.createdAt);
    // The archive is kept deliberately low-key: most recent few, newest first.
    const done = all
      .filter((c) => c.status === "done")
      .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
      .slice(0, 30);
    return { open, done };
  },
});

/**
 * Either partner can propose, for themselves, for the other partner, or for
 * both. Proposing counts as your own agreement; the item only goes active
 * once every other assignee has agreed too.
 */
export const propose = mutation({
  args: {
    title: v.string(),
    assignedToIds: v.array(v.id("ebPartners")),
    targetWindowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const assignedToIds = uniqueIds(args.assignedToIds);
    if (assignedToIds.length === 0) throw new ConvexError("Pick who this is for.");
    for (const id of assignedToIds) {
      const assignee = await ctx.db.get(id);
      if (!assignee || assignee.householdId !== m.household._id) {
        throw new ConvexError("Assignees must be partners in your household.");
      }
    }
    const now = Date.now();
    const targetWindowDays =
      args.targetWindowDays === undefined ? undefined : cleanCadence(args.targetWindowDays);
    const needsAgreement = assignedToIds.some((id) => id !== m.partner._id);
    return await ctx.db.insert("ebCommitments", {
      householdId: m.household._id,
      title: cleanText(args.title, 120, "Title"),
      proposedBy: m.partner._id,
      assignedToIds,
      status: needsAgreement ? "proposed" : "active",
      createdAt: now,
      agreedAt: needsAgreement ? undefined : now,
      activatedAt: needsAgreement ? undefined : now,
      lastTendedAt: needsAgreement ? undefined : now,
      targetWindowDays,
    });
  },
});

/**
 * Only the assigned partner can agree. Agreement is what activates the
 * commitment, so this records "we agreed to this" rather than one partner
 * assigning a task to the other.
 */
export const agree = mutation({
  args: { commitmentId: v.id("ebCommitments") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status !== "proposed") throw new ConvexError("This commitment isn't waiting for agreement.");
    if (!isAssignee(c, m.partner._id) || c.proposedBy === m.partner._id) {
      throw new ConvexError("Only the partner it's proposed to can agree to it.");
    }
    const now = Date.now();
    await ctx.db.patch(c._id, {
      status: "active",
      agreedAt: now,
      activatedAt: now,
      lastTendedAt: now,
    });
  },
});

/** The assignee can pass on a proposal; the proposer can withdraw it. */
export const decline = mutation({
  args: { commitmentId: v.id("ebCommitments") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status !== "proposed") throw new ConvexError("Only a proposal can be declined or withdrawn.");
    if (!isAssignee(c, m.partner._id) && c.proposedBy !== m.partner._id) {
      throw new ConvexError("You can't decline this commitment.");
    }
    await ctx.db.patch(c._id, { status: "declined" });
  },
});

/** A light check-in while active; keeps the commitment from withering. Assignee only. */
export const tend = mutation({
  args: { commitmentId: v.id("ebCommitments") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status !== "active" && c.status !== "agreed") throw new ConvexError("This commitment isn't active.");
    if (!isAssignee(c, m.partner._id)) throw new ConvexError("Only an assigned partner can check in on it.");
    await ctx.db.patch(c._id, { status: "active", lastTendedAt: Date.now() });
  },
});

/** Marking done archives the commitment for good; it never resets. Assignee only. */
export const markDone = mutation({
  args: { commitmentId: v.id("ebCommitments") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status !== "active" && c.status !== "agreed") throw new ConvexError("This commitment isn't active.");
    if (!isAssignee(c, m.partner._id)) throw new ConvexError("Only an assigned partner can mark it done.");
    await ctx.db.patch(c._id, { status: "done", doneAt: Date.now() });
  },
});

export const updateTitle = mutation({
  args: { commitmentId: v.id("ebCommitments"), title: v.string() },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status === "done") throw new ConvexError("Completed commitments are archived.");
    if (c.proposedBy !== m.partner._id && !isAssignee(c, m.partner._id)) {
      throw new ConvexError("You can't edit this commitment.");
    }
    await ctx.db.patch(c._id, { title: cleanText(args.title, 120, "Title") });
  },
});
