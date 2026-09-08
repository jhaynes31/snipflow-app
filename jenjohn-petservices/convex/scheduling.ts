import { action, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Shared secret that authorizes the site's /api/post-completion endpoint to
 * send the end-of-stay email. Kept in sync with POST_COMPLETION_SECRET in the
 * site's .env. The Convex deployment key has no env:write permission, so this
 * is embedded server-side instead of reading a Convex environment variable.
 * It is server-only code and never shipped to the client.
 */
export const POST_COMPLETION_SECRET =
  process.env.POST_COMPLETION_SECRET ||
  "4980baf795325c7080b4e245f8e168392a237434eb7f8b86";

/**
 * Shared secret that authorizes the site's /api/deposit-reminder endpoint to
 * send the one time deposit reminder. Kept in sync with
 * DEPOSIT_REMINDER_SECRET in the site's .env. Separate secret from the
 * post completion token so one leak can't cover both callbacks.
 */
export const DEPOSIT_REMINDER_SECRET =
  process.env.DEPOSIT_REMINDER_SECRET ||
  "d3c91a07b4e258f6c9a10d3b7e4f8c2a6b0d5e1f";

/**
 * Convert a client-entered departure ("YYYY-MM-DD" + 24h "HH:MM") into an
 * absolute epoch timestamp (ms) for Convex scheduling.
 *
 * Jen & John operate in the US Eastern timezone, so we interpret the
 * wall-clock departure the client picked as America/New_York time. This is
 * DST-aware, so a 6:00 PM departure in August fires at 6:00 PM Eastern.
 */
export function departureTimestampEpoch(
  dateStr: string,
  timeStr: string,
): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  const asUTC = Date.UTC(y, (mo || 1) - 1, d || 1, hh || 0, mi || 0);
  // Offset (ms) to add to a UTC reading so it reads as Eastern wall time.
  return asUTC + easternUtcOffsetMs(new Date(asUTC));
}

/** UTC offset in ms to add so a UTC reading becomes America/New_York wall time. */
function easternUtcOffsetMs(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "longOffset",
    hour12: false,
  }).formatToParts(date);
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value;
  const m = tzName ? tzName.match(/GMT([+-])(\d{2}):(\d{2})/) : null;
  if (!m) return 0;
  const hours = Number(m[2]) + Number(m[3]) / 60;
  const sign = m[1] === "-" ? 1 : -1;
  return sign * hours * 60 * 60 * 1000;
}

/**
 * Scheduled action fired at the client's departure date + time. It calls back
 * to the site's own HTTP endpoint (which holds the Resend key) so the single
 * email-sending path in src/lib/email.ts is reused.
 *
 * The site endpoint sends the email and, on success, we record that the
 * end-of-stay email was sent for this request (idempotency + verification).
 */
export const sendPostCompletion = action({
  args: {
    siteUrl: v.string(),
    token: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const res = await fetch(`${args.siteUrl}/api/post-completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: args.token, data: args.data }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(
          `[postCompletion] endpoint HTTP ${res.status}: ${text.slice(0, 500)}`,
        );
        return { ok: false };
      }
      const requestId = args.data && args.data.requestId;
      if (requestId) {
        await ctx.runMutation(internal.scheduling.markPostCompletionSent, {
          requestId,
        });
      }
      return { ok: true };
    } catch (err) {
      console.error(
        "[postCompletion] action error:",
        err instanceof Error ? err.message : String(err),
      );
      return { ok: false };
    }
  },
});

/**
 * Scheduled action fired 24 hours after a booking is approved. It calls back to
 * the site's own /api/deposit-reminder endpoint (which holds the Resend key and
 * decides, based on the booking's CURRENT depositPaid, whether to send). The
 * endpoint atomically claims the one time depositReminderSent guard, so the
 * reminder can never double send even if the job or endpoint retries.
 */
export const sendDepositReminder = action({
  args: {
    siteUrl: v.string(),
    token: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      const res = await fetch(`${args.siteUrl}/api/deposit-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: args.token, data: args.data }),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(
          `[depositReminder] endpoint HTTP ${res.status}: ${text.slice(0, 500)}`,
        );
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error(
        "[depositReminder] action error:",
        err instanceof Error ? err.message : String(err),
      );
      return { ok: false };
    }
  },
});

/** Internal helper: record that a request's end-of-stay email has been sent. */
export const markPostCompletionSent = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.requestId, { postCompletionSent: true });
  },
});
