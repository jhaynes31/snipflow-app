import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { cleanCadence, cleanText, currentMembership, requireCommitment, requireMembership } from "./lib";

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

/** Either partner can propose, for themselves or for the other partner. */
export const propose = mutation({
  args: {
    title: v.string(),
    assignedTo: v.id("ebPartners"),
    targetWindowDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const assignee = await ctx.db.get(args.assignedTo);
    if (!assignee || assignee.householdId !== m.household._id) {
      throw new Error("The assignee must be a partner in your household.");
    }
    const now = Date.now();
    const targetWindowDays =
      args.targetWindowDays === undefined ? undefined : cleanCadence(args.targetWindowDays);
    const selfAssigned = assignee._id === m.partner._id;
    return await ctx.db.insert("ebCommitments", {
      householdId: m.household._id,
      title: cleanText(args.title, 120, "Title"),
      proposedBy: m.partner._id,
      assignedTo: assignee._id,
      // Proposing something for yourself is already an agreement.
      status: selfAssigned ? "active" : "proposed",
      createdAt: now,
      agreedAt: selfAssigned ? now : undefined,
      activatedAt: selfAssigned ? now : undefined,
      lastTendedAt: selfAssigned ? now : undefined,
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
    if (c.status !== "proposed") throw new Error("This commitment isn't waiting for agreement.");
    if (c.assignedTo !== m.partner._id) {
      throw new Error("Only the partner it's proposed to can agree to it.");
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
    if (c.status !== "proposed") throw new Error("Only a proposal can be declined or withdrawn.");
    if (c.assignedTo !== m.partner._id && c.proposedBy !== m.partner._id) {
      throw new Error("You can't decline this commitment.");
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
    if (c.status !== "active" && c.status !== "agreed") throw new Error("This commitment isn't active.");
    if (c.assignedTo !== m.partner._id) throw new Error("Only the assigned partner can check in on it.");
    await ctx.db.patch(c._id, { status: "active", lastTendedAt: Date.now() });
  },
});

/** Marking done archives the commitment for good; it never resets. Assignee only. */
export const markDone = mutation({
  args: { commitmentId: v.id("ebCommitments") },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status !== "active" && c.status !== "agreed") throw new Error("This commitment isn't active.");
    if (c.assignedTo !== m.partner._id) throw new Error("Only the assigned partner can mark it done.");
    await ctx.db.patch(c._id, { status: "done", doneAt: Date.now() });
  },
});

export const updateTitle = mutation({
  args: { commitmentId: v.id("ebCommitments"), title: v.string() },
  handler: async (ctx, args) => {
    const m = await requireMembership(ctx);
    const c = await requireCommitment(ctx, m, args.commitmentId);
    if (c.status === "done") throw new Error("Completed commitments are archived.");
    if (c.proposedBy !== m.partner._id && c.assignedTo !== m.partner._id) {
      throw new Error("You can't edit this commitment.");
    }
    await ctx.db.patch(c._id, { title: cleanText(args.title, 120, "Title") });
  },
});
