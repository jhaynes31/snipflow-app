import { ConvexError } from "convex/values";
import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

/** Members sign in with email and password. Drop-ins never need an account. */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return { email: String(params.email ?? "").trim().toLowerCase(), ...(name ? { name } : {}) };
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) throw new ConvexError("Use a password of at least 8 characters.");
      },
    }),
  ],
});
