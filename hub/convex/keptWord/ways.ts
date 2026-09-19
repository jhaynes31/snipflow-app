import { query } from "../_generated/server";
import { access, requireMe } from "../lib";

/**
 * Ways to show up. Private to the viewer, about their partner, drawn only
 * from what the partner has already shared: their Love Menu, their shared
 * manual sections, their asks, and love actions the viewer has logged.
 * Specific and plain, never a score. The partner's private data never
 * feeds it.
 */
export const forMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    if (!me.partner) return null;
    const partner = me.partner;
    const menu = (await ctx.db.query("tendLoveMenu").withIndex("by_owner", (q) => q.eq("ownerId", partner._id)).collect()).filter((m) => access(me, m) === "full");
    const actions = await ctx.db.query("tendLoveActions").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(200);
    const lastByText = new Map<string, number>();
    for (const a of actions) if (!lastByText.has(a.itemText)) lastByText.set(a.itemText, a.createdAt);
    const sections = (await ctx.db.query("userManualSections").withIndex("by_owner", (q) => q.eq("ownerId", partner._id)).collect())
      .filter((s) => (s.key === "howToLoveMe" || s.key === "whatHelps") && s.body.trim())
      .map((s): { key: string; body: string } | null => {
        const a = access(me, s);
        if (a === "full") return { key: s.key, body: s.body };
        if (a === "summary" && s.summary) return { key: s.key, body: s.summary };
        return null;
      })
      .filter((s): s is { key: string; body: string } => s !== null);
    const asks = await ctx.db.query("kwAsks").withIndex("by_to_time", (q) => q.eq("toProfileId", me.profile._id)).order("desc").take(20);
    return {
      partnerName: partner.displayName,
      menu: menu.map((m) => ({ text: m.text, column: m.column, lastDone: lastByText.get(m.text) ?? null })),
      sections,
      openAsks: asks.filter((a) => !a.answer).map((a) => ({ _id: a._id, text: a.text, createdAt: a.createdAt })),
      notNowAsks: asks.filter((a) => a.answer === "notNow").map((a) => ({ _id: a._id, text: a.text, answeredAt: a.answeredAt ?? a.createdAt })),
    };
  },
});
