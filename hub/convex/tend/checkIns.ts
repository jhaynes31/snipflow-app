import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { emitEvent } from "../events";
import { setGentleMode } from "../gentleMode";
import { optionalText, requireMe } from "../lib";
import { helpKind, weatherKind } from "../schema";
import { answerFor } from "./pure";

/**
 * Tend's fuller check-in. Writes the same `checkIns` row the shell used,
 * with the extra fields, and emits `checkin.low` / `checkin.revved`. It
 * never sends a heads-up or turns anything on by itself.
 */
export const record = mutation({
  args: {
    weather: weatherKind,
    energy: v.number(),
    kinds: v.array(v.string()),
    need: v.optional(helpKind),
    note: v.optional(v.string()),
    justLogging: v.optional(v.boolean()),
    turnGentleOff: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const energy = Math.min(5, Math.max(1, Math.round(args.energy)));
    const answer = answerFor(args.weather);
    const id = await ctx.db.insert("checkIns", {
      ownerId: me.profile._id,
      visibility: "private",
      answer,
      weather: args.weather,
      energy,
      kinds: args.kinds.slice(0, 12),
      need: args.need,
      note: optionalText(args.note, 1000, "Note"),
      justLogging: args.justLogging ?? false,
      createdAt: Date.now(),
    });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "tend",
      name: `checkin.${answer}`,
      payload: { checkInId: id, weather: args.weather, energy, kinds: args.kinds },
    });
    if (energy >= 4) {
      await emitEvent(ctx, { ownerId: me.profile._id, source: "tend", name: "checkin.revved", payload: { checkInId: id, energy } });
    }
    if (args.turnGentleOff) await setGentleMode(ctx, me.profile._id, false);
    return { id, answer };
  },
});
