import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { currentMember, currentUser, includedLeft, isAdminEmail, requireMember } from "./lib";
import { INCLUDED_HOURS_PER_CYCLE } from "./rules";

/** The signed-in person's portal header: membership, hours, host flag. Never includes internal flags. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const member = await currentMember(ctx);
    const isAdmin = isAdminEmail(user.email);
    if (!member) return { needsProfile: true as const, isAdmin, email: user.email ?? "" };
    return {
      needsProfile: false as const,
      isAdmin,
      _id: member._id,
      name: member.name,
      email: member.email,
      membership: member.membership,
      cycleEnd: member.cycleEnd,
      includedHours: INCLUDED_HOURS_PER_CYCLE,
      includedLeft: includedLeft(member),
      extraHours: member.extraHours,
      priorityPaused: member.priorityPaused,
      noShowCount: member.noShowCount,
    };
  },
});

/** Called once after sign-up to make the member record. */
export const ensure = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Please sign in first.");
    const existing = await currentMember(ctx);
    if (existing) {
      if (name.trim()) await ctx.db.patch(existing._id, { name: name.trim() });
      return existing._id;
    }
    const user = await ctx.db.get(userId);
    return await ctx.db.insert("members", {
      userId,
      email: (user?.email ?? "").toLowerCase(),
      name: name.trim() || "Friend",
      membership: "none",
      includedHoursUsed: 0,
      extraHours: 0,
      noShowCount: 0,
      priorityPaused: false,
      scholarship: false,
      createdAt: Date.now(),
    });
  },
});

export const notices = query({
  args: {},
  handler: async (ctx) => {
    const member = await currentMember(ctx);
    if (!member) return [];
    const all = await ctx.db
      .query("notices")
      .withIndex("by_member", (q) => q.eq("memberId", member._id))
      .order("desc")
      .take(20);
    const out = [];
    for (const n of all) {
      if (n.dismissedAt) continue;
      const booking = n.bookingId ? await ctx.db.get(n.bookingId) : null;
      const session = booking ? await ctx.db.get(booking.sessionId) : null;
      out.push({
        _id: n._id,
        kind: n.kind,
        bookingId: n.bookingId,
        sessionTitle: session?.title,
        sessionStartsAt: session?.startsAt,
        createdAt: n.createdAt,
      });
    }
    return out;
  },
});

export const dismissNotice = mutation({
  args: { noticeId: v.id("notices") },
  handler: async (ctx, { noticeId }) => {
    const member = await requireMember(ctx);
    const notice = await ctx.db.get(noticeId);
    if (notice?.memberId !== member._id) return;
    await ctx.db.patch(noticeId, { dismissedAt: Date.now() });
  },
});
