// Production server for the built site. The TanStack Start build emits a portable
// fetch handler (dist/server/server.js) plus static client assets (dist/client);
// this wraps them in a Bun server on port 3000 — static files first, SSR for the
// rest. Run `bun run build` before starting. Restart it with `bun run publish`.
//
// All browser-to-server work goes over plain /api/* routes handled HERE in the
// Bun.serve fetch() dispatcher. The platform edge passes /api/* verbatim, while
// it mangles TanStack /_serverFn calls, so no client code calls /_serverFn
// anymore. Each handler replicates the logic the TanStack server functions had
// (same Convex paths, same email senders, same result shapes).
import handler from "./dist/server/server.js";
import {
  sendPostCompletionEmail,
  sendDepositReminderEmail,
  sendNewRequestNotification,
  sendApprovalEmail,
  sendDeclineEmail,
  sendDepositReceivedEmail,
  sendBalanceReceivedEmail,
  sendCancellationEmail,
  sendRescheduleEmail,
  sendResendCodeEmail,
  sendProfileSavedEmail,
  sendTestEmail,
  sendPasswordResetEmail,
  buildApprovalClientBody,
  buildDeclineBody,
  buildDepositReceivedBody,
  buildBalanceReceivedBody,
  buildPostCompletionBody,
  buildCancellationBody,
  buildRescheduleBody,
  buildDepositReminderBody,
  buildResendCodeBody,
} from "./src/lib/email";
import {
  SAMPLE_REQUEST,
  SAMPLE_DEPOSIT,
  SAMPLE_CANCELLATION,
  SAMPLE_RESCHEDULE,
  SAMPLE_DEPOSIT_REMINDER,
  SAMPLE_RESEND_CODE,
  SAMPLE_BALANCE,
} from "./src/lib/emailSampleData";
import { EMAIL_TEMPLATES } from "./src/lib/emailTemplates";
import { hashPassword, newSalt } from "./src/lib/password";
import { computeRefund } from "./src/lib/refundPolicy";
import {
  loadMeetGreetSettings,
  computeMeetGreet,
} from "./src/lib/meetGreetServer";
import { formatFee } from "./src/lib/meetGreet";
import { derivePetsData, type PetDetail } from "./src/lib/petDetails";
import { convexQuery, convexMutation } from "./src/lib/convexServer";
import {
  requestHasSession,
  sessionSetCookie,
  sessionClearCookie,
  RateLimiter,
  clientAddress,
} from "./src/lib/session";
import {
  validateBookingRequest,
  priceValidatedBooking,
  findAvailabilityConflict,
  parseDateStr,
  timeToMinutes,
} from "./src/lib/bookingValidation";
import { calculatePrice } from "./src/lib/pricing";
import { timingSafeEqual } from "node:crypto";
/**
 * In process rate limit for password reset requests: email -> last request
 * epoch ms. One request per email per minute. A server restart resets the
 * window (acceptable: this only throttles spam, the reset token expiry is the
 * real safety control).
 */
const passwordResetRequests = new Map<string, number>();

/**
 * POST /api/deposit-reminder: called back by the durable Convex scheduled job
 * 24h after a booking is approved. It reuses the site's single email-sending
 * path (src/lib/email.ts), which holds the Resend key. Guarded by a shared
 * secret (DEPOSIT_REMINDER_SECRET) that Convex passes in the body.
 */
// Convex access goes through src/lib/convexServer.ts (deploy-key auth, one
// retry on reads, fail-loud on every error).

// ── Partial-day availability (Feature B) ────────────────────────────────────
// A departure day whose departure time is at or before 12:00 noon is PARTIAL:
// Jen & John can accept a new booking's arrival on that day, after the actual
// departure time. Partials are DERIVED at read time from the approved requests,
// so a partial flips back to fully blocked naturally the moment any approved
// booking covers that date (the "most restrictive wins" rule below).
const BOOKING_BLOCK_PREFIX = "Blocked by booking: ";

interface PartialDay {
  date: string; // "YYYY-MM-DD"
  afterTime: string; // e.g. "10:00 AM"
}

/** Parse "10:00", "10:00 AM", or "10:00am" into a 24h hour, or null. */
function parseHour(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i.exec((time || "").trim());
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const suffix = (m[3] || "").toLowerCase();
  if (!suffix) return hour;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  return hour;
}

/** Format "10:00" / "10:00 AM" as "10:00 AM" (12 hour). Falls back to raw. */
function formatAfterTime(time: string): string {
  const t = (time || "").trim();
  const m = /^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i.exec(t);
  if (!m) return t;
  const hour = parseHour(t) ?? parseInt(m[1], 10);
  const minute = m[2];
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${h12}:${minute} ${suffix}`;
}

function isAtOrBeforeNoon(time: string): boolean {
  const hour = parseHour(time);
  return hour !== null && hour <= 12;
}

/** Every "YYYY-MM-DD" from arrival through departure, inclusive. */
function dateRangeDays(arrival: string, departure: string): string[] {
  const out: string[] = [];
  const start = new Date(arrival + "T00:00:00");
  const end = new Date(departure + "T00:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return out;
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return out;
}

/**
 * Compute the partial-day list from the approved requests plus the blocked
 * availability rows. Rules (owner approved 2026-09-02):
 * - Departure day with departureTime <= 12:00 is partial, afterTime = real time.
 * - Departure day with departureTime > 12:00 is fully blocked (no partial).
 * - Arrival and middle days are fully blocked.
 * - A partial flips to fully blocked once any approved booking covers the date
 *   (coverage count > 1 for that date), or when the block on that date is a
 *   manual admin block rather than the departing booking's own auto block.
 */
async function computePartialDays(): Promise<PartialDay[]> {
  const records: Array<{ date?: string; note?: string }> =
    (await convexQuery("getAvailability")) ?? [];
  const blockedDates = new Set(
    records
      .map((r) => r.date)
      .filter((d): d is string => typeof d === "string"),
  );
  const requests: any[] = (await convexQuery("getRequests")) ?? [];
  const approved = requests.filter((r) => (r as any).status === "approved");

  // Date -> how many approved ranges cover it (arrival through departure).
  const coverage = new Map<string, number>();
  for (const r of approved) {
    const a = (r as any).arrivalDate;
    const d = (r as any).departureDate;
    if (typeof a !== "string" || typeof d !== "string" || !a || !d) continue;
    for (const day of dateRangeDays(a, d)) {
      coverage.set(day, (coverage.get(day) ?? 0) + 1);
    }
  }

  const partial: PartialDay[] = [];
  for (const r of approved) {
    const dep = (r as any).departureDate;
    if (typeof dep !== "string" || !dep) continue;
    const time = (r as any).departureTime;
    if (!isAtOrBeforeNoon(time)) continue;
    // Only a date this single booking covers can be partial. Any overlap (the
    // date is also inside another approved range) keeps it fully blocked.
    if ((coverage.get(dep) ?? 0) !== 1) continue;
    if (!blockedDates.has(dep)) continue;
    // The block on that date must be this booking's own auto block, not a
    // manual admin block ("Blocked by admin" or no note).
    const row = records.find((rec) => rec.date === dep);
    const note = typeof row?.note === "string" ? row.note : "";
    if (!note.startsWith(BOOKING_BLOCK_PREFIX + ((r as any).clientName || ""))) {
      continue;
    }
    partial.push({ date: dep, afterTime: formatAfterTime(time) });
  }
  // Blocked wins: dates appearing in both lists stay fully blocked.
  return partial;
}

/** Full public payload: fully blocked dates plus partial days. */
async function computeAvailabilityPayload(): Promise<{
  dates: string[];
  partial: PartialDay[];
}> {
  const records: Array<{ date?: string; isOpen?: boolean }> =
    (await convexQuery("getAvailability")) ?? [];
  const blocked = records
    .filter((r) => !r.isOpen)
    .map((r) => r.date)
    .filter((d): d is string => typeof d === "string");
  const partial = await computePartialDays();
  const partialDates = new Set(partial.map((p) => p.date));
  return { dates: blocked.filter((d) => !partialDates.has(d)), partial };
}

async function handleDepositReminder(req: Request): Promise<Response> {
  const secret = process.env.DEPOSIT_REMINDER_SECRET || "";
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (
    !body ||
    typeof body !== "object" ||
    !body.token ||
    !secret ||
    body.token !== secret
  ) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  const data = body.data;
  if (!data || typeof data !== "object" || !data.bookingId || !data.clientEmail) {
    return new Response(JSON.stringify({ ok: false, error: "Missing data" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  try {
    const claim = await convexMutation("claimDepositReminder", {
      bookingId: data.bookingId,
    });
    if (!claim?.shouldSend) {
      return new Response(
        JSON.stringify({ ok: true, skipped: claim?.reason || "no_send" }),
        { status: 200, headers: JSON_HEADERS },
      );
    }
    await sendDepositReminderEmail({
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      arrivalDate: data.arrivalDate,
      departureDate: data.departureDate,
      depositAmount: data.depositAmount,
      petNames: data.petNames,
    });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error(
      "[serve] /api/deposit-reminder error:",
      err instanceof Error ? err.message : String(err),
    );
    return new Response(JSON.stringify({ ok: false, error: "Send failed" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

/**
 * POST /api/post-completion: called back by the durable Convex scheduled job at
 * the client's departure date + time. Guarded by a shared secret.
 */
const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

async function handlePostCompletion(req: Request): Promise<Response> {
  const secret = process.env.POST_COMPLETION_SECRET || "";
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (
    !body ||
    typeof body !== "object" ||
    !body.token ||
    !secret ||
    body.token !== secret
  ) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }
  const data = body.data;
  if (!data || typeof data !== "object" || !data.clientEmail) {
    return new Response(JSON.stringify({ ok: false, error: "Missing data" }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }
  try {
    await sendPostCompletionEmail(data, body.subject);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (err) {
    console.error(
      "[serve] /api/post-completion error:",
      err instanceof Error ? err.message : String(err),
    );
    return new Response(JSON.stringify({ ok: false, error: "Send failed" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
}

/** JSON reply helper mirroring { success, ... } shapes the client expects. */
function jsonOk(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}
function jsonErr(error: string, status = 200): Response {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: JSON_HEADERS,
  });
}

// ── Email template default bodies (mirrors emailTemplates.ts defaultBody) ──
function defaultBody(slug: string): string {
  switch (slug) {
    case "approval":
      return buildApprovalClientBody(SAMPLE_REQUEST);
    case "decline":
      return buildDeclineBody(SAMPLE_REQUEST);
    case "deposit-received":
      return buildDepositReceivedBody(SAMPLE_DEPOSIT);
    case "balance-received":
      return buildBalanceReceivedBody(SAMPLE_BALANCE);
    case "post-completion":
      return buildPostCompletionBody(SAMPLE_REQUEST);
    case "cancellation":
      return buildCancellationBody(SAMPLE_CANCELLATION);
    case "reschedule":
      return buildRescheduleBody(SAMPLE_RESCHEDULE);
    case "deposit-reminder":
      return buildDepositReminderBody(SAMPLE_DEPOSIT_REMINDER);
    case "resendCode":
      return buildResendCodeBody(SAMPLE_RESEND_CODE);
    default:
      return "";
  }
}

// ── Public endpoints: booking, pet profile, resend code ───────────────────

/** Public form posts: per address, per minute. Slows spam without blocking a household. */
const publicPostLimiter = new RateLimiter(20, 60_000);

async function handleSubmitBooking(req: Request): Promise<Response> {
  if (!publicPostLimiter.allow(`submit:${clientAddress(req)}`)) {
    return jsonErr("Too many requests. Please wait a minute and try again.", 429);
  }
  let body: { data?: unknown } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const raw = body && typeof body === "object" ? body.data : null;

  // 1. Validate and normalise every field. Nothing from the browser is used
  //    unless it passed here.
  const validated = validateBookingRequest(raw);
  if (!validated.ok) return jsonErr(validated.error);
  const b = validated.value;

  // 2. The requested dates must be open on the same calendar the public page
  //    shows. This is the check the old server never made.
  let availability: { dates: string[]; partial: PartialDay[] };
  try {
    availability = await computeAvailabilityPayload();
  } catch (err) {
    console.error(
      "[serve] availability check failed:",
      err instanceof Error ? err.message : String(err),
    );
    return jsonErr(
      "We couldn't check availability just now. Please try again in a moment.",
      500,
    );
  }
  const conflict = findAvailabilityConflict(
    b.arrivalDate,
    b.arrivalTime,
    b.departureDate,
    availability.dates,
    availability.partial,
  );
  if (conflict) return jsonErr(conflict);

  // 3. Price on the server with the same engine the form uses. The browser's
  //    number is only compared for logging; the stored price is ours.
  const pricing = priceValidatedBooking(b);
  const clientTotal =
    raw && typeof raw === "object" && typeof (raw as any).totalPrice === "number"
      ? ((raw as any).totalPrice as number)
      : undefined;
  if (clientTotal !== undefined && Math.abs(clientTotal - pricing.total) > 0.01) {
    console.warn(
      `[serve] client price ${clientTotal} differs from server price ${pricing.total} for ${b.clientEmail}; storing server price`,
    );
  }

  // Owner-only Meet & Greet fee, computed server-side; never shown to the client.
  let mgDistanceMiles: number | undefined;
  let mgFee: number | undefined;
  let mgOutsideArea: boolean | undefined;
  let mgManual: boolean | undefined;
  try {
    const { distance, fee } = await computeMeetGreet({
      clientAddress: b.clientAddress,
    });
    if (distance.status === "ok" && distance.oneWayMiles > 0) {
      mgDistanceMiles = distance.oneWayMiles;
      mgFee = fee.fee;
      mgOutsideArea = fee.outsideArea;
      mgManual = distance.mode === "manual";
    }
  } catch (mgErr) {
    console.error(
      "[serve] meet-greet fee computation failed:",
      mgErr instanceof Error ? mgErr.message : String(mgErr),
    );
  }

  const record = {
    clientName: b.clientName,
    clientEmail: b.clientEmail,
    clientPhone: b.clientPhone,
    clientAddress: b.clientAddress,
    arrivalDate: b.arrivalDate,
    arrivalTime: b.arrivalTime,
    departureDate: b.departureDate,
    departureTime: b.departureTime,
    pets: b.pets,
    isHoliday: pricing.isHoliday,
    totalPrice: pricing.total,
    holidaySurchargeDays: pricing.holidayDays,
    holidaySurcharge: pricing.holidaySurcharge,
    priceBreakdown: pricing.breakdown,
    notes: b.notes,
    petAnxieties: b.petAnxieties,
    petAnxietyManifestation: b.petAnxietyManifestation,
    petSleepsInBed: b.petSleepsInBed,
    petQuirks: b.petQuirks,
    petNames: b.petNames || undefined,
    petDetails: b.petDetails,
    hearAboutUs: b.hearAboutUs,
    referredBy: b.referredBy,
  };

  // 4. DB write FIRST. If Convex is unreachable or errors, the request is not
  //    saved and nothing else happens: no notification email, no success shape.
  let requestId: string;
  try {
    requestId = await convexMutation("createRequest", {
      ...record,
      meetGreetDistanceMiles: mgDistanceMiles,
      meetGreetFee: mgFee,
      meetGreetOutsideArea: mgOutsideArea,
      meetGreetManual: mgManual,
    });
  } catch (dbErr) {
    console.error(
      "[serve] createRequest failed:",
      dbErr instanceof Error ? dbErr.message : String(dbErr),
    );
    return jsonErr(
      "We couldn't save your booking request just now. Please try again in a moment.",
      500,
    );
  }

  // 5. Saved. Notify Jen & John (a notification failure never fails the booking).
  try {
    await sendNewRequestNotification({
      ...record,
      referralRewardStatus: b.referredBy ? "pending" : undefined,
      meetGreetFee: mgFee,
      meetGreetDistanceMiles: mgDistanceMiles,
      meetGreetOutsideArea: mgOutsideArea,
    });
  } catch (emailErr) {
    console.error(
      "[serve] Failed to send new-request notification email:",
      emailErr instanceof Error ? emailErr.message : String(emailErr),
    );
  }

  return jsonOk({ success: true, requestId, totalPrice: pricing.total });
}

async function handlePetProfile(req: Request): Promise<Response> {
  if (!publicPostLimiter.allow(`profile:${clientAddress(req)}`)) {
    return jsonErr("Too many requests. Please wait a minute and try again.", 429);
  }
  let body: { data?: { returnCode?: string; clientEmail?: string } } | null =
    null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const data = body?.data;
  const returnCode = data?.returnCode ?? "";
  const clientEmail = data?.clientEmail ?? "";
  let value: any;
  try {
    value = await convexQuery("getPetProfile", { returnCode, clientEmail });
  } catch (dbErr) {
    // DB unreachable is NOT the same as "no such profile" — say so instead of
    // sending the client hunting for a code that may be correct.
    console.error(
      "[serve] /api/pet-profile DB error:",
      dbErr instanceof Error ? dbErr.message : String(dbErr),
    );
    return jsonErr(
      "We couldn't load saved profiles just now. Please try again in a moment.",
      500,
    );
  }
  if (!value) {
    return jsonOk({
      success: false,
      error:
        "We couldn't find a saved profile for that code and email. Double check your code and email and try again.",
    });
  }
  return jsonOk({ success: true, profile: value });
}

async function handleResendCode(req: Request): Promise<Response> {
  if (!publicPostLimiter.allow(`resend:${clientAddress(req)}`)) {
    return jsonErr("Too many requests. Please wait a minute and try again.", 429);
  }
  let body: { data?: { clientEmail?: string } } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const clientEmail = (body?.data?.clientEmail ?? "").trim();
  if (!clientEmail) return jsonOk({ success: false, error: "Please enter your email." });

  let value: any;
  try {
    value = await convexMutation("resendReturnCode", { clientEmail });
  } catch (dbErr) {
    // DB failure: never send the "not found" message (the profile may exist)
    // and never send the code email — the write path is what looks it up.
    console.error(
      "[serve] /api/resend-code DB error:",
      dbErr instanceof Error ? dbErr.message : String(dbErr),
    );
    return jsonErr(
      "We couldn't look up saved profiles just now. Please try again in a moment.",
      500,
    );
  }
  if (!value || !value.found) {
    return jsonOk({
      success: false,
      notFound: true,
      error:
        "We couldn't find a saved profile for that email. You're welcome to book as normal and your profile will be created on your first approved booking.",
    });
  }
  try {
    await sendResendCodeEmail({
      clientName: value.clientName || clientEmail,
      clientEmail,
      returnCode: value.returnCode || "",
      petNames: value.petNames,
    });
  } catch (emailErr) {
    console.error(
      "[serve] resend-code email failed:",
      emailErr instanceof Error ? emailErr.message : String(emailErr),
    );
  }
  return jsonOk({ success: true, backfilled: Boolean(value.backfilled) });
}


// ── Stored-record helpers for admin email flows ────────────────────────────
// Every client email below is built from the record in Convex, never from
// fields the admin browser posted, so a stale or edited page can't email a
// client the wrong name, dates, or amounts.

/** Deposit expected for a request/booking: the stored value, else half the total. */
function depositFor(request: any, totalPrice: number): number {
  return typeof request?.depositAmount === "number"
    ? request.depositAmount
    : Math.round(totalPrice * 0.5);
}

/** Shape a stored request row into the data the email builders expect. */
function requestToEmailData(request: any) {
  return {
    clientName: String(request.clientName || ""),
    clientEmail: String(request.clientEmail || ""),
    clientPhone: request.clientPhone,
    clientAddress: request.clientAddress,
    arrivalDate: String(request.arrivalDate || ""),
    arrivalTime: String(request.arrivalTime || ""),
    departureDate: String(request.departureDate || ""),
    departureTime: String(request.departureTime || ""),
    pets: request.pets ?? {},
    isHoliday: Boolean(request.isHoliday),
    totalPrice: Number(request.totalPrice) || 0,
    depositAmount: depositFor(request, Number(request.totalPrice) || 0),
    priceBreakdown: request.priceBreakdown,
    notes: request.notes,
    petAnxieties: request.petAnxieties,
    petAnxietyManifestation: request.petAnxietyManifestation,
    petSleepsInBed: request.petSleepsInBed,
    petQuirks: request.petQuirks,
    petNames: request.petNames,
    petDetails: Array.isArray(request.petDetails)
      ? (request.petDetails as PetDetail[]).filter(
          (p) => p && typeof p.name === "string",
        )
      : undefined,
    hearAboutUs: request.hearAboutUs,
    referredBy: request.referredBy,
    referralRewardStatus: request.referralRewardStatus,
    meetGreetFee: request.meetGreetFee,
    meetGreetDistanceMiles: request.meetGreetDistanceMiles,
    meetGreetOutsideArea: request.meetGreetOutsideArea,
  };
}

/** Pet counts for pricing from a stored request (per-pet cards win over legacy counts). */
function petsForPricing(request: any) {
  if (Array.isArray(request?.petDetails) && request.petDetails.length > 0) {
    return derivePetsData(
      (request.petDetails as any[])
        .filter((p) => p && typeof p.name === "string")
        .map((p) => ({ ...p, type: p.type || "adultDog" })),
    );
  }
  const p = request?.pets && typeof request.pets === "object" ? request.pets : {};
  return {
    adultDogs: Number(p.adultDogs) || 0,
    puppies: Number(p.puppies) || 0,
    cats: Number(p.cats) || 0,
    kittens: Number(p.kittens) || 0,
    otherSpecies: Array.isArray(p.otherSpecies) ? p.otherSpecies : [],
  };
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const optStr = (v: unknown): string | undefined => str(v) || undefined;

// ── Generic admin action dispatcher ────────────────────────────────────────

/**
 * Actions that may run WITHOUT an admin session. Everything else in the
 * dispatcher requires the signed HttpOnly session cookie issued by
 * verifyPassword; a request without one is refused before any case runs.
 */
const PUBLIC_ACTIONS = new Set([
  "verifyPassword",
  "requestPasswordReset",
  "resetPassword",
  "checkSession",
  "logout",
]);

/** Login attempts per address per 15 minutes. */
const loginLimiter = new RateLimiter(10, 15 * 60_000);

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Check a candidate admin password against the stored hash, seeding the hash
 * from ADMIN_PASSWORD the first time when nothing is stored yet.
 * `configured` is false only when neither a stored hash nor ADMIN_PASSWORD exists.
 */
async function passwordMatches(
  password: string,
): Promise<{ ok: boolean; configured: boolean }> {
  let stored: { salt?: string; hash?: string } | null = null;
  try {
    stored = await convexQuery("getAdminAuth");
  } catch (err) {
    console.error(
      "[serve] getAdminAuth failed:",
      err instanceof Error ? err.message : String(err),
    );
  }
  if (stored && stored.salt && stored.hash) {
    const candidate = await hashPassword(password, stored.salt);
    return { ok: safeEqual(candidate, stored.hash), configured: true };
  }
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminPassword) return { ok: false, configured: false };
  if (!safeEqual(password, adminPassword)) return { ok: false, configured: true };
  try {
    const salt = await newSalt();
    const hash = await hashPassword(adminPassword, salt);
    await convexMutation("setAdminAuth", { salt, hash });
  } catch {
    // Non fatal: the env fallback keeps working until the hash can be stored.
  }
  return { ok: true, configured: true };
}

async function handleAction(req: Request): Promise<Response> {
  let body: { action?: string; data?: any } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const action = typeof body?.action === "string" ? body.action : "";
  const data = body?.data && typeof body.data === "object" ? body.data : {};

  // The gate. Admin-only actions never run without a valid session cookie.
  if (!PUBLIC_ACTIONS.has(action) && !requestHasSession(req)) {
    return jsonErr("Not signed in. Please sign in to the admin panel again.", 401);
  }

  try {
    switch (action) {
      // ── Session ─────────────────────────────────────────────────────────
      case "checkSession": {
        return jsonOk({ success: true, authenticated: requestHasSession(req) });
      }
      case "logout": {
        return jsonOk({ success: true }, 200, {
          "Set-Cookie": sessionClearCookie(req),
        });
      }
      // ── Auth ────────────────────────────────────────────────────────────
      case "verifyPassword": {
        if (!loginLimiter.allow(`login:${clientAddress(req)}`)) {
          return jsonOk({
            success: false,
            error: "Too many sign in attempts. Please wait 15 minutes and try again.",
          });
        }
        const password = typeof data.password === "string" ? data.password : "";
        const result = await passwordMatches(password);
        if (result.ok) {
          return jsonOk({ success: true }, 200, {
            "Set-Cookie": sessionSetCookie(req),
          });
        }
        return jsonOk({
          success: false,
          error: result.configured
            ? "Invalid password"
            : "Admin password not configured",
        });
      }
      case "changePassword": {
        const next = typeof data.newPassword === "string" ? data.newPassword : "";
        if (next.length < 8) {
          return jsonOk({
            success: false,
            error: "New password must be at least 8 characters.",
          });
        }
        let currentOk = false;
        try {
          const stored: any = await convexQuery("getAdminAuth");
          if (stored && stored.salt && stored.hash) {
            currentOk = safeEqual(
              await hashPassword(data.currentPassword || "", stored.salt),
              stored.hash,
            );
          } else {
            currentOk =
              !!process.env.ADMIN_PASSWORD &&
              data.currentPassword === process.env.ADMIN_PASSWORD;
          }
        } catch {
          currentOk =
            !!process.env.ADMIN_PASSWORD &&
            data.currentPassword === process.env.ADMIN_PASSWORD;
        }
        if (!currentOk) {
          return jsonOk({ success: false, error: "Current password is incorrect." });
        }
        const salt = await newSalt();
        const hash = await hashPassword(next, salt);
        await convexMutation("setAdminAuth", { salt, hash });
        return jsonOk({ success: true });
      }
      // ── Password reset ─────────────────────────────────────────────────
      case "requestPasswordReset": {
        const email = (typeof data.email === "string" ? data.email : "").trim().toLowerCase();
        // One request per email per minute, regardless of whether the address
        // matches: the response is always success:true so an attacker cannot
        // tell which addresses exist. The raw token is never stored, only its
        // sha256 hash, so a database read never leaks a working reset link.
        const now = Date.now();
        const rateLimitKey = `passwordReset:${email}`;
        const last = passwordResetRequests.get(rateLimitKey) ?? 0;
        if (now - last >= 60_000) {
          passwordResetRequests.set(rateLimitKey, now);
          const expectedEmail = (
            process.env.ADMIN_EMAIL || "jen.johnpetservices@proton.me"
          ).trim().toLowerCase();
          if (email === expectedEmail) {
            const { randomBytes, createHash } = await import("node:crypto");
            const tokenRaw = randomBytes(32).toString("hex");
            const tokenHash = createHash("sha256")
              .update(tokenRaw)
              .digest("hex");
            const expiresAt = Date.now() + 30 * 60 * 1000;
            await convexMutation("createPasswordReset", { tokenHash, expiresAt });
            const baseUrl =
              process.env.SITE_PUBLIC_URL || "https://jenjohnpetservices.com";
            const link = `${baseUrl}/admin?resetToken=${encodeURIComponent(tokenRaw)}`;
            await sendPasswordResetEmail(link);
          }
        }
        return jsonOk({ success: true });
      }
      case "resetPassword": {
        const resetToken =
          typeof data.resetToken === "string" ? data.resetToken : "";
        const newPassword =
          typeof data.newPassword === "string" ? data.newPassword : "";
        if (!resetToken || newPassword.length < 8) {
          return jsonOk({
            success: false,
            error: "New password must be at least 8 characters.",
          });
        }
        const { createHash } = await import("node:crypto");
        const tokenHash = createHash("sha256")
          .update(resetToken)
          .digest("hex");
        // Atomically claim and invalidate the token: a token that is consumed,
        // expired, or never existed all produce the same failure response.
        const claimed: any = await convexMutation("consumePasswordReset", {
          tokenHash,
        });
        if (!claimed || !claimed.valid) {
          return jsonOk({
            success: false,
            error: "This reset link is invalid or has expired. Request a new one.",
          });
        }
        const salt = await newSalt();
        const hash = await hashPassword(newPassword, salt);
        await convexMutation("setAdminAuth", { salt, hash });
        return jsonOk({ success: true });
      }

      // ── Availability ────────────────────────────────────────────────────
      case "getAvailability": {
        const records: any[] = (await convexQuery("getAllAvailability")) ?? [];
        // Feature B: partial days carry the owner-facing reason text so the
        // admin calendar can render them distinctly from fully blocked dates.
        const partial = await computePartialDays();
        return jsonOk({
          success: true,
          data: records.map((r) => {
            if (r.note && String(r.note).startsWith(BOOKING_BLOCK_PREFIX)) {
              const partialInfo = partial.find((p) => p.date === r.date);
              if (partialInfo) {
                return {
                  ...r,
                  reason: `Departs ${partialInfo.afterTime}, accepts arrivals after ${partialInfo.afterTime}`,
                };
              }
            }
            return r;
          }),
        });
      }
      case "setAvailability": {
        await convexMutation("setAvailability", {
          date: data.date,
          isOpen: data.isOpen,
        });
        return jsonOk({ success: true, data: null });
      }
      case "blockDates": {
        const start = new Date(data.startDate + "T00:00:00");
        const end = new Date(data.endDate + "T00:00:00");
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return jsonOk({ success: false, error: "Invalid date range" });
        }
        if (start > end) {
          return jsonOk({
            success: false,
            error: "Start date must be before end date",
          });
        }
        const dates: string[] = [];
        const cursor = new Date(start);
        while (cursor <= end) {
          const yyyy = cursor.getFullYear();
          const mm = String(cursor.getMonth() + 1).padStart(2, "0");
          const dd = String(cursor.getDate()).padStart(2, "0");
          dates.push(`${yyyy}-${mm}-${dd}`);
          cursor.setDate(cursor.getDate() + 1);
        }
        for (const date of dates) {
          await convexMutation("setAvailability", {
            date,
            isOpen: false,
            note: "Blocked by admin",
          });
        }
        return jsonOk({ success: true, data: { blocked: dates.length } });
      }

      // ── Requests & bookings reads ───────────────────────────────────────
      case "getRequests": {
        const records: any[] = (await convexQuery("getRequests")) ?? [];
        return jsonOk({ success: true, data: records });
      }
      case "getBookings": {
        const records: any[] = (await convexQuery("getBookings")) ?? [];
        return jsonOk({ success: true, data: records });
      }

      // ── Request mutations ───────────────────────────────────────────────
      case "updateRequestStatus": {
        const id = str(data.id);
        const status = str(data.status);
        if (!id || !["approved", "declined", "pending", "cancelled"].includes(status)) {
          return jsonErr("Invalid request or status", 400);
        }
        const statusResult: any = await convexMutation("updateRequestStatus", {
          id,
          status,
          depositAmount: num(data.depositAmount),
          depositLink: optStr(data.depositLink),
          totalPrice: num(data.totalPrice),
          isHoliday: typeof data.isHoliday === "boolean" ? data.isHoliday : undefined,
          holidaySurchargeDays: num(data.holidaySurchargeDays),
          holidaySurcharge: num(data.holidaySurcharge),
          meetGreetFee: num(data.meetGreetFee),
          meetGreetDistanceMiles: num(data.meetGreetDistanceMiles),
          meetGreetOutsideArea:
            typeof data.meetGreetOutsideArea === "boolean" ? data.meetGreetOutsideArea : undefined,
          meetGreetManual:
            typeof data.meetGreetManual === "boolean" ? data.meetGreetManual : undefined,
        });
        if (status !== "approved" && status !== "declined") {
          return jsonOk({ success: true, data: null });
        }
        // Read back what was stored (including any price/deposit the owner
        // edited at approval) and email from that.
        const request: any = await convexQuery("getRequest", { id });
        if (!request) return jsonErr("Request not found", 404);
        const emailData = requestToEmailData(request);
        if (!emailData.clientEmail) return jsonOk({ success: true, data: null });
        if (status === "approved") {
          await sendApprovalEmail(emailData);
          // The mutation result IS the value object ({ success, profileCreated,
          // returnCode }); the old code read a nested .value that never existed,
          // so the return-code email never went out.
          if (statusResult?.profileCreated && statusResult?.returnCode) {
            const savedPetNames =
              emailData.petDetails && emailData.petDetails.length > 0
                ? emailData.petDetails
                    .map((p) => p.name.trim())
                    .filter(Boolean)
                    .join(", ")
                : emailData.petNames;
            await sendProfileSavedEmail({
              clientName: emailData.clientName,
              clientEmail: emailData.clientEmail,
              returnCode: statusResult.returnCode,
              petNames: savedPetNames,
            });
          }
        } else {
          await sendDeclineEmail(emailData);
        }
        return jsonOk({ success: true, data: null });
      }
      case "updateReferralRewardStatus": {
        await convexMutation("updateReferralRewardStatus", {
          requestId: data.requestId,
          status: data.status,
        });
        return jsonOk({ success: true, data: null });
      }
      case "deleteRequest": {
        await convexMutation("deleteRequest", { id: data.id });
        return jsonOk({ success: true, data: null });
      }

      // ── Booking deposit / balance / cancel / reschedule ─────────────────
      case "updateBookingDeposit": {
        const id = str(data.id);
        if (!id) return jsonErr("Booking id is required", 400);
        const depositPaid = Boolean(data.depositPaid);
        await convexMutation("updateBooking", {
          id,
          depositPaid,
          paymentMethod: optStr(data.paymentMethod),
        });
        if (!depositPaid) return jsonOk({ success: true, data: null });
        await convexMutation("cancelDepositReminder", { bookingId: id });
        const rec: any = await convexQuery("getBooking", { id });
        if (!rec?.booking?.clientEmail) return jsonOk({ success: true, data: null });
        const claim = await convexMutation("markDepositEmailSent", { id });
        if (claim?.shouldSend) {
          const total = Number(rec.booking.totalPrice) || 0;
          const depositAmount = depositFor(rec.request, total);
          await sendDepositReceivedEmail({
            clientName: rec.booking.clientName,
            clientEmail: rec.booking.clientEmail,
            arrivalDate: rec.booking.arrivalDate,
            departureDate: rec.booking.departureDate,
            totalPrice: total,
            petNames: rec.request?.petNames,
            depositAmount,
            remainingBalance: Math.max(0, total - depositAmount),
          });
        }
        return jsonOk({ success: true, data: null });
      }
      case "updateBookingBalance": {
        const id = str(data.id);
        if (!id) return jsonErr("Booking id is required", 400);
        const balancePaid = Boolean(data.balancePaid);
        await convexMutation("updateBookingBalance", {
          id,
          balancePaid,
          balancePaymentMethod: optStr(data.balancePaymentMethod),
        });
        if (!balancePaid) return jsonOk({ success: true, data: null });
        const rec: any = await convexQuery("getBooking", { id });
        if (!rec?.booking?.clientEmail) return jsonOk({ success: true, data: null });
        const claim = await convexMutation("markBalanceEmailSent", { id });
        if (claim?.shouldSend) {
          const total = Number(rec.booking.totalPrice) || 0;
          const depositAmount = depositFor(rec.request, total);
          await sendBalanceReceivedEmail({
            clientName: rec.booking.clientName,
            clientEmail: rec.booking.clientEmail,
            arrivalDate: rec.booking.arrivalDate,
            departureDate: rec.booking.departureDate,
            balanceAmount: Math.max(0, total - depositAmount),
            balancePaymentMethod: rec.booking.balancePaymentMethod,
            totalPrice: total,
            petNames: rec.request?.petNames,
          });
        }
        return jsonOk({ success: true, data: null });
      }
      case "cancelBooking": {
        const bookingId = str(data.bookingId);
        if (!bookingId) return jsonErr("Booking id is required", 400);
        const rec: any = await convexQuery("getBooking", { id: bookingId });
        if (!rec?.booking) return jsonErr("Booking not found", 404);
        const { booking, request } = rec;
        await convexMutation("updateRequestStatus", {
          id: booking.requestId,
          status: "cancelled",
        });
        const total = Number(booking.totalPrice) || 0;
        // Nothing to refund when no deposit was ever recorded as paid.
        const refundAmount = booking.depositPaid
          ? computeRefund({
              arrivalDate: booking.arrivalDate,
              isHoliday: Boolean(booking.isHoliday ?? request?.isHoliday),
              depositAmount: depositFor(request, total),
              totalPrice: total,
            })
          : 0;
        const claim: any = await convexMutation("markCancellationEmailSent", {
          id: bookingId,
        });
        let emailed = false;
        if (claim?.shouldSend && booking.clientEmail) {
          emailed = true;
          await sendCancellationEmail({
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            arrivalDate: booking.arrivalDate,
            departureDate: booking.departureDate,
            refundAmount,
            isHoliday: Boolean(booking.isHoliday ?? request?.isHoliday),
            paymentMethod: booking.paymentMethod,
            petNames: request?.petNames,
          });
        }
        return jsonOk({ success: true, data: { refundAmount, emailed } });
      }
      case "rescheduleBooking": {
        const bookingId = str(data.bookingId);
        const arrivalDate = str(data.arrivalDate);
        const arrivalTime = str(data.arrivalTime);
        const departureDate = str(data.departureDate);
        const departureTime = str(data.departureTime);
        if (!bookingId) return jsonErr("Booking id is required", 400);
        const arr = parseDateStr(arrivalDate);
        const dep = parseDateStr(departureDate);
        if (!arr || !dep || timeToMinutes(arrivalTime) === null || timeToMinutes(departureTime) === null) {
          return jsonOk({ success: false, error: "Enter valid arrival and departure dates and times." });
        }
        if (departureDate <= arrivalDate) {
          return jsonOk({ success: false, error: "Departure date must be after arrival date." });
        }
        const rec: any = await convexQuery("getBooking", { id: bookingId });
        if (!rec?.booking || !rec.request) return jsonErr("Booking not found", 404);
        const { booking, request } = rec;
        // Re-price on the server from the stored pets; the browser's number is
        // only a preview.
        const pets = petsForPricing(request);
        const pricing = calculatePrice({
          arrivalDate: arr,
          arrivalTime,
          departureDate: dep,
          departureTime,
          adultDogs: pets.adultDogs,
          puppies: pets.puppies,
          cats: pets.cats,
          kittens: pets.kittens,
          otherSpeciesCount: pets.otherSpecies.reduce(
            (sum: number, o: any) => sum + (Number(o?.quantity) || 0),
            0,
          ),
        });
        await convexMutation("rescheduleBooking", {
          requestId: booking.requestId,
          bookingId,
          arrivalDate,
          arrivalTime,
          departureDate,
          departureTime,
          totalPrice: pricing.total,
          priceBreakdown: pricing.breakdown,
          isHoliday: pricing.isHoliday,
          holidaySurchargeDays: pricing.holidayDays,
          holidaySurcharge: pricing.holidaySurcharge,
        });
        const paidSoFar = booking.depositPaid
          ? depositFor(request, Number(booking.totalPrice) || 0)
          : 0;
        const balanceDue = Math.max(0, Math.round(pricing.total - paidSoFar));
        const claim: any = await convexMutation("markRescheduleEmailSent", {
          id: bookingId,
        });
        if (claim?.shouldSend && booking.clientEmail) {
          await sendRescheduleEmail({
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            arrivalDate,
            arrivalTime,
            departureDate,
            departureTime,
            totalPrice: pricing.total,
            balanceDue,
            petNames: request.petNames,
          });
        }
        return jsonOk({
          success: true,
          data: { totalPrice: pricing.total, balanceDue },
        });
      }
      case "sendTestEmail": {
        await sendTestEmail({
          slug: data.slug,
          subject: data.subject ?? "",
          body: data.body ?? "",
          recipient: data.recipient,
        });
        return jsonOk({ success: true, data: null });
      }

      // ── Reviews ─────────────────────────────────────────────────────────
      case "loadReviews": {
        const records: any[] = (await convexQuery("getReviews")) ?? [];
        return jsonOk({ success: true, data: records });
      }
      case "addReview": {
        await convexMutation("createReview", data);
        return jsonOk({ success: true, data: null });
      }
      case "editReview": {
        await convexMutation("updateReview", data);
        return jsonOk({ success: true, data: null });
      }
      case "deleteReview": {
        await convexMutation("deleteReview", { id: data.id });
        return jsonOk({ success: true, data: null });
      }

      // ── Email templates ─────────────────────────────────────────────────
      case "loadEmailTemplates": {
        const rows: any[] = (await convexQuery("getEmailTemplates")) ?? [];
        const map = new Map(rows.map((r) => [r.slug, r]));
        const views = EMAIL_TEMPLATES.map((def) => {
          const row = map.get(def.slug);
          const hasCustomBody = Boolean(row?.body?.trim());
          return {
            slug: def.slug,
            label: def.label,
            description: def.description,
            header: def.header,
            defaultSubject: def.defaultSubject,
            custom: Boolean(row),
            hasCustomBody,
            body: hasCustomBody ? row.body : defaultBody(def.slug),
            subject: row?.subject?.trim() ?? "",
          };
        });
        return jsonOk({ success: true, data: views });
      }
      case "saveEmailTemplate": {
        await convexMutation("saveEmailTemplate", {
          slug: data.slug,
          body: typeof data.body === "string" && data.body.trim() ? data.body : "",
          subject:
            typeof data.subject === "string" && data.subject.trim()
              ? data.subject
              : "",
        });
        return jsonOk({ success: true, data: null });
      }

      // ── Meet & Greet ────────────────────────────────────────────────────
      case "meetGreetGetSettings": {
        const settings = await loadMeetGreetSettings();
        return jsonOk({ success: true, data: settings });
      }
      case "meetGreetCalculate": {
        const { distance, fee, settings } = await computeMeetGreet({
          oneWayMiles: data.oneWayMiles,
          clientAddress: data.clientAddress,
        });
        return jsonOk({
          oneWayMiles: distance.oneWayMiles,
          mode: distance.mode,
          status: distance.status,
          message: distance.message,
          fee: fee.fee,
          outsideArea: fee.outsideArea,
          tier: fee.tier,
          formattedFee: formatFee(fee.fee),
          settings,
        });
      }
      case "meetGreetSaveSettings": {
        const numeric: string[] = [
          "flatFee",
          "freeRadiusMiles",
          "feeStartsAtOneWay",
          "ratePerMile",
          "feeCap",
          "outsideServiceAreaMiles",
        ];
        for (const k of numeric) {
          const v = (data as any)[k];
          if (v !== undefined && (!Number.isFinite(Number(v)) || Number(v) < 0)) {
            return jsonOk({
              success: false,
              error: `${k} must be a non negative number.`,
            });
          }
        }
        if (
          data.distanceProvider !== undefined &&
          !["google", "mapbox", "manual"].includes(data.distanceProvider)
        ) {
          return jsonOk({
            success: false,
            error: "distanceProvider must be google, mapbox or manual.",
          });
        }
        const entries: { key: string; value?: string }[] = [];
        const strPush = (k: string, v?: string | number) => {
          if (v !== undefined) entries.push({ key: k, value: String(v) });
        };
        strPush("baseAddress", data.baseAddress);
        for (const k of numeric) strPush(k, data[k]);
        strPush("distanceProvider", data.distanceProvider);
        strPush("virtualNote", data.virtualNote);
        await convexMutation("saveSiteSettings", { entries });
        return jsonOk({ success: true });
      }

      // ── Content studio (Gemini) ─────────────────────────────────────────
      case "generateContent": {
        const key = process.env.GOOGLE_API_KEY;
        if (!key) {
          return jsonOk({
            success: false,
            error:
              "GOOGLE_API_KEY is not configured on the server. The lead needs to add it to the site .env so AI writing can be enabled.",
          });
        }
        return jsonOk({
          success: false,
          error:
            "Content generation is not available on this deployment. Configure GOOGLE_API_KEY on the server to enable it.",
        });
      }

      default:
        return jsonErr(`Unknown action: ${action}`, 404);
    }
  } catch (err) {
    console.error(
      `[serve] /api/action ${action} error:`,
      err instanceof Error ? err.message : String(err),
    );
    return jsonErr(err instanceof Error ? err.message : "Action failed", 500);
  }
}

// ── Public GET api (reviews / availability) stay as proven in Fix 1 ────────
async function handlePublicApi(pathname: string): Promise<Response> {
  try {
    if (pathname === "/api/reviews") {
      const data = await convexQuery("getReviews");
      return jsonOk({ success: true, data: data ?? [] });
    }
    if (pathname === "/api/availability") {
      const { dates, partial } = await computeAvailabilityPayload();
      return jsonOk({ success: true, dates, partial });
    }
  } catch (err) {
    console.error(
      `[serve] ${pathname} error:`,
      err instanceof Error ? err.message : String(err),
    );
    return jsonErr("Failed to load data", 500);
  }
  return jsonErr("Not found", 404);
}

// Pinned, NOT read from the environment.
const PORT = 3000;
const HOST = "0.0.0.0";
const CLIENT_DIR = `${import.meta.dir}/dist/client`;

// Free PORT regardless of which user owns the current listener.
const freePort =
  `for _ in $(seq 1 25); do ` +
  `pids=$(lsof -t -iTCP:${String(PORT)} -sTCP:LISTEN 2>/dev/null || true); ` +
  `if [ -z "$pids" ]; then exit 0; fi; ` +
  `kill $pids 2>/dev/null || true; sleep 0.2; ` +
  `done`;

for (let attempt = 1; ; attempt++) {
  await Bun.$`sudo sh -c ${freePort}`.quiet().nothrow();
  try {
    Bun.serve({
      port: PORT,
      hostname: HOST,
      async fetch(req) {
        const { pathname } = new URL(req.url);
        // Public landing-page data (proven in Fix 1).
        if (
          (pathname === "/api/reviews" || pathname === "/api/availability") &&
          req.method === "GET"
        ) {
          return handlePublicApi(pathname);
        }
        // Public booking submission, pet profile, resend code.
        if (pathname === "/api/submit-booking" && req.method === "POST") {
          return handleSubmitBooking(req);
        }
        if (pathname === "/api/pet-profile" && req.method === "POST") {
          return handlePetProfile(req);
        }
        if (pathname === "/api/resend-code" && req.method === "POST") {
          return handleResendCode(req);
        }
        // Generic admin/owner action dispatcher (admin panel + content studio).
        if (pathname === "/api/action" && req.method === "POST") {
          return handleAction(req);
        }
        // Callback from the durable Convex scheduled job (deposit reminder).
        if (pathname === "/api/deposit-reminder" && req.method === "POST") {
          return handleDepositReminder(req);
        }
        // Callback from the durable Convex scheduled job (end-of-stay email).
        if (pathname === "/api/post-completion" && req.method === "POST") {
          return handlePostCompletion(req);
        }
        // Forced-download links for print assets.
        const dl = pathname.match(/^\/download\/([A-Za-z0-9._-]+)$/);
        if (dl) {
          const file = Bun.file(CLIENT_DIR + "/" + dl[1]);
          if (await file.exists()) {
            return new Response(file, {
              headers: { "Content-Disposition": `attachment; filename="${dl[1]}"` },
            });
          }
        }
        if (pathname !== "/") {
          const filePath = CLIENT_DIR + decodeURIComponent(pathname);
          const file = Bun.file(filePath);
          if (await file.exists()) return new Response(file);
        }
        return (
          handler as { fetch: (r: Request) => Response | Promise<Response> }
        ).fetch(req);
      },
    });
    break;
  } catch (err) {
    if (attempt >= 10) throw err;
    await Bun.sleep(200);
  }
}

console.log(`team-site serving on http://${HOST}:${String(PORT)}`);