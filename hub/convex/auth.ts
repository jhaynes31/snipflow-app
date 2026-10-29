import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { internal } from "./_generated/api";
import type { ActionCtx, MutationCtx } from "./_generated/server";
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

/** Six digits, from a good random source. */
async function sixDigits(): Promise<string> {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1_000_000).padStart(6, "0");
}

/**
 * "Forgot your password?" (2026-10-29, Jen's ask after being locked out).
 * The sign-in page asks for a code with the `reset` flow; this sends it. The
 * code goes by email when email is connected (Brevo, as for the rest of The
 * Shire's mail). Until then it is kept for fifteen minutes so the other one
 * of you can read it out from their Settings. It is then used once, with
 * the new password, in the `reset-verification` flow.
 */
const ShireReset = Email({
  id: "shire-reset",
  maxAge: 15 * 60,
  generateVerificationToken: sixDigits,
  sendVerificationRequest: async ({ identifier, token, expires }, ctx?: unknown) => {
    const actionCtx = ctx as ActionCtx;
    const email = identifier.toLowerCase();
    await actionCtx.runMutation(internal.passwordReset.store, { email, code: token, expiresAt: expires.getTime() });
    const key = process.env.BREVO_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!key || !from) return;
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME ?? "The Shire" },
        to: [{ email }],
        subject: `Your code to get back into The Shire: ${token}`,
        textContent: `Your code is ${token}. It works for fifteen minutes. Type it on the sign-in page with your new password. If you didn't ask for this, you can ignore it; nothing changes without the code.`,
        htmlContent: `<p style="font:16px/1.5 sans-serif">Your code is <strong style="font-size:22px;letter-spacing:2px">${token}</strong>.</p><p style="font:16px/1.5 sans-serif">It works for fifteen minutes. Type it on the sign-in page with your new password. If you didn't ask for this, you can ignore it; nothing changes without the code.</p>`,
      }),
    });
    if (!res.ok) console.error(`Password reset email: Brevo answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ShireReset,
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
