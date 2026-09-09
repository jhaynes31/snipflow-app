import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { setResponseStatus } from "@tanstack/react-start/server";
import {
  endSession,
  isAuthConfigured,
  isAuthenticated,
  loginThrottle,
  passwordMatches,
  startSession,
} from "./auth.server";

/**
 * Shared password gate for John's private tools (the lead dashboard and the
 * content generators).
 *
 *  - `requireAdmin` is a server function middleware. Every private server
 *    function attaches it, so the check happens on the server even if someone
 *    calls the function endpoint directly, without ever loading a page.
 *  - `getAuthStatus` backs the `_admin` layout route's `beforeLoad`, which
 *    redirects anonymous visitors to /login before any private page renders.
 *  - `loginWithPassword` / `logout` set and clear a signed, HttpOnly cookie.
 *
 * The cookie, signing, and throttle mechanics live in ./auth.server.ts so
 * that nothing server only is referenced outside a handler. Public server
 * functions (the quiz's saveLead) deliberately do NOT use requireAdmin.
 */

// ── Middleware ─────────────────────────────────────────────────────

/**
 * Attach to every private server function:
 *   createServerFn().middleware([requireAdmin]).handler(...)
 * Rejects with HTTP 401 when the request has no valid admin session.
 */
export const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    if (!(await isAuthenticated())) {
      setResponseStatus(401);
      throw new Error("Unauthorized: sign in at /login to use this tool.");
    }
    return next();
  },
);

// ── Server functions ───────────────────────────────────────────────

export interface AuthStatus {
  authenticated: boolean;
  configured: boolean;
}

/** Used by the `_admin` layout route to decide whether to redirect to /login. */
export const getAuthStatus = createServerFn().handler(
  async (): Promise<AuthStatus> => ({
    authenticated: await isAuthenticated(),
    configured: isAuthConfigured(),
  }),
);

export interface LoginResult {
  ok: boolean;
  error?: string;
  /** Seconds until this address may try again, when throttled. */
  retryInSeconds?: number;
}

export const loginWithPassword = createServerFn({ method: "POST" })
  .validator((input: { password: string }) => ({
    password: typeof input?.password === "string" ? input.password : "",
  }))
  .handler(async ({ data }): Promise<LoginResult> => {
    if (!isAuthConfigured()) {
      setResponseStatus(503);
      return {
        ok: false,
        error:
          "Sign in is not configured yet. Set ADMIN_PASSWORD in the server environment and restart.",
      };
    }
    const key = loginThrottle.key();
    const wait = loginThrottle.remainingMs(key);
    if (wait > 0) {
      setResponseStatus(429);
      return {
        ok: false,
        error: "Too many attempts. Please wait a minute and try again.",
        retryInSeconds: Math.ceil(wait / 1000),
      };
    }
    if (!passwordMatches(data.password)) {
      loginThrottle.recordFailure(key);
      // A short fixed delay on failure slows down scripted guessing.
      await new Promise((r) => setTimeout(r, 400));
      setResponseStatus(401);
      return { ok: false, error: "That password is not correct." };
    }
    loginThrottle.clear(key);
    await startSession();
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean }> => {
    endSession();
    return { ok: true };
  },
);
