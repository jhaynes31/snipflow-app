import { internalMutation } from "./_generated/server";
import { requestGoals } from "./bookings";
import { goalsDue, HOUR_MS, sessionHours } from "./rules";

export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_start", (q) => q.gte("startsAt", now - 24 * HOUR_MS).lte("startsAt", now + 49 * HOUR_MS))
      .collect();

    for (const s of sessions) {
      if (s.status !== "scheduled") continue;
      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_session", (q) => q.eq("sessionId", s._id))
        .collect();

      // Goals forms, 48 hours out.
      if (goalsDue(s.startsAt, now)) {
        for (const b of bookings) {
          if (b.status === "confirmed" && !b.goalsRequestedAt) await requestGoals(ctx, b._id);
        }
      }

      // Unpaid drop-in holds that ran out (Stripe's "expired" event normally gets there first).
      for (const b of bookings) {
        if (b.status === "pendingPayment" && (b.holdUntil ?? 0) < now) await ctx.db.patch(b._id, { status: "canceled" });
      }

      // Sessions that ended a few hours ago are done; people still on the waitlist come off it.
      if (s.startsAt + (sessionHours(s.blocks) + 6) * HOUR_MS < now) {
        for (const b of bookings) {
          if (b.status === "waitlisted") await ctx.db.patch(b._id, { status: "canceled" });
        }
        await ctx.db.patch(s._id, { status: "completed" });
      }
    }
  },
});
