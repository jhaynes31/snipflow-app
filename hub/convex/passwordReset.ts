import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { partnerOf, profileForUser } from "./lib";

/**
 * Password reset (2026-10-29). The code itself is made and checked by
 * Convex Auth (auth.ts, the `reset` provider). Here: the code is kept for
 * fifteen minutes so that, when email isn't connected yet, the other one
 * of you can read it out from their Settings. Once email is connected, the
 * code goes to the inbox and is never shown to anyone.
 */
export function emailConnected(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export const store = internalMutation({
  args: { email: v.string(), code: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const old = await ctx.db.query("passwordResets").withIndex("by_email", (q) => q.eq("email", args.email)).collect();
    for (const row of old) await ctx.db.delete(row._id);
    await ctx.db.insert("passwordResets", { email: args.email, code: args.code, expiresAt: args.expiresAt, createdAt: Date.now() });
  },
});

/** For the sign-in page: how a reset code arrives here. Public; says nothing about anyone. */
export const how = query({
  args: {},
  handler: async () => ({ email: emailConnected() }),
});

/**
 * For Settings: a reset code waiting for the partner, shown only while
 * email isn't connected. Expired codes are ignored.
 */
export const forPartner = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await profileForUser(ctx, userId);
    if (!profile) return null;
    const partner = await partnerOf(ctx, profile);
    if (!partner) return { partnerName: null, email: emailConnected(), code: null as string | null, expiresAt: null as number | null };
    const partnerUser = await ctx.db.get(partner.userId);
    const address = partnerUser?.email?.toLowerCase() ?? null;
    if (emailConnected() || !address) return { partnerName: partner.displayName, email: emailConnected(), code: null, expiresAt: null };
    const rows = await ctx.db.query("passwordResets").withIndex("by_email", (q) => q.eq("email", address)).collect();
    const live = rows.filter((r) => r.expiresAt > Date.now()).sort((a, b) => b.createdAt - a.createdAt)[0];
    return { partnerName: partner.displayName, email: false, code: live?.code ?? null, expiresAt: live?.expiresAt ?? null };
  },
});
