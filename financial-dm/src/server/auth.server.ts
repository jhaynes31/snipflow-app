import {
  deleteCookie,
  getCookie,
  getRequest,
  getRequestHeader,
  getRequestIP,
  setCookie,
} from "@tanstack/react-start/server";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "~/db";

/**
 * Server only session helpers behind the shared password gate. This module
 * imports request/response utilities that must never reach the browser, so
 * it is only ever imported from inside server function handlers and
 * middleware (see ./auth.ts), never from route or component code.
 *
 * Configuration (see .env.example):
 *   ADMIN_PASSWORD  required. The starting password, and the recovery
 *                   password (see below).
 *   AUTH_SECRET     optional. Key used to sign the session cookie. When it is
 *                   not set, a key is derived from ADMIN_PASSWORD.
 *
 * Changing the password: the /change-password page stores a new password
 * (hashed with scrypt) in the admin_settings table, and that stored password
 * takes over from ADMIN_PASSWORD. Every session token carries a password
 * version, so changing the password signs out every other device.
 *
 * Forgotten password: set a NEW value for ADMIN_PASSWORD in Vercel and
 * redeploy. The next sign in with that new value is recognised as a recovery
 * (the stored override remembers which ADMIN_PASSWORD was in force when it
 * was set, so only a changed one counts), the override is cleared, and the
 * new ADMIN_PASSWORD is the password again.
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

// ── Stored password (admin_settings) ───────────────────────────────

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

async function sha256Hex(text: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function verifyHash(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = stored.split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

interface StoredPassword {
  hash: string;
  /** SHA-256 of the ADMIN_PASSWORD that was in force when this was saved. */
  envSnapshot: string;
  /** Random id baked into session tokens; changes whenever the password does. */
  version: string;
}

let tableReady: Promise<void> | null = null;
function ensureSettingsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql()`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `.then(() => undefined).catch((e) => {
      tableReady = null;
      throw e;
    });
  }
  return tableReady;
}

const CACHE_MS = 30_000;
let cache: { at: number; value: StoredPassword | null } | null = null;

async function loadStoredPassword(): Promise<StoredPassword | null> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  let value: StoredPassword | null = null;
  try {
    await ensureSettingsTable();
    const rows = (await sql()`SELECT key, value FROM admin_settings WHERE key IN ('password_hash', 'env_snapshot', 'password_version')`) as Array<{ key: string; value: string }>;
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const hash = map.get("password_hash");
    if (hash) {
      value = { hash, envSnapshot: map.get("env_snapshot") ?? "", version: map.get("password_version") ?? "custom" };
    }
  } catch (e) {
    // Without the database the site falls back to ADMIN_PASSWORD only.
    console.error("[auth] could not read the stored password", e);
    if (!process.env.DATABASE_URL) value = null;
    else return cache?.value ?? null;
  }
  cache = { at: Date.now(), value };
  return value;
}

/** True when John has set his own password from the site (not the Vercel one). */
export async function hasCustomPassword(): Promise<boolean> {
  return (await loadStoredPassword()) !== null;
}

/** Save a new password chosen on the site. It takes over from ADMIN_PASSWORD at once. */
export async function setAdminPassword(newPassword: string): Promise<void> {
  await ensureSettingsTable();
  const hash = await hashPassword(newPassword);
  const envSnapshot = await sha256Hex(adminPassword());
  const version = toHex(crypto.getRandomValues(new Uint8Array(8)));
  for (const [key, value] of [["password_hash", hash], ["env_snapshot", envSnapshot], ["password_version", version]] as const) {
    await sql()`
      INSERT INTO admin_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;
  }
  cache = null;
}

async function clearStoredPassword(): Promise<void> {
  await ensureSettingsTable();
  await sql()`DELETE FROM admin_settings WHERE key IN ('password_hash', 'env_snapshot', 'password_version')`;
  cache = null;
}

/** The password version stamped into session tokens. */
async function passwordVersion(): Promise<string> {
  return (await loadStoredPassword())?.version ?? "env";
}

// ── Session token ──────────────────────────────────────────────────
// Token shape: `<expiresAtMs>.<nonce>.<passwordVersion>.<hmac(expiresAtMs.nonce.passwordVersion)>`

async function issueToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_MS;
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${expiresAt}.${nonce}.${await passwordVersion()}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

async function verifyToken(token: string | undefined): Promise<boolean> {
  if (!token || !isAuthConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [expiresRaw, nonce, version, sig] = parts;
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig) || !/^[0-9a-z]{1,32}$/.test(version)) return false;
  // A token from before a password change carries the old version and dies here.
  if (version !== (await passwordVersion())) return false;
  const expected = await hmacHex(`${expiresRaw}.${nonce}.${version}`);
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


// ── Session cookie + throttle API used by ./auth.ts ───────────────

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_MS / 1000);

/** Set a fresh signed session cookie on the current response. */
export async function startSession(): Promise<void> {
  setCookie(COOKIE_NAME, await issueToken(), {
    ...cookieOptions(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clear the session cookie on the current response. */
export function endSession(): void {
  deleteCookie(COOKIE_NAME, cookieOptions());
}

/**
 * Check a submitted password. The password John set on the site wins when
 * there is one; otherwise ADMIN_PASSWORD. A freshly changed ADMIN_PASSWORD
 * (different from the one in force when the site password was saved) is
 * the recovery path: it signs in, clears the site password, and becomes
 * the password again.
 */
export async function passwordMatches(candidate: string): Promise<boolean> {
  const stored = await loadStoredPassword();
  if (!stored) return safeEqual(candidate, adminPassword());
  if (await verifyHash(candidate, stored.hash)) return true;
  const envChanged = (await sha256Hex(adminPassword())) !== stored.envSnapshot;
  if (envChanged && safeEqual(candidate, adminPassword())) {
    console.warn("[auth] recovery sign in with a new ADMIN_PASSWORD; clearing the site password");
    await clearStoredPassword();
    return true;
  }
  return false;
}

export const loginThrottle = {
  key: clientKey,
  remainingMs: lockRemainingMs,
  recordFailure,
  clear: (key: string) => {
    failures.delete(key);
  },
};
