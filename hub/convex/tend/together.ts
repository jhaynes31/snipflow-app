import { query } from "../_generated/server";
import { requireMe } from "../lib";
import { readTendSettings } from "./pure";

/**
 * The monthly "How are we doing?" view. Only what both have chosen to
 * share: love actions done, "I saw you" notes, upcoming tender week (if
 * shared), and each person's most helpful tools (if that person shares
 * them). No scores, no comparisons between the two.
 */
export const monthly = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const since = Date.now() - 30 * 86_400_000;
    const ids = [me.profile._id, ...(me.partner ? [me.partner._id] : [])];

    let loveActions = 0;
    let notes = 0;
    for (const id of ids) {
      loveActions += (await ctx.db.query("tendLoveActions").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()).length;
      notes += (await ctx.db.query("tendNotes").withIndex("by_to_time", (q) => q.eq("toProfileId", id).gte("createdAt", since)).collect()).length;
    }

    const helpful: { name: string; tools: string[] }[] = [];
    for (const person of [me.profile, me.partner].filter((p): p is NonNullable<typeof p> => !!p)) {
      const share = person._id === me.profile._id ? true : readTendSettings(person.moduleSettings).shareToolHelps;
      if (!share) continue;
      const uses = await ctx.db.query("tendToolUses").withIndex("by_owner_time", (q) => q.eq("ownerId", person._id).gte("startedAt", since)).collect();
      const counts: Record<string, number> = {};
      for (const u of uses) if (u.helped === "aLot" || u.helped === "little") counts[u.tool] = (counts[u.tool] ?? 0) + (u.helped === "aLot" ? 2 : 1);
      const tools = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t);
      helpful.push({ name: person.displayName, tools });
    }

    let repairs = 0;
    for (const id of ids) {
      repairs += (await ctx.db.query("tendRepairs").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("updatedAt", since)).collect()).length;
    }

    return { loveActions, notes, helpful, repairs, since };
  },
});
