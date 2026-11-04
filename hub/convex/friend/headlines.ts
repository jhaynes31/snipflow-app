import { internalMutation } from "../_generated/server";
import { roomOwnerOf } from "../rooms";
import { readFriendSettings, todayKey, type ShareTab } from "./pure";

/**
 * Weekly headlines (Monday, crons.ts): one plain line per place she turned
 * on, built from counts only, never from the words inside. Tend and
 * Re-Centered are off unless she turns them on. Nothing flows back.
 */
export const weekly = internalMutation({
  args: {},
  handler: async (ctx) => {
    const owner = await roomOwnerOf(ctx, "friend");
    if (!owner) return;
    const profile = await ctx.db.get(owner.ownerId);
    if (!profile) return;
    const { shares } = readFriendSettings(profile.moduleSettings);
    const since = Date.now() - 7 * 86_400_000;
    const week = todayKey().slice(0, 10);
    const id = profile._id;
    const lines: { tab: ShareTab; text: string }[] = [];

    if (shares["every-box"]) {
      const partner = await ctx.db.query("ebPartners").withIndex("by_profile", (q) => q.eq("profileId", id)).first();
      if (partner) {
        const events = (await ctx.db.query("ebTendingEvents").withIndex("by_household", (q) => q.eq("householdId", partner.householdId).gte("tendedAt", since)).collect()).filter((e) => e.partnerId === partner._id);
        if (events.length) lines.push({ tab: "every-box", text: `She tended ${events.length} ${events.length === 1 ? "box" : "boxes"} this week in Every Box.` });
      }
    }
    const convos = (await ctx.db.query("coachConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("updatedAt", since)).collect());
    if (shares.coach) {
      const n = convos.filter((c) => !c.task?.startsWith("hearth.")).length;
      if (n) lines.push({ tab: "coach", text: `She talked things through with the coach ${n === 1 ? "once" : `${n} times`} this week.` });
    }
    if (shares.hearth) {
      const n = convos.filter((c) => c.task?.startsWith("hearth.")).length;
      if (n) lines.push({ tab: "hearth", text: `She spent time at The Hearth with Mom or Dad ${n === 1 ? "once" : `${n} times`} this week.` });
    }
    if (shares.rooted) {
      const checks = (await ctx.db.query("rtChecks").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()).length;
      if (checks) lines.push({ tab: "rooted", text: "She's been working on attachment stuff in Rooted this week." });
    }
    if (shares.orchard) {
      const moves = (await ctx.db.query("orMoves").withIndex("by_owner", (q) => q.eq("ownerId", id)).collect()).filter((m) => m.createdAt >= since).length;
      if (moves) lines.push({ tab: "orchard", text: "She's been sorting out a friendship or two in The Orchard this week." });
    }
    if (shares["kept-word"]) {
      const words = (await ctx.db.query("kwWords").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()).length;
      if (words) lines.push({ tab: "kept-word", text: `She gave ${words === 1 ? "a word" : `${words} words`} in Kept Word this week.` });
    }
    if (shares.tend) {
      const signals = (await ctx.db.query("tnSignals").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()).length;
      if (signals) lines.push({ tab: "tend", text: "She had a hard moment or two this week and reached for Tend." });
    }
    for (const l of lines) {
      await ctx.db.insert("frHeadlines", { ownerId: id, visibility: "private", sourceTab: l.tab, week, headline: l.text, sharedVia: "weekly", createdAt: Date.now() });
    }
  },
});
