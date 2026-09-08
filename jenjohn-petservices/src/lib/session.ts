/**
 * Server-side admin sessions.
 *
 * Before this module the browser set its own `admin_auth=true` cookie after a
 * successful password check and the server never looked at it, so every admin
 * action was open to anyone who knew the endpoint. Now:
 *
 *   - a successful password check issues an HttpOnly cookie whose value is
 *     signed with HMAC-SHA256 (the browser cannot forge or even read it);
 *   - every admin action verifies that signature and expiry before running;
 *   - sign-out clears the cookie server-side.
 *
 * The signing secret comes from SESSION_SECRET. When it is unset a random
 * per-process secret is used, which still keeps sessions unforgeable but logs
 * everyone out whenever the server restarts, so set it in production.
 *
 * Server-only: never import from client code.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 24 * 60 * 60;

let cachedSecret: Buffer | null = null;

function secret(): Buffer {
  if (cachedSecret) return cachedSecret;
  const configured = (process.env.SESSION_SECRET || "").trim();
  if (configured.length >= 16) {
    cachedSecret = Buffer.from(configured, "utf8");
  } else {
    console.warn(
      "[session] SESSION_SECRET is not set (or is shorter than 16 chars); using a random per-process secret. Admin sessions will not survive a server restart.",
    );
    cachedSecret = randomBytes(32);
  }
  return cachedSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

interface SessionPayload {
  /** Expiry, epoch seconds. */
  exp: number;
  /** Random nonce so two logins never share a value. */
  n: string;
}

/** Build a fresh signed session value. */
export function createSessionValue(now: number = Date.now()): string {
  const payload: SessionPayload = {
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    n: randomBytes(8).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/** True when the value carries a valid signature and has not expired. */
export function verifySessionValue(value: string | undefined | null, now: number = Date.now()): boolean {
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const encoded = value.slice(0, dot);
  const provided = value.slice(dot + 1);
  const expected = sign(encoded);
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}

/** Parse a Cookie header into a name -> value map (first occurrence wins). */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq).trim();
    if (!name || name in out) continue;
    let val = part.slice(eq + 1).trim();
    try {
      val = decodeURIComponent(val);
    } catch {
      /* keep raw */
    }
    out[name] = val;
  }
  return out;
}

/** Does this request carry a valid admin session cookie? */
export function requestHasSession(req: Request, now: number = Date.now()): boolean {
  const cookies = parseCookies(req.headers.get("cookie"));
  return verifySessionValue(cookies[SESSION_COOKIE], now);
}

/**
 * Only mark the cookie Secure when the request actually arrived over HTTPS
 * (directly or via a proxy's x-forwarded-proto). A Secure cookie on a plain
 * http:// preview is silently dropped by the browser and the login never
 * sticks, which is exactly the "logged out on refresh" symptom to avoid.
 */
function isSecureRequest(req: Request): boolean {
  const forwarded = (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return true;
  }
}

function cookieAttributes(req: Request, maxAge: number): string {
  const parts = [`Path=/`, `Max-Age=${maxAge}`, `HttpOnly`, `SameSite=Strict`];
  if (isSecureRequest(req)) parts.push("Secure");
  return parts.join("; ");
}

/** Set-Cookie header value that starts a session. */
export function sessionSetCookie(req: Request): string {
  return `${SESSION_COOKIE}=${createSessionValue()}; ${cookieAttributes(req, SESSION_TTL_SECONDS)}`;
}

/** Set-Cookie header value that ends the session. */
export function sessionClearCookie(req: Request): string {
  return `${SESSION_COOKIE}=; ${cookieAttributes(req, 0)}`;
}

/**
 * Minimal fixed-window rate limiter keyed by an arbitrary string (an IP, an
 * email). In-process only: a restart resets it, which is fine for slowing
 * down password guessing and form spam. Entries are pruned as they expire.
 */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Returns true when the call is allowed, false when the key is over limit. */
  allow(key: string, now: number = Date.now()): boolean {
    if (this.hits.size > 5000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }
}

/** Best-effort client address for rate limiting, honouring a proxy header. */
export function clientAddress(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}
