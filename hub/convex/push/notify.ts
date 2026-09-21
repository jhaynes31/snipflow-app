import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { internalMutation, type MutationCtx } from "../_generated/server";
import { firstName, partnerOf, type Me } from "../lib";
import { hourIn, isQuietHour } from "./pure";

/**
 * "Tell the other one." A notification goes out only when the recipient
 * turned notifications on, and not during their quiet hours unless it is
 * urgent. The text is short and says only what the recipient would see in
 * the app anyway. Delivery happens in push/send.ts, after this transaction.
 */
export interface Notice {
  title: string;
  body: string;
  /** Where a tap lands, inside The Shire. */
  url: string;
  /** Same tag replaces an earlier notification instead of stacking. */
  tag?: string;
  urgent?: boolean;
}

export async function notify(ctx: MutationCtx, to: Id<"profiles">, n: Notice): Promise<boolean> {
  const p = await ctx.db.get(to);
  if (!p || !p.reminders.pushEnabled) return false;
  if (!n.urgent && isQuietHour(hourIn(p.timeZone), p.reminders.quietHoursStart, p.reminders.quietHoursEnd)) return false;
  await ctx.scheduler.runAfter(0, internal.push.send.deliver, {
    profileId: to,
    title: n.title.slice(0, 80),
    body: n.body.slice(0, 160),
    url: n.url,
    tag: n.tag,
    urgent: n.urgent ?? false,
  });
  return true;
}

export async function notifyPartner(ctx: MutationCtx, me: Me, n: Notice): Promise<boolean> {
  if (!me.partner) return false;
  return await notify(ctx, me.partner._id, n);
}

/** The sender's first name, for titles like "A heads-up from Jen". */
export function who(me: Me): string {
  return firstName(me.profile.displayName);
}

/** For actions (Seasons): notify one person. */
export const send = internalMutation({
  args: { profileId: v.id("profiles"), title: v.string(), body: v.string(), url: v.string(), tag: v.optional(v.string()), urgent: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    return await notify(ctx, args.profileId, args);
  },
});

/** For actions (Seasons): notify a person and their partner. */
export const sendBoth = internalMutation({
  args: { profileId: v.id("profiles"), title: v.string(), body: v.string(), url: v.string(), tag: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const p = await ctx.db.get(args.profileId);
    if (!p) return;
    await notify(ctx, p._id, args);
    const partner = await partnerOf(ctx, p);
    if (partner) await notify(ctx, partner._id, args);
  },
});
