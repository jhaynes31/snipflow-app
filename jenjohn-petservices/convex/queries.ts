import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * All public query functions live here so Convex HTTP API paths resolve to
 * `queries:<functionName>` (e.g. `queries:getReviews`). Functions exported
 * from `convex/mutations.ts` resolve to `mutations:<functionName>` instead.
 */

export const getReviews = internalQuery({
  args: {},
  handler: async (ctx) => {
    const reviews = await ctx.db.query("reviews").collect();
    // Newest first, matching the ordering the static carousel used.
    return reviews.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      const na = Number.isNaN(da) ? 0 : da;
      const nb = Number.isNaN(db) ? 0 : db;
      return nb - na;
    });
  },
});

// Public availability: returns only BLOCKED records. The model is "all dates
// available unless explicitly marked unavailable", so the public calendar
// treats every date without a record (and every record not marked blocked)
// as available.
export const getAvailability = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("availability")
      .filter((q) => q.eq(q.field("isOpen"), false))
      .collect();
  },
});

// Admin view: ALL availability records (open and explicitly closed) so the
// admin calendar can render the full state of every date that has been set.
export const getAllAvailability = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("availability").collect();
  },
});

// Returns the single adminAuth row ({ salt, hash }) or null when not set yet.
export const getAdminAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("adminAuth").first();
  },
});

export const getRequests = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("requests").order("desc").collect();
  },
});

export const getBookings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").order("desc").collect();
    // Attach pet names, deposit amount, holiday flag, dates/times and pet data
    // from the originating request so the admin can manage cancellations and
    // reschedules (and recompute price) without a second round trip.
    return Promise.all(
      bookings.map(async (b) => {
        const req = b.requestId ? await ctx.db.get(b.requestId) : null;
        // Whether a pet profile exists for this client's email. Used to fill the
        // admin "pet profile saved / return code" checklist row, since approval
        // creates the profile but does not persist a flag on the request. The
        // profile is keyed by lowercased email, so normalize before matching.
        const profile = req
          ? await ctx.db
              .query("petProfiles")
              .withIndex("by_email", (q) =>
                q.eq("clientEmail", ((req as any).clientEmail || "").trim().toLowerCase()),
              )
              .first()
          : null;
        return {
          ...b,
          petNames: req ? (req as any).petNames : undefined,
          depositAmount: req ? (req as any).depositAmount : undefined,
          isHoliday: req ? (req as any).isHoliday : false,
          arrivalTime: req ? (req as any).arrivalTime : undefined,
          departureTime: req ? (req as any).departureTime : undefined,
          pets: req ? (req as any).pets : undefined,
          petDetails: req ? (req as any).petDetails : undefined,
          priceBreakdown: req ? (req as any).priceBreakdown : undefined,
          // Email-sent checklist flags that live on the request.
          postCompletionSent: req ? (req as any).postCompletionSent : undefined,
          // Pet profile exists for this client's email.
          profileExists: Boolean(profile),
        };
      }),
    );
  },
});

// Return the saved owner override for a single email template slug, or null
// when the owner has not customized it. Used at send time by the email builders
// to decide between the owner's text and the built in default.
export const getEmailTemplate = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// All email template overrides, for the admin panel list.
export const getEmailTemplates = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("emailTemplates").collect();
  },
});

/**
 * Default Meet & Greet calculator settings, mirrored here (Convex has no
 * import access to src/lib). These match src/lib/meetGreet.ts DEFAULT_* and
 * are also edited at runtime via siteSettings, so keep them in sync.
 */
const MG_DEFAULT = {
  baseAddress: "Bruceton Mills, WV 26525",
  flatFee: "75",
  freeRadiusMiles: "20",
  feeStartsAtOneWay: "29",
  ratePerMile: "1.25",
  feeCap: "110",
  outsideServiceAreaMiles: "50",
  distanceProvider: "manual",
  virtualNote:
    "This address is outside our in-home service area. A free virtual meet and greet is available as an alternative.",
};
const MG_KEYS = Object.keys(MG_DEFAULT);

// Return the saved Meet & Greet settings merged over their defaults as a plain
// object the admin UI and server fns can consume directly.
export const getSiteSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("siteSettings").collect();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    const merged: Record<string, string> = { ...MG_DEFAULT };
    for (const k of MG_KEYS) if (map[k] !== undefined) merged[k] = map[k];
    return merged;
  },
});

// Raw rows (all keys) for the admin settings editor to know which are set.
export const getAllSiteSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("siteSettings").collect();
  },
});


/**
 * Return the saved pet profile for a returning client, but ONLY when BOTH the
 * return code AND the email belong to the same record. This prevents a code
 * guess from leaking anyone's pet profile. Returns null when there is no match.
 */
export const getPetProfile = internalQuery({
  args: {
    returnCode: v.string(),
    clientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const code = args.returnCode.trim().toUpperCase();
    const email = args.clientEmail.trim().toLowerCase();
    if (!code || !email) return null;

    const record = await ctx.db
      .query("petProfiles")
      .withIndex("by_code", (q) => q.eq("returnCode", code))
      .first();

    if (!record) return null;
    if (record.clientEmail.trim().toLowerCase() !== email) return null;

    // Return the profile fields only, never the raw record internals.
    return {
      clientEmail: record.clientEmail,
      clientName: record.clientName,
      returnCode: record.returnCode,
      pets: record.pets,
      anxieties: record.anxieties,
      anxietyManifestation: record.anxietyManifestation,
      sleepsInBed: record.sleepsInBed,
      quirks: record.quirks,
    };
  },
});

/** One request row by id (server-side lookups for emails and admin actions). */
export const getRequest = internalQuery({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * One booking row by id, joined with its originating request. The server
 * builds every client email for deposit, balance, cancel and reschedule from
 * this record rather than from whatever the admin browser posted.
 */
export const getBooking = internalQuery({
  args: { id: v.id("bookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) return null;
    const request = await ctx.db.get(booking.requestId);
    return { booking, request };
  },
});
