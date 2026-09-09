import { createMiddleware, createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequest,
  getRequestHeader,
  getRequestIP,
  setCookie,
  setResponseStatus,
} from "@tanstack/react-start/server";

/**
 * Shared password gate for John's private tools (the lead dashboard and the
 * content generators). Everything here runs on the server only:
 *
 *  - `requireAdmin` is a server function middleware. Every private server
 *    function attaches it, so the check happens on the server even if someone
 *    calls the function endpoint directly, without ever loading a page.
 *  - `getAuthStatus` backs the `_admin` layout route's `beforeLoad`, which
 *    redirects anonymous visitors to /login before any private page renders.
 *  - `loginWithPassword` / `logout` set and clear a signed, HttpOnly cookie.
 *
 * Configuration (see .env.example):
 *   ADMIN_PASSWORD  required. The shared password John types at /login.
 *   AUTH_SECRET     optional. Key used to sign the session cookie. When it is
 *                   not set, a key is derived from ADMIN_PASSWORD, so changing
 *                   the password also signs everyone out.
 *
 * Public server functions (the quiz's saveLead) deliberately do NOT use this
 * middleware: visitors must be able to submit the quiz without signing in.
 */

const COOKIE_NAME = "fdm_admin";
const SESSION_DAYS = 14;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

// ── Password + signing key ─────────────────────────────────────────

function adminPassword(): string {
  return (process.env.ADMIN_PASSWORD || "").trim();
}

export function isAuthConfigured(): boolean {
  return adminPassword().length > 0;
}

const encoder = new TextEncoder();

async function signingKey(): Promise<CryptoKey> {
  const secret = (process.env.AUTH_SECRET || "").trim();
  const material = secret
    ? `fdm-auth-secret:${secret}`
    : `fdm-auth-derived:${adminPassword()}`;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(material));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (const b of view) out += b.toString(16).padStart(2, "0");
  return out;
}

async function hmacHex(payload: string): Promise<string> {
  const key = await signingKey();
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(sig);
}

/** Constant time string comparison so timing does not leak how close a guess was. */
function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) {
    diff |= (ab[i % ab.length] ?? 0) ^ (bb[i % bb.length] ?? 0);
  }
  return diff === 0;
}

// ── Session token ──────────────────────────────────────────────────
// Token shape: `<expiresAtMs>.<nonce>.<hmac(expiresAtMs.nonce)>`

async function issueToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_MS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiresAt}.${nonce}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiresRaw, nonce, sig] = parts;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const expected = await hmacHex(`${expiresRaw}.${nonce}`);
  return safeEqual(expected, sig);
}

/** True when the current request carries a valid admin session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  try {
    return await verifyToken(getCookie(COOKIE_NAME));
  } catch {
    return false;
  }
}

function requestIsHttps(): boolean {
  const forwarded = (getRequestHeader("x-forwarded-proto") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (forwarded) return forwarded === "https";
  try {
    return new URL(getRequest().url).protocol === "https:";
  } catch {
    return false;
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: requestIsHttps(),
    path: "/",
  };
}

// ── Login throttle ─────────────────────────────────────────────────
// Small in memory throttle per client address: after a handful of wrong
// passwords the address waits before it may try again. Memory resets on a
// cold start, which is fine for a single owner tool; it only needs to make
// brute forcing impractical, not impossible.

const MAX_FAILS = 5;
const LOCK_MS = 60_000;
const failures = new Map<string, { count: number; lockedUntil: number }>();

function clientKey(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) || "unknown";
  } catch {
    return "unknown";
  }
}

function lockRemainingMs(key: string): number {
  const rec = failures.get(key);
  if (!rec) return 0;
  return Math.max(0, rec.lockedUntil - Date.now());
}

function recordFailure(key: string): void {
  const rec = failures.get(key) ?? { count: 0, lockedUntil: 0 };
  rec.count += 1;
  if (rec.count >= MAX_FAILS) {
    rec.count = 0;
    rec.lockedUntil = Date.now() + LOCK_MS;
  }
  failures.set(key, rec);
}

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
    const key = clientKey();
    const wait = lockRemainingMs(key);
    if (wait > 0) {
      setResponseStatus(429);
      return {
        ok: false,
        error: "Too many attempts. Please wait a minute and try again.",
        retryInSeconds: Math.ceil(wait / 1000),
      };
    }
    if (!safeEqual(data.password, adminPassword())) {
      recordFailure(key);
      // A short fixed delay on failure slows down scripted guessing.
      await new Promise((r) => setTimeout(r, 400));
      setResponseStatus(401);
      return { ok: false, error: "That password is not correct." };
    }
    failures.delete(key);
    setCookie(COOKIE_NAME, await issueToken(), {
      ...cookieOptions(),
      maxAge: Math.floor(SESSION_MS / 1000),
    });
    return { ok: true };
  });

export const logout = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean }> => {
    deleteCookie(COOKIE_NAME, cookieOptions());
    return { ok: true };
  },
);
