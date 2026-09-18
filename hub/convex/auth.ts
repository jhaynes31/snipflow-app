import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { MutationCtx } from "./_generated/server";
import { MAX_ACCOUNTS } from "./lib";

/**
 * There is no public sign-up. The Hub allows exactly two accounts, and when
 * `HUB_ALLOWED_EMAILS` is set on the deployment, only those addresses can
 * create one. Both checks run here, in the database layer, before a user row
 * exists.
 */
function allowedEmails(): string[] | null {
  const raw = process.env.HUB_ALLOWED_EMAILS;
  if (!raw) return null;
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      validatePasswordRequirements(password) {
        if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx: MutationCtx, args) {
      if (args.existingUserId) return args.existingUserId;

      const email = args.profile.email?.toLowerCase();
      if (!email) throw new Error("An email address is needed to sign in.");

      const allowed = allowedEmails();
      if (allowed && !allowed.includes(email)) {
        throw new Error("This Hub is private. That email isn't one of its two accounts.");
      }

      const existing = await ctx.db.query("users").collect();
      if (existing.length >= MAX_ACCOUNTS) {
        throw new Error("This Hub already has its two accounts. Sign in instead.");
      }

      return await ctx.db.insert("users", {
        email,
        emailVerificationTime: args.profile.emailVerified ? Date.now() : undefined,
      });
    },
  },
});
