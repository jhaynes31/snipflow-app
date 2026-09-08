/**
 * Email helper module for Jen & John's Pet Services.
 *
 * Uses the platform's built-in email via HTTP API (Resend).
 * All send functions are fire-and-forget: failures are logged but
 * never block the calling flow.
 *
 * COPY BARRIER: owner rule for all client-facing copy is NO em dashes
 * (—) and NO hyphens (-) anywhere. When the owner asks for "dots" in a
 * phrase, use a literal series "...." (four periods). Keep every new or
 * edited string below free of those two characters.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatPetDetail,
  friendlyPetNames,
  type PetDetail,
} from "./petDetails";
import {
  SAMPLE_REQUEST,
  SAMPLE_DEPOSIT,
  SAMPLE_BALANCE,
  SAMPLE_CANCELLATION,
  SAMPLE_RESCHEDULE,
  SAMPLE_DEPOSIT_REMINDER,
  SAMPLE_RESEND_CODE,
} from "./emailSampleData";
import { convexQuery } from "./convexServer";

const ADMIN_EMAIL = "jen.johnpetservices@proton.me";
const SITE_BASE_URL =
  process.env.SITE_PUBLIC_URL || "https://jenjohnpetservices.com";
const FROM_EMAIL =
  process.env.RESEND_EMAIL_FROM || "bookings@jenjohnpetservices.com";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const ADMIN_DASHBOARD_URL =
  process.env.ADMIN_DASHBOARD_URL || `${SITE_BASE_URL}/admin`;

const GOOGLE_REVIEW_URL =
  process.env.GOOGLE_REVIEW_URL ||
  "https://g.page/r/CYP4tvOk7bWYEAI/review";
const NEXTDOOR_REVIEW_URL =
  process.env.NEXTDOOR_REVIEW_URL ||
  "https://nextdoor.com/page/jen-johns-pet-services?utm_campaign=1787494283708&share_action_id=5681d0fa-d27e-4e8a-b0e1-1b04e87306c7";
const FACEBOOK_REVIEW_URL =
  process.env.FACEBOOK_REVIEW_URL ||
  "https://www.facebook.com/profile.php?id=61593502117126&sk=reviews";

/** The three review sites we ask clients to review us on, in display order. */
const REVIEW_SITES: { name: string; url: string }[] = [
  { name: "Google", url: GOOGLE_REVIEW_URL },
  { name: "Nextdoor", url: NEXTDOOR_REVIEW_URL },
  { name: "Facebook", url: FACEBOOK_REVIEW_URL },
];

interface PaymentOption {
  name: string;
  handle: string;
  url: string;
  /**
   * Optional QR image filename. Omitted for methods with no public pay link
   * (Zelle has no QR-launchable URL, so its card renders the handle as text).
   */
  qrFile?: string;
}

/**
 * The four deposit payment methods. Zelle has no public pay link (unlike
 * venmo.com/handle, paypal.me, cash.app/$handle), so it carries no QR. Its
 * card renders the handle as text instead. The other three keep real QRs that
 * open their payment apps.
 */
const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    name: "Zelle",
    handle: "jen.johnpetservices@proton.me",
    url: "mailto:jen.johnpetservices@proton.me",
  },
  {
    name: "Venmo",
    handle: "@jjhpetservices",
    url: "https://venmo.com/jjhpetservices",
    qrFile: "payment-qr-venmo.png",
  },
  {
    name: "PayPal",
    handle: "paypal.me/jenjohnpetservices",
    url: "https://paypal.me/jenjohnpetservices",
    qrFile: "payment-qr-paypal.png",
  },
  {
    name: "Cash App",
    handle: "$jenjohnpetservices",
    url: "https://cash.app/$jenjohnpetservices",
    qrFile: "payment-qr-cashapp.png",
  },
];

/**
 * Stable Content-IDs used to embed the payment QR images inline in the HTML
 * bodies via cid: references. They are attached to the email with matching
 * content_id so clients can render them. Keys match PAYMENT_OPTIONS names.
 */
const PAYMENT_CIDS: Record<string, string> = {
  Zelle: "payment-zelle@email",
  Venmo: "payment-venmo@email",
  PayPal: "payment-paypal@email",
  "Cash App": "payment-cashapp@email",
};

// ── Types ──────────────────────────────────────────────────────────────────

interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_id: string;
  type: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string; // plain text
  html?: string; // optional HTML body (multipart when present)
  attachments?: EmailAttachment[];
}

export interface NewRequestData {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  pets: unknown;
  isHoliday: boolean;
  totalPrice: number;
  /**
   * Deposit recorded on the request at approval (the owner may edit it). When
   * absent the default half-of-total rule applies. Always pass the stored
   * value so the client is told the same number the booking records.
   */
  depositAmount?: number;
  priceBreakdown?: unknown;
  notes?: string;
  petAnxieties?: string;
  petAnxietyManifestation?: string;
  petSleepsInBed?: string;
  petQuirks?: string;
  petNames?: string;
  petDetails?: PetDetail[];
  hearAboutUs?: string;
  referredBy?: string;
  referralRewardStatus?: string;
  // Owner-only Meet & Greet travel fee (never shown to the client).
  meetGreetFee?: number;
  meetGreetDistanceMiles?: number;
  meetGreetOutsideArea?: boolean;
}

/**
 * Optional send-time overrides shared by every client email sender.
 *
 * Used by the admin "Send Test" feature to inject the editor's current copy and
 * route a demonstration email to the configured test recipient. For a normal
 * (non test) send none of these are present, so behavior is unchanged.
 *
 * - `to`      overrides the destination recipient (test recipient).
 * - `subject` / `body` take precedence over the saved Convex override, which in
 *   turn takes precedence over the built in default. Blank injected values fall
 *   through, so a test of an unedited template sends the default copy.
 * - `isTest`  marks a demonstration send so a sender never makes any write side
 *   effect (one-time claims, status flags, scheduled jobs). The senders in this
 *   module never make claims themselves, but the flag is threaded through and
 *   future senders are expected to honour it.
 */
export interface SendOptions {
  to?: string;
  subject?: string;
  body?: string;
  isTest?: boolean;
}

// ── Inline QR attachment helpers ───────────────────────────────────────────

/**
 * Reads the four payment QR PNGs and returns them as base64 attachments with
 * stable Content-IDs so the HTML <img src="cid:..."> references render inline
 * in email clients (remote URLs are blocked by most clients).
 */
export function paymentAttachments(): EmailAttachment[] {
  try {
    return PAYMENT_OPTIONS.filter((o) => o.qrFile).map((o) => {
      const file = readFileSync(
        join(process.cwd(), "public", "payment", o.qrFile as string),
      );
      return {
        filename: o.qrFile as string,
        content: file.toString("base64"),
        content_id: PAYMENT_CIDS[o.name],
        type: "image/png",
      };
    });
  } catch (err) {
    console.error(
      "[email] could not read payment QR attachment:",
      err instanceof Error ? err.message : String(err),
    );
    return [];
  }
}

/** cid: URL used in <img> tags for a given payment option. */
function paymentCidUrl(option: PaymentOption): string {
  return `cid:${PAYMENT_CIDS[option.name]}`;
}

/**
 * Inner content for a scan-to-pay payment card. Only called for options that
 * carry a QR (Venmo/PayPal/Cash App), so the QR image is always inline.
 */
function qrCardContentHtml(o: PaymentOption): string {
  return [
    `<img src="${paymentCidUrl(o)}" width="120" height="120" alt="Pay via ${o.name}" style="display:block;margin:0 auto 8px;width:120px;height:120px;border-radius:6px;" />`,
    `<div style="font-weight:bold;font-size:15px;color:#b3602f;margin-bottom:2px;">${o.name}</div>`,
    `<div style="font-size:12px;color:#6b5d4d;word-break:break-all;">${o.handle}</div>`,
  ].join("\n");
}

/**
 * One QR card (wrapped in an <a> to its payment app) for the row of three
 * scan-to-pay methods below the heading. Zelle is intentionally NOT included
 * here: it has no QR-launchable URL, so it renders as a full-width bar instead.
 */
function qrCardsHtml(): string {
  return PAYMENT_OPTIONS.filter((o) => o.qrFile)
    .map((o) => {
      const card = [
        'style="display:inline-block;width:150px;margin:8px;padding:14px;border:1px solid #e7ddc9;border-radius:12px;text-align:center;background:#fffdf7;vertical-align:top;text-decoration:none;color:#3f3527;"',
      ].join(" ");
      return [
        `<a href="${o.url}" target="_blank" rel="noopener" ${card}>`,
        qrCardContentHtml(o),
        `</a>`,
      ].join("\n");
    })
    .join("\n");
}

/** Zelle's exact instruction line (owner wording, no hyphens or em dashes). */
const ZELLE_INSTRUCTION =
  "Zelle isn't scan friendly, so just open your bank's app and send to this email.";

/**
 * Zelle as a single full-width bar BELOW the three QR cards. It has no QR
 * (Zelle has no public pay link), so it renders its handle + a friendly
 * instruction line instead. Same card visual language as the QR cards
 * (background, border, rounded corners) but spans the full column width.
 */
function zelleBarHtml(): string {
  return [
    `<div style="margin:2px auto 22px;padding:16px 18px;border:1px solid #e7ddc9;border-radius:12px;background:#fffdf7;text-align:center;max-width:640px;box-sizing:border-box;">`,
    `  <div style="font-weight:bold;font-size:15px;color:#b3602f;margin-bottom:4px;">Zelle</div>`,
    `  <div style="font-size:14px;color:#3f3527;word-break:break-all;margin-bottom:4px;">jen.johnpetservices@proton.me</div>`,
    `  <div style="font-size:12px;color:#6b5d4d;line-height:1.4;">${ZELLE_INSTRUCTION}</div>`,
    `</div>`,
  ].join("\n");
}

/**
 * Plain-text payment listing for both client-facing text bodies. Lists all four
 * methods with their handles, and appends Zelle's exact instruction line so the
 * no-QR method is just as clear in plain text as it is in the HTML bar.
 */
function paymentTextLines(): string {
  return PAYMENT_OPTIONS.map((o) =>
    o.name === "Zelle"
      ? `  • ${o.name}: ${o.handle} (${ZELLE_INSTRUCTION})`
      : `  • ${o.name}: ${o.handle}`,
  ).join("\n");
}

// ── Editable email templates (owner overrides) ─────────────────────────────

/**
 * Fetch the owner's saved override for a template slug from Convex. Returns
 * null when the owner has not customized this email (or when the lookup fails),
 * so callers fall back to the built in default copy. Never throws; on any
 * failure it returns null so a send is never blocked.
 */
async function fetchEmailTemplateOverride(
  slug: string,
): Promise<{ body?: string; subject?: string } | null> {
  try {
    const rec = await convexQuery("getEmailTemplate", { slug });
    if (!rec) return null;
    return {
      body:
        typeof rec.body === "string" && rec.body.trim() ? rec.body : undefined,
      subject:
        typeof rec.subject === "string" && rec.subject.trim()
          ? rec.subject
          : undefined,
    };
  } catch (err) {
    console.error(
      "[email] could not load template override:",
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/** HTML escape for arbitrary owner written email text. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build a warm, on brand HTML version of an owner edited plain text body. Keeps
 * the plain text and HTML versions in sync whenever the owner has customized an
 * email: both carry the same words. Paragraphs are split on blank lines to
 * mirror the plain text formatting.
 */
function buildOverrideHtml(title: string, body: string): string {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => escapeHtml(line.trim()))
        .filter(Boolean)
        .join("<br/>"),
    )
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 18px;line-height:1.6;">${p}</p>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              ${paragraphs}
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Core send ──────────────────────────────────────────────────────────────

export async function sendEmail({
  to,
  subject,
  body,
  html,
  attachments,
}: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email send");
    return;
  }

  try {
    const payload: Record<string, unknown> = {
      from: `Jen & John's Pet Services <${FROM_EMAIL}>`,
      to: [to],
      subject,
      text: body,
    };
    if (html) {
      payload.html = html;
    }
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        type: a.type,
        content_id: a.content_id,
        disposition: "inline",
      }));
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        `[email] Failed to send to ${to}: HTTP ${response.status}, ${errText}`,
      );
    } else {
      console.log(`[email] Sent "${subject}" to ${to}`);
    }
  } catch (err) {
    console.error(
      `[email] Error sending to ${to}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ── Convenience: fire-and-forget wrappers ──────────────────────────────────

function fireAndForget(promise: Promise<void>, label: string): void {
  promise.catch((err) => {
    console.error(
      `[email] ${label} failed:`,
      err instanceof Error ? err.message : String(err),
    );
  });
}

// ── Builders ───────────────────────────────────────────────────────────────

/**
 * Prices are stored in dollars (e.g. 520 = $520.00) — NOT cents.
 * Matches the fix already applied in src/routes/admin.tsx.
 */
function formatPrice(amount: number): string {
  return "$" + (amount ?? 0).toFixed(2);
}

/** Deposit is half the total, rounded to the nearest dollar. */
function getDepositAmount(totalPrice: number): number {
  return Math.round(totalPrice * 0.5);
}

function summarizePets(pets: unknown): string {
  if (!pets || typeof pets !== "object") return "N/A";
  const p = pets as Record<string, unknown>;
  const parts: string[] = [];
  if (p.adultDogs) parts.push(`${p.adultDogs} dog(s)`);
  if (p.puppies) parts.push(`${p.puppies} pup(s)`);
  if (p.cats) parts.push(`${p.cats} cat(s)`);
  if (p.kittens) parts.push(`${p.kittens} kitten(s)`);
  const other = p.otherSpecies;
  if (Array.isArray(other) && other.length > 0) {
    parts.push(
      other
        .map((o: { name?: string; quantity?: number }) =>
          o.name ? `${o.quantity ?? 1}x ${o.name}` : "",
        )
        .filter(Boolean)
        .join(", "),
    );
  }
  return parts.length > 0 ? parts.join(" + ") : "N/A";
}


/** Pet names as an array in their natural order, for comma-list rendering. */
function petNameArray(
  petDetails: PetDetail[] | undefined,
  petNames: string | undefined,
  pets: unknown,
): string[] {
  if (petDetails && petDetails.length > 0) {
    const names = petDetails.map((p) => p.name.trim()).filter(Boolean);
    if (names.length > 0) return names;
  }
  const joined = friendlyPetNames(petDetails, petNames) ?? summarizePets(pets);
  if (!joined) return [];
  return joined
    .split(" and ")
    .map((s) => s.trim())
    .filter(Boolean);
}
function formatDateStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── 1. New booking request notification (to Jen & John) ────────────────────

/**
 * Owner-only Meet & Greet travel fee line. Returns null when no fee was
 * computed (so the existing emails are unchanged in that case).
 */
function meetGreetOwnerLine(data: NewRequestData): string | null {
  if (data.meetGreetFee === undefined && data.meetGreetOutsideArea === undefined) {
    return null;
  }
  if (data.meetGreetOutsideArea) {
    return `Meet & Greet: Outside service area (suggest free virtual meet & greet)`;
  }
  const miles =
    typeof data.meetGreetDistanceMiles === "number"
      ? ` (${data.meetGreetDistanceMiles} mi one-way)`
      : "";
  return `Meet & Greet Travel Fee: $${Number(data.meetGreetFee ?? 0).toFixed(2)}${miles}`;
}
export function buildNewRequestBody(data: NewRequestData): string {
  // Per-pet list from petDetails (preferred), falling back to the
  // comma-joined petNames string for records saved before petDetails existed.
  const petLines =
    data.petDetails && data.petDetails.length > 0
      ? data.petDetails.map((pet) => `• ${formatPetDetail(pet)}`)
      : data.petNames
        ? [`Pet names: ${data.petNames}`]
        : null;

  const petDetailLines = [
    ...(petLines ?? []),
    data.petAnxieties
      ? `Anxiety triggers: ${data.petAnxieties}`
      : null,
    data.petAnxietyManifestation
      ? `How anxiety shows up: ${data.petAnxietyManifestation}`
      : null,
    data.petSleepsInBed
      ? `Sleeps in bed: ${data.petSleepsInBed.charAt(0).toUpperCase()}${data.petSleepsInBed.slice(1)}`
      : null,
    data.petQuirks ? `Quirks & joys: ${data.petQuirks}` : null,
  ].filter((line) => line !== null);

  return [
    `Howdy Jen & John! 🐾`,
    ``,
    `You have a new booking request from ${data.clientName}.`,
    ``,
    `── Client Details ──`,
    `Name: ${data.clientName}`,
    `Email: ${data.clientEmail}`,
    data.clientPhone ? `Phone: ${data.clientPhone}` : null,
    data.clientAddress ? `Address: ${data.clientAddress}` : null,
    data.hearAboutUs ? `How did you hear about us: ${data.hearAboutUs}` : null,
    data.referredBy ? `Referred by: ${data.referredBy}` : null,
    data.referredBy
      ? `Referral reward: ${data.referralRewardStatus ?? "pending"}`
      : null,
    ``,
    `── Stay Details ──`,
    `Arrival: ${formatDateStr(data.arrivalDate)} at ${data.arrivalTime}`,
    `Departure: ${formatDateStr(data.departureDate)} at ${data.departureTime}`,
    ``,
    `── Pets ──`,
    summarizePets(data.pets),
    ...petDetailLines,
    data.isHoliday ? `⚠️ Holiday rates apply` : null,
    ``,
    `── Price ──`,
    `Total: ${formatPrice(data.totalPrice)}`,
    meetGreetOwnerLine(data),
    ``,
    data.notes ? `── Notes ──\n"${data.notes}"\n` : null,
    `── Manage ──`,
    `Review and approve/decline this request:`,
    ADMIN_DASHBOARD_URL,
    ``,
    `Warmly,`,
    `Your Booking System 🐶`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export async function sendNewRequestNotification(
  data: NewRequestData,
): Promise<void> {
  const subject = `New Booking Request: ${data.clientName}`;
  await sendEmail({
    to: ADMIN_EMAIL,
    subject,
    body: buildNewRequestBody(data),
  });
}
// ── Admin password reset ─────────────────────────────────────────────────
export const PASSWORD_RESET_SUBJECT = "Reset your admin password";
/** Build the plain text body of the password reset email. */
export function buildPasswordResetBody(link: string): string {
  return [
    `You asked to reset the admin password for Jen & John's Pet Services.`,
    ``,
    `Use the link below to set a new password. It expires in 30 minutes.`,
    ``,
    link,
    ``,
    `If you did not request this, you can safely ignore this email.`,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}
/** Build the on brand HTML version of the password reset email. */
export function buildPasswordResetHtml(link: string): string {
  return buildOverrideHtml(
    "Reset your admin password",
    [
      `You asked to reset the admin password for Jen & John's Pet Services.`,
      `Use the link below to set a new password. It expires in 30 minutes.`,
      link,
      `If you did not request this, you can safely ignore this email.`,
    ].join("\n\n"),
  );
}
/** Send the admin password reset email through the standard email path. */
export async function sendPasswordResetEmail(
  link: string,
): Promise<void> {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: PASSWORD_RESET_SUBJECT,
    body: buildPasswordResetBody(link),
    html: buildPasswordResetHtml(link),
  });
}

// ── 2. Approval email (to client + notification to Jen & John) ─────────────

/** Approval email sent to the client (contains deposit + payment instructions). */
export function buildApprovalClientBody(data: NewRequestData): string {
  const depositAmount = data.depositAmount ?? getDepositAmount(data.totalPrice);
  const petSummary =
    friendlyPetNames(data.petDetails, data.petNames) ??
    summarizePets(data.pets);
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;

  return [
    `Hi ${firstName},`,
    ``,
    `Jen & John are available to watch ${petSummary} on ${formatDateStr(data.arrivalDate)} through ${formatDateStr(data.departureDate)}.`,
    ``,
    `── Booking Summary ──`,
    `Arrival: ${formatDateStr(data.arrivalDate)} at ${data.arrivalTime}`,
    `Departure: ${formatDateStr(data.departureDate)} at ${data.departureTime}`,
    `Total Price: ${formatPrice(data.totalPrice)}`,
    ``,
    `── Deposit ──`,
    `To finalize your stay, please send your deposit of ${formatPrice(depositAmount)} via one of the following options:`,
    ``,
    paymentTextLines(),
    ``,
    `Once we receive your deposit, your dates are locked in. We'll reach out before your stay to coordinate arrival details.`,
    ``,
    `The remaining balance is due prior to or upon arrival. If we have not received the remaining payment within three hours of our arrival, we will be unable to proceed with the booking, and the client will need to make alternative arrangements for the remainder of the stay. We ask that any payment delays be communicated to us in advance.`,
    ``,
    `Please review our booking and deposit policies on our website:`,
    `${SITE_BASE_URL}/#faq`,
    ``,
    `Thank you for trusting us with the care of your home and ${petSummary}.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** Build the HTML version of the approval email (client-facing). */
export function buildApprovalClientHtml(data: NewRequestData): string {
  const depositAmount = data.depositAmount ?? getDepositAmount(data.totalPrice);
  const petSummary =
    friendlyPetNames(data.petDetails, data.petNames) ??
    summarizePets(data.pets);
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;

  const optionCards = qrCardsHtml();
  const zelleBar = zelleBarHtml();

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Your Booking Is Approved!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;">Jen &amp; John are available to watch ${petSummary} on ${formatDateStr(data.arrivalDate)} through ${formatDateStr(data.departureDate)}.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:0.5px;color:#b3602f;text-transform:uppercase;margin-bottom:8px;">Booking Summary</div>
                    <div style="margin:0;">Arrival: ${formatDateStr(data.arrivalDate)} at ${data.arrivalTime}</div>
                    <div style="margin:0;">Departure: ${formatDateStr(data.departureDate)} at ${data.departureTime}</div>
                    <div style="margin:0;">Total Price: <strong>${formatPrice(data.totalPrice)}</strong></div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 10px;font-size:16px;color:#3f3527;">To finalize your stay, please send your deposit of <strong>${formatPrice(depositAmount)}</strong> via one of the following options:</p>

              <div style="text-align:center;margin:0 auto 8px;">
                ${optionCards}
              </div>
              ${zelleBar}

              <p style="margin:0 0 18px;">Once we receive your deposit, your dates are locked in. We'll reach out before your stay to coordinate arrival details.</p>
              <p style="margin:0 0 18px;">The remaining balance is due prior to or upon arrival. If we have not received the remaining payment within three hours of our arrival, we will be unable to proceed with the booking, and the client will need to make alternative arrangements for the remainder of the stay. We ask that any payment delays be communicated to us in advance.</p>
              <p style="margin:0 0 18px;">Please review our booking and deposit policies on our website: <a href="${SITE_BASE_URL}/#faq" style="color:#b3602f;text-decoration:underline;">${SITE_BASE_URL}/#faq</a></p>

              <p style="margin:0 0 18px;">Thank you for trusting us with the care of your home and ${petSummary}.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Internal notification to Jen & John when a booking is approved. */
export function buildApprovalAdminBody(data: NewRequestData): string {
  const depositAmount = data.depositAmount ?? getDepositAmount(data.totalPrice);
  return [
    `Howdy Jen & John!`,
    ``,
    `You've approved the booking request for ${data.clientName}.`,
    ``,
    `Deposit of ${formatPrice(depositAmount)} requested. Watch for their payment via Zelle or Venmo.`,
    ``,
    `── Quick Recap ──`,
    `Client: ${data.clientName} (${data.clientEmail})`,
    `Dates: ${formatDateStr(data.arrivalDate)} – ${formatDateStr(data.departureDate)}`,
    `Total: ${formatPrice(data.totalPrice)}`,
    meetGreetOwnerLine(data),
    ``,
    `── Manage ──`,
    ADMIN_DASHBOARD_URL,
  ].join("\n");
}

export async function sendApprovalEmail(
  data: NewRequestData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("approval");
  const defaultBody = buildApprovalClientBody(data);
  const injected = options?.body?.trim();
  // A test of an unedited template passes the same default copy we build here,
  // so it renders the full rich HTML; only an edited override swaps to the
  // styled owner HTML, exactly as production would with a saved override.
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const clientBody = injected || override?.body || defaultBody;
  const clientHtml = hasCustomText
    ? buildOverrideHtml("Your Booking Is Approved!", clientBody)
    : buildApprovalClientHtml(data);
  const clientSubject =
    options?.subject?.trim() ||
    override?.subject ||
    `Your Booking Is Approved!`;
  const to = options?.to || data.clientEmail;
  fireAndForget(
    sendEmail({
      to,
      subject: clientSubject,
      body: clientBody,
      html: clientHtml,
      attachments: paymentAttachments(),
    }),
    "sendApprovalEmail (client)",
  );

  // Notification to Jen & John. A test send goes only to the test recipient, so
  // it skips the extra admin notification to avoid a misleading duplicate.
  if (!options?.isTest) {
    const adminSubject = `Booking approved for ${data.clientName}`;
    fireAndForget(
      sendEmail({
        to: ADMIN_EMAIL,
        subject: adminSubject,
        body: buildApprovalAdminBody(data),
      }),
      "sendApprovalEmail (admin notification)",
    );
  }
}

// ── 3. Decline email (to client) ───────────────────────────────────────────

/** Default plain-text body for the decline email (owner wording). */
export function buildDeclineBody(data: NewRequestData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  return [
    `Hi ${firstName},`,
    ``,
    `Thank you so much for reaching out to Jen & John's Pet Services! We're truly grateful you considered us for your pet-sitting needs.`,
    ``,
    `Unfortunately, we're unable to accommodate your requested dates (${formatDateStr(data.arrivalDate)} – ${formatDateStr(data.departureDate)}) this time around. Our calendar fills up quickly, and we hate having to say no.`,
    ``,
    `Please don't hesitate to check other dates or reach out to us directly at ${ADMIN_EMAIL}, we'd love to find a time that works and give your pets the care they deserve.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

export async function sendDeclineEmail(
  data: NewRequestData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("decline");
  const defaultBody = buildDeclineBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Update on your booking request", body)
    : undefined;
  const effectiveSubject =
    options?.subject?.trim() ||
    override?.subject ||
    `Update on your booking request with Jen & John's Pet Services`;
  sendEmail({
    to: options?.to || data.clientEmail,
    subject: effectiveSubject,
    body,
    html,
  });
}

// ── 3.5 Deposit received confirmation email (to client) ────────────────────

export interface DepositReceivedData {
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  totalPrice: number;
  depositAmount: number;
  remainingBalance: number;
  petNames?: string;
}

/** Plain-text confirmation that the deposit was received. */
export function buildDepositReceivedBody(data: DepositReceivedData): string {
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  return [
    `Hi ${firstName},`,
    ``,
    `We've received your deposit and your dates are now officially secured.`,
    ``,
    `── Booking Details ──`,
    `Arrival: ${formatDateStr(data.arrivalDate)}`,
    `Departure: ${formatDateStr(data.departureDate)}`,
    `Deposit amount paid: ${formatPrice(data.depositAmount)}`,
    `Remaining balance: ${formatPrice(data.remainingBalance)}`,
    ``,
    `Just As A Reminder:`,
    `The remaining balance is due prior to or upon arrival. If we have not received the remaining payment within three hours of our arrival, we will be unable to proceed with the booking, and the client will need to make alternative arrangements for the remainder of the stay. We ask that any payment delays be communicated to us in advance.`,
    ``,
    `Please review our booking and deposit policies on our website:`,
    `${SITE_BASE_URL}/#faq`,
    ``,
    `Thanks again for trusting us with your home and ${petRef}.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** HTML confirmation that the deposit was received (client-facing). */
export function buildDepositReceivedHtml(data: DepositReceivedData): string {
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Your Booking Is Finalized!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;">We've received your deposit and your dates are now officially secured.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:0.5px;color:#b3602f;text-transform:uppercase;margin-bottom:8px;">Booking Details</div>
                    <div style="margin:0;">Arrival: ${formatDateStr(data.arrivalDate)}</div>
                    <div style="margin:0;">Departure: ${formatDateStr(data.departureDate)}</div>
                    <div style="margin:0;">Deposit amount paid: <strong>${formatPrice(data.depositAmount)}</strong></div>
                    <div style="margin:0;">Remaining balance: <strong>${formatPrice(data.remainingBalance)}</strong></div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px;"><strong>Just As A Reminder:</strong></p>
              <p style="margin:0 0 18px;">The remaining balance is due prior to or upon arrival. If we have not received the remaining payment within three hours of our arrival, we will be unable to proceed with the booking, and the client will need to make alternative arrangements for the remainder of the stay. We ask that any payment delays be communicated to us in advance.</p>
              <p style="margin:0 0 18px;">Please review our booking and deposit policies on our website: <a href="${SITE_BASE_URL}/#faq" style="color:#b3602f;text-decoration:underline;">${SITE_BASE_URL}/#faq</a></p>
              <p style="margin:0 0 18px;">Thanks again for trusting us with your home and ${petRef}.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Default subject line for the deposit-received email. */
export const DEPOSIT_RECEIVED_SUBJECT = "Your Booking Is Finalized!";

/** Send the deposit-received confirmation email to the client. */
export async function sendDepositReceivedEmail(
  data: DepositReceivedData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("deposit-received");
  const defaultBody = buildDepositReceivedBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Your Booking Is Finalized!", body)
    : buildDepositReceivedHtml(data);
  const subject =
    options?.subject?.trim() || override?.subject || DEPOSIT_RECEIVED_SUBJECT;
  return sendEmail({
    to: options?.to || data.clientEmail,
    subject,
    body,
    html,
  });
}

// ── 3.6 Balance received confirmation email (to client) ────────────────────

export interface BalanceReceivedData {
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  /** The remaining-balance amount received (total minus deposit). */
  balanceAmount: number;
  /** How the remaining balance was received (Zelle, Venmo, PayPal, Cash App). */
  balancePaymentMethod?: string;
  totalPrice: number;
  petNames?: string;
}

/** Plain-text confirmation that the remaining balance was received. */
export function buildBalanceReceivedBody(data: BalanceReceivedData): string {
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const method = data.balancePaymentMethod?.trim()
    ? ` via ${data.balancePaymentMethod.trim()}`
    : "";
  return [
    `Hi ${firstName},`,
    ``,
    `Great news! We've received the remaining balance for your upcoming stay.`,
    ``,
    `Remaining balance received: ${formatPrice(data.balanceAmount)}${method}`,
    ``,
    `With this payment, your stay is now fully paid in full. Thank you so much for your trust.`,
    ``,
    `Arrival: ${formatDateStr(data.arrivalDate)}`,
    `Departure: ${formatDateStr(data.departureDate)}`,
    ``,
    `We can't wait to care for ${petRef}. If you have any questions, just reply to this email.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** HTML confirmation that the remaining balance was received (client-facing). */
export function buildBalanceReceivedHtml(data: BalanceReceivedData): string {
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const method = data.balancePaymentMethod?.trim()
    ? ` via ${data.balancePaymentMethod.trim()}`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Your Stay Is Fully Paid!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;">Great news! We've received the remaining balance for your upcoming stay.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;margin:0 0 18px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:0.5px;color:#b3602f;text-transform:uppercase;margin-bottom:8px;">Payment Confirmation</div>
                    <div style="margin:0;">Remaining balance received: <strong>${formatPrice(data.balanceAmount)}</strong>${method}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px;">With this payment, your stay is now fully paid in full. Thank you so much for your trust.</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;margin:0 0 18px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:0.5px;color:#b3602f;text-transform:uppercase;margin-bottom:8px;">Your Stay</div>
                    <div style="margin:0;">Arrival: ${formatDateStr(data.arrivalDate)}</div>
                    <div style="margin:0;">Departure: ${formatDateStr(data.departureDate)}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 18px;">We can't wait to care for ${petRef}. If you have any questions, just reply to this email.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Default subject line for the balance-received email. */
export const BALANCE_RECEIVED_SUBJECT = "Your Stay Is Fully Paid!";

/** Send the balance-received confirmation email to the client. */
export async function sendBalanceReceivedEmail(
  data: BalanceReceivedData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("balance-received");
  const defaultBody = buildBalanceReceivedBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Your Stay Is Fully Paid!", body)
    : buildBalanceReceivedHtml(data);
  const subject =
    options?.subject?.trim() ||
    override?.subject ||
    BALANCE_RECEIVED_SUBJECT;
  return sendEmail({
    to: options?.to || data.clientEmail,
    subject,
    body,
    html,
  });
}

// ── 3.9 Cancellation notice (to client) ───────────────────────────────────

export interface CancellationData {
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  /** Computed refund in dollars (0 when non refundable). */
  refundAmount: number;
  isHoliday?: boolean;
  /** Recorded payment method on the booking, or undefined for "on file". */
  paymentMethod?: string;
  petNames?: string;
}

/**
 * Default plain text cancellation notice. States the refund (or that it is non
 * refundable) and how the client paid. Addresses the client by first name.
 * No hyphens, no em dashes (owner copy barrier).
 */
export function buildCancellationBody(data: CancellationData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const method =
    data.paymentMethod && data.paymentMethod.trim()
      ? `via ${data.paymentMethod.trim()}`
      : "through the payment method we have on file";

  const refundLine =
    data.refundAmount > 0
      ? `A refund of ${formatPrice(data.refundAmount)} will be returned to you ${method}.`
      : data.isHoliday
        ? `Because this was a holiday booking, which is full and non refundable at the time of booking, no refund is due.`
        : `Because this cancellation falls within two weeks of your stay start (or within 72 hours), your payment is non refundable per our policy, so no refund is due. Your payment was recorded ${method}.`;

  return [
    `Hi ${firstName},`,
    ``,
    `This is a quick note to let you know that your booking with Jen & John's Pet Services has been cancelled.`,
    ``,
    `Your stay was scheduled for ${formatDateStr(data.arrivalDate)} through ${formatDateStr(data.departureDate)}.`,
    ``,
    refundLine,
    ``,
    `If you have any questions, just reply to this email and we'll be happy to help.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** Default subject line for the cancellation email. */
export const CANCELLATION_SUBJECT = "Update on your booking with Jen & John's Pet Services";

/** Send the cancellation notice to the client (override aware). */
export async function sendCancellationEmail(
  data: CancellationData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("cancellation");
  const defaultBody = buildCancellationBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Update on your booking", body)
    : undefined;
  const subject =
    options?.subject?.trim() || override?.subject || CANCELLATION_SUBJECT;
  return sendEmail({
    to: options?.to || data.clientEmail,
    subject,
    body,
    html,
  });
}

// ── 3.95 Reschedule confirmation (to client) ──────────────────────────────

export interface RescheduleData {
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  arrivalTime: string;
  departureDate: string;
  departureTime: string;
  /** New total after the reschedule, in dollars. */
  totalPrice: number;
  /** Remaining balance due (already floored at 0). */
  balanceDue: number;
  petNames?: string;
}

/**
 * Default plain text reschedule confirmation. Confirms the new dates, notes
 * the deposit was kept and no refund was issued, and states the remaining
 * balance. Addresses the client by first name. No hyphens, no em dashes.
 */
export function buildRescheduleBody(data: RescheduleData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  const balanceLine =
    data.balanceDue > 0
      ? `The remaining balance due is ${formatPrice(data.balanceDue)}.`
      : `There is no remaining balance due, you're all set.`;

  return [
    `Hi ${firstName},`,
    ``,
    `We've updated your booking with Jen & John's Pet Services.`,
    ``,
    `Your stay for ${petRef} has been rescheduled to:`,
    ``,
    `Arrival: ${formatDateStr(data.arrivalDate)} at ${data.arrivalTime}`,
    `Departure: ${formatDateStr(data.departureDate)} at ${data.departureTime}`,
    ``,
    `Your deposit has been kept and no refund was issued. Your updated total is ${formatPrice(data.totalPrice)}. ${balanceLine}`,
    ``,
    `If you have any questions, just reply to this email and we'll be happy to help.`,
    ``,
    `Thank you for trusting us with the care of your home and ${petRef}.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** Default subject line for the reschedule email. */
export const RESCHEDULE_SUBJECT = "Your Booking Has Been Rescheduled";

/** Send the reschedule confirmation to the client (override aware). */
export async function sendRescheduleEmail(
  data: RescheduleData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("reschedule");
  const defaultBody = buildRescheduleBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Your Booking Has Been Rescheduled", body)
    : undefined;
  const subject =
    options?.subject?.trim() || override?.subject || RESCHEDULE_SUBJECT;
  return sendEmail({ to: options?.to || data.clientEmail, subject, body, html });
}

// ── 3.7 Deposit reminder (to client, one time if deposit unpaid) ───────────

export interface DepositReminderData {
  clientName: string;
  clientEmail: string;
  arrivalDate: string;
  departureDate: string;
  depositAmount: number;
  petNames?: string;
}

/** Default subject line for the deposit reminder email. */
export const DEPOSIT_REMINDER_SUBJECT = "A Friendly Reminder About Your Deposit";

/**
 * Default plain text deposit reminder. Sent once, 24h after approval, only if
 * the deposit has not yet been marked received. Addresses the client by first
 * name, gives the payment methods the owner asked for. No em dashes, no hyphens
 * in the prose (the phone number is data, not discretionary copy).
 */
export function buildDepositReminderBody(data: DepositReminderData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  return [
    `Hi ${firstName},`,
    ``,
    `Thank you again for booking with Jen & John's Pet Services for ${formatDateStr(data.arrivalDate)} through ${formatDateStr(data.departureDate)}.`,
    ``,
    `Just a friendly reminder that your deposit of ${formatPrice(data.depositAmount)} is due and it holds your dates for you.`,
    ``,
    `To pay, you can send it via:`,
    paymentTextLines(),
    ``,
    `Once we receive your deposit, everything is locked in and you're all set.`,
    ``,
    `If you have already sent it, thank you so much, you can just disregard this note.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** Send the one time deposit reminder to the client (override aware). */
export async function sendDepositReminderEmail(
  data: DepositReminderData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("deposit-reminder");
  const defaultBody = buildDepositReminderBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("A Friendly Reminder About Your Deposit", body)
    : undefined;
  const subject =
    options?.subject?.trim() || override?.subject || DEPOSIT_REMINDER_SUBJECT;
  return sendEmail({ to: options?.to || data.clientEmail, subject, body, html });
}

// ── 3.72 Resend my return code (to client, client initiated) ───────────────

export interface ResendCodeData {
  clientName: string;
  clientEmail: string;
  returnCode: string;
  petNames?: string;
}

/** Default subject line for the resend-code email. */
export const RESEND_CODE_SUBJECT = "Your Return Code";

/**
 * Default plain text resend-code email sent when a client uses the "Lost your
 * code?" link. Reminds them to keep the code. Addressed by first name only.
 * No em dashes, no hyphens.
 */
export function buildResendCodeBody(data: ResendCodeData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  return [
    `Hi ${firstName},`,
    ``,
    `You asked us to resend your return code, so here it is:`,
    ``,
    `  ${data.returnCode}`,
    ``,
    `Please keep this code handy. Next time you make a booking, enter it along with your email and we'll fill in ${petRef}'s details for you automatically.`,
    ``,
    `If you didn't ask for this, no need to worry, you can just ignore this email.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/**
 * Build the HTML version of the resend-code email (client-facing), showing the
 * code prominently like the profile-saved email does.
 */
export function buildResendCodeHtml(data: ResendCodeData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Your Return Code</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 10px;">You asked us to resend your return code, so here it is:</p>
              <div style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;padding:18px 22px;text-align:center;margin:0 0 20px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:#b3602f;letter-spacing:3px;">${data.returnCode}</span>
              </div>
              <p style="margin:0 0 18px;">Please keep this code handy. Next time you make a booking, enter it along with your email and we'll fill in ${petRef}'s details for you automatically.</p>
              <p style="margin:0 0 18px;">If you didn't ask for this, no need to worry, you can just ignore this email.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Send the resend-code email to the client (override aware). */
export async function sendResendCodeEmail(
  data: ResendCodeData,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("resendCode");
  const defaultBody = buildResendCodeBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Your Return Code", body)
    : buildResendCodeHtml(data);
  const subject =
    options?.subject?.trim() || override?.subject || RESEND_CODE_SUBJECT;
  return sendEmail({ to: options?.to || data.clientEmail, subject, body, html });
}

// ── 3.75 Pet profile saved / here's your return code (to client) ───────────

interface ProfileSavedData {
  clientName: string;
  clientEmail: string;
  returnCode: string;
  petNames?: string;
}

/**
 * Plain-text "your pet profile is saved, here's your code" email sent the first
 * time a client's booking is approved. Short and warm, consistent with the
 * other client emails. No hyphens, no em dashes.
 */
export function buildProfileSavedBody(data: ProfileSavedData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  return [
    `Hi ${firstName},`,
    ``,
    `We've saved ${petRef}'s details so your next booking takes just a few seconds.`,
    ``,
    `Here's your personal return code:`,
    ``,
    `  ${data.returnCode}`,
    ``,
    `Next time you request a booking, enter this code along with your email and we'll fill in ${petRef}'s information for you automatically. Keep this code handy, it's yours whenever you book again.`,
    ``,
    `Thank you again for trusting us with your home and ${petRef}.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/** HTML version of the profile-saved email (client-facing). */
export function buildProfileSavedHtml(data: ProfileSavedData): string {
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;
  const petRef = data.petNames?.trim() ? data.petNames.trim() : "your pets";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Your Pet Profile Is Saved!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;">We've saved ${petRef}'s details so your next booking takes just a few seconds.</p>
              <p style="margin:0 0 10px;">Here's your personal return code:</p>
              <div style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;padding:18px 22px;text-align:center;margin:0 0 20px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:#b3602f;letter-spacing:3px;">${data.returnCode}</span>
              </div>
              <p style="margin:0 0 18px;">Next time you request a booking, enter this code along with your email and we'll fill in ${petRef}'s information for you automatically. Keep this code handy, it's yours whenever you book again.</p>
              <p style="margin:0 0 18px;">Thank you again for trusting us with your home and ${petRef}.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Default subject line for the profile-saved email. */
export const PROFILE_SAVED_SUBJECT = "Your Pet Profile Is Saved!";

/** Send the profile-saved confirmation email to the client. */
export function sendProfileSavedEmail(
  data: ProfileSavedData,
): Promise<void> {
  return sendEmail({
    to: data.clientEmail,
    subject: PROFILE_SAVED_SUBJECT,
    body: buildProfileSavedBody(data),
    html: buildProfileSavedHtml(data),
  });
}

// ── 4. Post-completion review + referral + tip email (to client) ───────────

/** The four payment methods, each with its own handle, for the tip ask. */
function paymentHandles(): string {
  return paymentTextLines();
}

// Exact copy blocks for the end-of-stay email (owner wording, no hyphens/em dash).

const REVIEW_ASK = `If you had a great experience, a positive review would mean the world to us. Quality reviews are how other pet parents find us and your kind words really help grow our business.`;

const REVIEW_INTRO = `And here's the easy part.... You can copy and paste the same review onto all three sites. No need to write anything new, we would just be so grateful if you shared it on the following:`;

const REFERRAL_PARAGRAPH = `Know someone who needs a pair of trusted pet sitters? Refer them our way, and once they book with us and complete their first stay, you'll get 10% off your next stay.`;

const REFERRAL_DISCLAIMER = `One referral discount may be applied per booking.`;

const REFERRAL_NO_LIMIT = `There's no limit, so refer as many friends as you'd like.`;

const TIP_HEADING = `Tips Are Always Appreciated (Never Expected)`;

const TIP_PARAGRAPH = `We love what we do and caring for your pets like they're our own is a joy. That said, if you felt like we went above and beyond, tips are always welcome and deeply appreciated. Every bit helps us keep showing up with the same love, care, and attention to detail your pets deserve.`;

/** Plain-text version of the end-of-stay thank-you email. */
export function buildPostCompletionBody(data: NewRequestData): string {
  const petSummary =
    friendlyPetNames(data.petDetails, data.petNames) ?? summarizePets(data.pets);
  const petNamesA = petNameArray(data.petDetails, data.petNames, data.pets);
  const petOpening =
    petNamesA.length > 1
      ? `${petNamesA.join(", ")},`
      : petNamesA[0] ?? petSummary;
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;

  const reviewLines = REVIEW_SITES.map(
    (s) => `  ${s.name}: ${s.url}`,
  ).join("\n");

  return [
    `Hi ${firstName},`,
    ``,
    `It was a joy to care for ${petOpening} and your home!`,
    ``,
    REVIEW_ASK,
    ``,
    REVIEW_INTRO,
    ``,
    reviewLines,
    ``,
    `${REFERRAL_PARAGRAPH} ${REFERRAL_DISCLAIMER} ${REFERRAL_NO_LIMIT}`,
    ``,
    TIP_HEADING,
    TIP_PARAGRAPH,
    ``,
    `You can send a tip however is easiest for you:`,
    ``,
    paymentHandles(),
    ``,
    `Thanks again and we're looking forward to caring for ${petSummary} again soon.`,
    ``,
    `Warmly,`,
    `Jen & John's Pet Services`,
  ].join("\n");
}

/**
 * Review card icon. All three cards use one capitalized letter in a warm
 * brown/terracotta circle (Google = G, Facebook = F, NextDoor = N) so the row
 * reads as one consistent, on-brand set. A distinct pictorial emoji route was
 * considered for Google/Facebook but there is no warm, friendly, on-brand
 * emoji for a brand like there is for a house, so the monogram circle keeps
 * all three visually identical and professional.
 */
function reviewCardIcon(name: string): string {
  const letters: Record<string, string> = {
    Google: "G",
    Facebook: "F",
    Nextdoor: "N",
  };
  const letter = letters[name] ?? name.charAt(0).toUpperCase();
  return `<div style="width:52px;height:52px;margin:0 auto 10px;border-radius:50%;background:linear-gradient(135deg,#c97a45,#b3602f);color:#ffffff;font-size:26px;font-weight:bold;line-height:52px;text-align:center;font-family:Georgia,'Times New Roman',serif;box-shadow:0 2px 6px rgba(179,96,47,0.35);">${letter}</div>`;
}

/** Build the HTML version of the end-of-stay thank-you email (client-facing). */
export function buildPostCompletionHtml(data: NewRequestData): string {
  const petSummary =
    friendlyPetNames(data.petDetails, data.petNames) ?? summarizePets(data.pets);
  const petNamesA = petNameArray(data.petDetails, data.petNames, data.pets);
  const petOpening =
    petNamesA.length > 1
      ? `${petNamesA.join(", ")},`
      : petNamesA[0] ?? petSummary;
  const firstName = data.clientName.trim().split(/\s+/)[0] || data.clientName;

  const reviewCards = REVIEW_SITES.map((s) => {
    const card = [
      'style="display:inline-block;width:150px;margin:8px;padding:16px 14px;border:1px solid #e7ddc9;border-radius:12px;text-align:center;background:#fffdf7;vertical-align:top;text-decoration:none;color:#3f3527;"',
    ].join(" ");
    return [
      `<a href="${s.url}" target="_blank" rel="noopener" ${card}>`,
      `  ${reviewCardIcon(s.name)}`,
      `  <div style="font-weight:bold;font-size:15px;color:#b3602f;">Leave a ${s.name} review</div>`,
      `</a>`,
    ].join("\n");
  }).join("\n");

  const optionCards = qrCardsHtml();
  const zelleBar = zelleBarHtml();

  const referralP = `${REFERRAL_PARAGRAPH} ${REFERRAL_DISCLAIMER} ${REFERRAL_NO_LIMIT}`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4efe6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #e7ddc9;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#b3602f;color:#ffffff;padding:26px 34px;">
              <h1 style="margin:0;font-size:22px;line-height:1.3;">Thank You For Your Trust!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 34px;color:#3f3527;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 18px;">Hi ${firstName},</p>
              <p style="margin:0 0 18px;">It was a joy to care for ${petOpening} and your home!</p>

              <p style="margin:0 0 14px;">${REVIEW_ASK}</p>
              <p style="margin:0 0 18px;">${REVIEW_INTRO}</p>

              <div style="text-align:center;margin:0 auto 22px;">
                ${reviewCards}
              </div>

              <p style="margin:0 0 22px;">${referralP}</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf7ef;border:1px solid #efe5d2;border-radius:10px;margin:0 0 18px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <div style="font-size:13px;font-weight:bold;letter-spacing:0.5px;color:#b3602f;text-transform:uppercase;margin-bottom:8px;">${TIP_HEADING}</div>
                    <p style="margin:0;">${TIP_PARAGRAPH}</p>
                  </td>
                </tr>
              </table>

              <div style="text-align:center;margin:0 auto 8px;">
                ${optionCards}
              </div>
              ${zelleBar}

              <p style="margin:0 0 18px;">Thanks again and we're looking forward to caring for ${petSummary} again soon.</p>
              <p style="margin:0;">Warmly,</p>
              <p style="margin:0;">Jen &amp; John's Pet Services</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Default subject line for the end-of-stay email. */
export function postCompletionSubject(data: NewRequestData): string {
  const petSummary =
    friendlyPetNames(data.petDetails, data.petNames) ?? summarizePets(data.pets);
  return `Thank You For Trusting Us With Your Home And ${petSummary}!`;
}

/** Send the end-of-stay thank-you email (review + referral + tip ask). */
export async function sendPostCompletionEmail(
  data: NewRequestData,
  subjectOverride?: string,
  options?: SendOptions,
): Promise<void> {
  const override = await fetchEmailTemplateOverride("post-completion");
  const defaultBody = buildPostCompletionBody(data);
  const injected = options?.body?.trim();
  const hasCustomText =
    (Boolean(injected) && injected !== defaultBody) ||
    Boolean(override?.body?.trim());
  const body = injected || override?.body || defaultBody;
  const html = hasCustomText
    ? buildOverrideHtml("Thank You For Your Trust!", body)
    : buildPostCompletionHtml(data);
  const subject =
    options?.subject?.trim() ||
    override?.subject ||
    subjectOverride ||
    postCompletionSubject(data);

  return sendEmail({
    to: options?.to || data.clientEmail,
    subject,
    body,
    html,
    attachments: paymentAttachments(),
  });
}

// ── Admin "Send Test" (live demonstration copy) ────────────────────────────

export interface AdminSendTestEmailArgs {
  slug: string;
  subject?: string;
  body?: string;
  recipient: string;
}

/**
 * Dispatch a demonstration copy of an email to a chosen recipient using the
 * editor's current subject/body (falling back to the built in default when
 * blank) and realistic sample data.
 *
 * This is a pure demonstration path: it reuses the exact override aware senders
 * and their rich HTML/QR attachment builders so the test looks like the real
 * email, but passes `isTest` so a sender can never make a write side effect
 * (no one-time claims, no status updates, no scheduled jobs). Unhandled or
 * future slugs fall back to a generic test email rather than erroring, so
 * adding a new slug later is just one more case in the switch below.
 */
export async function sendTestEmail(args: AdminSendTestEmailArgs): Promise<void> {
  const recipient = (args.recipient || ADMIN_EMAIL).trim();
  const options: SendOptions = {
    to: recipient,
    subject: args.subject,
    body: args.body,
    isTest: true,
  };

  switch (args.slug) {
    case "approval":
      return sendApprovalEmail(SAMPLE_REQUEST, options);
    case "decline":
      return sendDeclineEmail(SAMPLE_REQUEST, options);
    case "post-completion":
      return sendPostCompletionEmail(SAMPLE_REQUEST, undefined, options);
    case "deposit-received":
      return sendDepositReceivedEmail(SAMPLE_DEPOSIT, options);
    case "balance-received":
      return sendBalanceReceivedEmail(SAMPLE_BALANCE, options);
    case "cancellation":
      return sendCancellationEmail(SAMPLE_CANCELLATION, options);
    case "reschedule":
      return sendRescheduleEmail(SAMPLE_RESCHEDULE, options);
    case "deposit-reminder":
      return sendDepositReminderEmail(SAMPLE_DEPOSIT_REMINDER, options);
    case "resendCode":
      return sendResendCodeEmail(SAMPLE_RESEND_CODE, options);
    default:
      return sendGenericTestEmail(args.slug, args.subject, args.body, recipient);
  }
}

/**
 * Generic demonstration email for any future or unhandled template slug. Uses
 * the editor's copy when given, otherwise a plain generic message, so no slug
 * ever blocks a test send with an error.
 */
async function sendGenericTestEmail(
  slug: string,
  subject: string | undefined,
  body: string | undefined,
  recipient: string,
): Promise<void> {
  // Hyphens and underscores in a slug become spaces so the label reads cleanly.
  const label = slug.replace(/[-_]/g, " ");
  const bodyText =
    body?.trim() ||
    `This is a test email for the ${label} template with sample data.`;
  const subjectLine = subject?.trim() || `Test email: ${label}`;
  return sendEmail({
    to: recipient,
    subject: subjectLine,
    body: bodyText,
    html: buildOverrideHtml("Test Email", bodyText),
  });
}
