import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  departureTimestampEpoch,
  postCompletionSecret,
  depositReminderSecret,
} from "./scheduling";

/** Public base URL injected into Convex env so the scheduled job can call back. */
const SITE_PUBLIC_URL =
  process.env.SITE_PUBLIC_URL || "https://jenjohnpetservices.com";

// Human-friendly return-code alphabet: no 0/O or 1/I/L, so a printed code can
// never be misread. Codes are 6 chars; on the rare collision we retry.
const RETURN_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomReturnCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += RETURN_CODE_CHARS[Math.floor(Math.random() * RETURN_CODE_CHARS.length)];
  }
  return code;
}

/** Collision-safe unique return code. */
async function generateReturnCode(ctx: {
  db: {
    query(name: string): any;
  };
}): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomReturnCode();
    const existing = await ctx.db
      .query("petProfiles")
      .withIndex("by_code", (q: any) => q.eq("returnCode", code))
      .first();
    if (!existing) return code;
  }
  // Extremely unlikely path: fall back to a timestamp-derived suffix that is
  // still human-typable and collision-free for practical purposes.
  return "R" + Date.now().toString(36).toUpperCase().slice(-5);
}

// ── Availability auto-block helpers (Feature A) ──────────────────────────────
// Approving a request blocks every date in its stay range in the availability
// table; cancelling, declining, or rescheduling reconciles the blocks against
// the currently-approved bookings. Rows whose note starts with this prefix are
// auto-managed and never left over; any other note (or no note) is a manual
// row that the owner set and that we never remove.
const BOOKING_BLOCK_PREFIX = "Blocked by booking: ";

/** Parse a yyyy-MM-dd string into a Date at local midnight (no UTC drift). */
function parseDay(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Format a Date as yyyy-MM-dd in local time. */
function formatDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Every yyyy-MM-dd in [arrivalDate, departureDate], inclusive. */
function rangeDays(arrivalDate: string, departureDate: string): string[] {
  const out: string[] = [];
  const start = parseDay(arrivalDate);
  const end = parseDay(departureDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(formatDay(d));
  return out;
}

/** Ranges of every request currently approved (the source of auto-blocks). */
async function approvedBookingRanges(
  ctx: { db: { query(name: string): any } },
): Promise<
  Array<{ clientName: string; arrivalDate: string; departureDate: string }>
> {
  const requests = await ctx.db.query("requests").collect();
  const ranges: Array<{
    clientName: string;
    arrivalDate: string;
    departureDate: string;
  }> = [];
  for (const r of requests) {
    if ((r as any).status !== "approved") continue;
    const arrivalDate = (r as any).arrivalDate;
    const departureDate = (r as any).departureDate;
    if (
      typeof arrivalDate === "string" &&
      typeof departureDate === "string" &&
      arrivalDate &&
      departureDate
    ) {
      ranges.push({
        clientName: (r as any).clientName || "Client",
        arrivalDate,
        departureDate,
      });
    }
  }
  return ranges;
}

/**
 * Reconcile the availability table with the currently approved bookings.
 * Idempotent: date coverage is recomputed from scratch, then each availability
 * row is upserted, kept, or deleted so the table exactly reflects the approved
 * set plus the owner's manual rows.
 *
 * - Every date inside an approved range ends up isOpen:false with the note
 *   "Blocked by booking: <clientName>". The booking claim wins over anything
 *   that was in the row before (this is the upsert the admin approval flow
 *   performs), so pre-feature manual proxy blocks on booked dates are adopted
 *   into the auto set on the one-time sweep.
 * - Auto-block rows (note starts with the prefix) whose date is no longer
 *   covered by any approved booking are deleted.
 * - Manual rows (any other note, or no note) on dates OUTSIDE every approved
 *   range keep their note and stay exactly as the owner set them; they are
 *   only touched when a booking claims their date.
 */
async function reconcileBookingBlocks(
  ctx: { db: { query(name: string): any; insert(name: string, v: any): any; patch(id: any, v: any): any; delete(id: any): any } },
): Promise<void> {
  const covered = new Map<string, string>(); // date -> client name
  const ranges = await approvedBookingRanges(ctx);
  for (const range of ranges) {
    for (const date of rangeDays(range.arrivalDate, range.departureDate)) {
      if (!covered.has(date)) covered.set(date, range.clientName);
    }
  }

  const all: Array<{
    _id: any;
    date?: string;
    isOpen?: boolean;
    note?: string;
  }> = await ctx.db.query("availability").collect();
  for (const row of all) {
    const date = row.date as string;
    const note = row.note;
    const isAutoBlock =
      typeof note === "string" && note.startsWith(BOOKING_BLOCK_PREFIX);
    const ownerName = covered.get(date);
    if (ownerName !== undefined) {
      // An approved booking claims this date: force it blocked with the auto
      // note. Patching an existing row is the upsert half; the note changes
      // even when the date was already blocked (pre-feature manual proxies
      // are adopted as auto blocks).
      const desiredNote = BOOKING_BLOCK_PREFIX + ownerName;
      if (row.isOpen !== false || note !== desiredNote) {
        await ctx.db.patch(row._id, { isOpen: false, note: desiredNote });
      }
    } else if (isAutoBlock) {
      // An auto-block no longer backed by any approved booking: remove it.
      await ctx.db.delete(row._id);
    }
    // Manual row outside every approved range: never touched.
  }

  // Cover any approved dates that have no availability row at all yet.
  for (const [date, clientName] of covered) {
    const exists = all.some((r) => r.date === date);
    if (!exists) {
      await ctx.db.insert("availability", {
        date,
        isOpen: false,
        note: BOOKING_BLOCK_PREFIX + clientName,
      });
    }
  }
}

export const seedReviews = internalMutation({
  args: {},
  handler: async (ctx) => {
    const reviews = [
      {
        name: "Annie W.",
        date: "July 19, 2026",
        quote:
          "Jennifer and John were wonderful sitters! They were very communicative and sent us photos daily. I could tell our dogs were happy and comfortable in the photos. We were able to enjoy our vacation with peace of mind. We also came home to a very clean house! I would recommend them to anyone and will definitely have them watch our dogs again!",
      },
      {
        name: "Olivia P.",
        date: "July 5, 2026",
        quote:
          "I was worried about leaving our dog Finn for the week since we normally don't leave him, however, Jen and John took such amazing care of him and were in constant communication that I had no worries while I was away. They also left the house in perfect condition. I can't recommend them enough.",
      },
      {
        name: "Carroll I.",
        date: "June 16, 2026",
        quote:
          "Jennifer and John did an amazing job watching our dog. They send me many pictures and updates. We came back to a joyful dog and a clean house. Definitely would recommend!",
      },
      {
        name: "Judy S.",
        date: "June 12, 2026",
        quote:
          "Jennifer watched our 3 dogs during a weekend away and I couldn't have asked for a better dogsitter. She sent pics throughout the weekend and we could tell our dogs were getting all the love we give them!! Thank you.",
      },
      {
        name: "Carly M.",
        date: "May 10, 2026",
        quote:
          "Jennifer & John did a phenomenal job!! Couldn't recommend enough!!",
      },
      {
        name: "Ellen H.",
        date: "April 12, 2026",
        quote:
          "Jennifer and John took great care of our babies. They gave us updates and pictures throughout their stay. We were very hesitant to have strangers in our home but they took care of our home as if it were theirs, and we came home to a cleaner house than we left. Highly recommend and would definitely use again. Our babies were happy, healthy and loved while in their care and that was the most important thing for us.",
      },
      {
        name: "Jack C.",
        date: "January 16, 2026",
        quote:
          "Jen and John were great! They were patient and took amazing care of my cat while I was gone.",
      },
      {
        name: "Christina H.",
        date: "December 30, 2025",
        quote:
          "Jen and John were amazing! We had an initial call to explain the care for our two pups and it was immediately clear how much they love animals and how much care they would give to the house. They gave us an update every day and clearly spent a lot of time with the boys. At the end of the trip, they gave us a thorough status of the house, and went above and beyond to leave the house clean and cared for. We will definitely be booking them again!",
      },
      {
        name: "Courtney W.",
        date: "November 29, 2025",
        quote:
          "Jen and John were great! They were very professional and had excellent communication with us and took fabulous care of our dog and our home while we were gone! We felt very comfortable leaving Izzy in their care! They sent regular pictures, and we could tell Izzy loved them! And the house was spotless when we returned, with dishes and linens all washed! We would definitely recommend them and we look forward to having them stay with Izzy again next time we go away!",
      },
      {
        name: "Jan J.",
        date: "October 31, 2025",
        quote:
          "WOW (and then some!) If we could give 10 stars, we would! Jen and John are absolutely paws-itively amazing! They took care of our fur babies (and our home!) while we were away for a wedding, and we couldn't have asked for a better duo. Warm, caring, and totally professional -- they were on time, super responsive to texts, and sent us daily photo updates that made us smile every time. And the best part? We came home to happy, spoiled and worn out pups, as well as a spotless house -- they even washed our sheets and made the bed so we could just relax after traveling. Who does that?! We can't recommend Jen and John enough -- our pups (and we!) can't wait to have them back again!",
      },
      {
        name: "Jess S.",
        date: "August 21, 2025",
        quote:
          "Jen and Jon did a fantastic job watching my dogs and cat. This was a last minute request and they didn't hesitate to help us out. One of our dogs has some health issues and they managed his pain and medications and made him comfortable while we were away. My babies were relaxed and happy after our trip out of town. I would highly recommend them to anyone who needs pet sitting.",
      },
      {
        name: "Libby Z.",
        date: "May 26, 2025",
        quote:
          "We really appreciate Jennifer (and John) for taking care of our kitten. They were very thorough and gave updates along with photos. They were able to watch Cali with little time notice. They made sure Cali was played with, cuddled and cleaned up nicely when we got back.",
      },
      {
        name: "Michelle S.",
        date: "December 30, 2024",
        quote:
          "Jennifer and John were such a blessing, on a seriously last minute booking! They were so responsive, made time in the less than 24 hour notice request to come over to meet our dogs. They were thorough in explaining the care they provide and very personable! As I was so nervous letting people I'd never met stay in our home they were reassuring and attentive to my multiple questions. While away, they sent many updates and pictures, again so reassuring to me! They also are so neat and tidy and took such good care of our home cleaning up after themselves, the dogs as well as washing the linens! Would absolutely recommend!! Thank you Jennifer and John!",
      },
      {
        name: "Amber P.",
        date: "December 2, 2024",
        quote:
          "Jen and John were AMAZING! We're so lucky we found them. So professional & communicative from the get go. We had such peace of mind while we were out of town knowing they were taking care of our pups. They sent us updates daily, were very responsive when we messaged and they took such great care of the dogs, even our old lady Betsey, who is a lot of work. They stayed at our house for the week and also took such great care of our home. They even took out our trash, brought in our mail and cleaned & washed the bed linen before we arrived back home. Would 100% book with them again!!",
      },
      {
        name: "Susan H.",
        date: "September 27, 2024",
        quote:
          "We had a great experience with Jen & John, our old girl did great. We really appreciated the updates, as well as their care of our home!",
      },
      {
        name: "Lisa H.",
        date: "August 20, 2024",
        quote:
          "Jennifer and John took great care of our dogs. One of them had recent surgery, and they kept up with meds and helped her around. Both dogs were happy and content when we returned. As an added bonus, the house was very tidy, and the sheets and towels they used were washed and the bed was remade. I highly recommend this fantastic couple to look after your pets!",
      },
      {
        name: "Daniela J.",
        date: "August 11, 2024",
        quote:
          "They were both wonderful watching Passion. When I returned home Passion was very calm which is not normal when I've been gone awhile. She was obviously comfortable with Jennifer and John.",
      },
      {
        name: "Kelly C.",
        date: "August 11, 2024",
        quote:
          "Jennifer and John did a great job taking care of my fur baby and my house! We were gone for an extended amount of time and we came home to a happy puppy and a clean home. They updated with pictures and let me know that Aspen was doing well! So thankful for the peace of mind while we were away!",
      },
      {
        name: "Jessica S.",
        date: "July 1, 2024",
        quote:
          "Jennifer and her husband took amazing care of my dogs and house! They followed all of the routines I gave them and even went above and beyond by washing their bed sheets and towels, re-making the beds and taking out the trash. I came home to a clean house and happy pups! It was nice being away and not having to worry about a thing back home. I highly recommend them to anyone looking for a reliable pet sitter. Thank you guys!!",
      },
      {
        name: "Britt C.",
        date: "April 29, 2024",
        quote:
          "Jennifer is super responsive and easy to communicate with! She also kept me updated while I was away, which is definitely appreciated.",
      },
      {
        name: "Jamie C.",
        date: "April 8, 2024",
        quote:
          "Jennifer went above and beyond for our Koda! So many walks and so much playtime and love was given to our girl. She treated Koda like she was her own. Due to car troubles, we could not make it home in time to pick her up. Jennifer was more than accommodating, working with us and letting our pup stay an extra day. I'll never have anyone else take care of our Koda!!",
      },
      {
        name: "Michelle L.",
        date: "March 21, 2024",
        quote:
          "Very happy with the care Jennifer provided for our young puppy. She kept the puppy happy and we had no problems. She responded quickly to any questions which put me at ease while I was out of town.",
      },
    ];

    for (const review of reviews) {
      await ctx.db.insert("reviews", review);
    }

    return { count: reviews.length };
  },
});

export const createReview = internalMutation({
  args: {
    name: v.string(),
    date: v.string(),
    quote: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviews", args);
  },
});

export const updateReview = internalMutation({
  args: {
    id: v.id("reviews"),
    name: v.string(),
    date: v.string(),
    quote: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return { success: true };
  },
});

export const deleteReview = internalMutation({
  args: {
    id: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const createRequest = internalMutation({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    clientPhone: v.optional(v.string()),
    clientAddress: v.string(),
    arrivalDate: v.string(),
    arrivalTime: v.string(),
    departureDate: v.string(),
    departureTime: v.string(),
    pets: v.any(),
    isHoliday: v.boolean(),
    totalPrice: v.number(),
    holidaySurchargeDays: v.optional(v.number()),
    holidaySurcharge: v.optional(v.number()),
    priceBreakdown: v.optional(v.any()),
    notes: v.optional(v.string()),
    petAnxieties: v.optional(v.string()),
    petAnxietyManifestation: v.optional(v.string()),
    petSleepsInBed: v.optional(v.string()),
    petQuirks: v.optional(v.string()),
    petNames: v.optional(v.string()),
    petDetails: v.optional(v.any()),
    hearAboutUs: v.optional(v.string()),
    referredBy: v.optional(v.string()),
    // Meet & Greet travel fee fields, computed server-side by the submit route.
    // OWNER-ONLY; never shown to the client or added to the stay totalPrice.
    meetGreetDistanceMiles: v.optional(v.number()),
    meetGreetFee: v.optional(v.number()),
    meetGreetOutsideArea: v.optional(v.boolean()),
    meetGreetManual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("requests", {
      ...args,
      status: "pending",
      // New referred requests default their reward to pending so Jen & John
      // can track whether the referrer's 10% discount has been used yet.
      referralRewardStatus: args.referredBy ? "pending" : undefined,
      createdAt: Date.now(),
    });
    return id;
  },
});

export const updateReferralRewardStatus = internalMutation({
  args: {
    requestId: v.id("requests"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const valid = ["pending", "issued", "used"];
    if (!valid.includes(args.status)) {
      throw new Error(
        `Invalid referral reward status "${args.status}". Expected one of ${valid.join(
          ", ",
        )}.`,
      );
    }
    await ctx.db.patch(args.requestId, { referralRewardStatus: args.status });
    return { success: true };
  },
});

export const updateRequestStatus = internalMutation({
  args: {
    id: v.id("requests"),
    status: v.string(),
    depositAmount: v.optional(v.number()),
    depositLink: v.optional(v.string()),
    // Optional admin pricing override honored at approval. When supplied, the
    // request's stored total (and derived holiday fields) are updated first, so
    // the booking insert, deposit default, reminder and emails all use the
    // edited total through one code path.
    totalPrice: v.optional(v.number()),
    isHoliday: v.optional(v.boolean()),
    holidaySurchargeDays: v.optional(v.number()),
    holidaySurcharge: v.optional(v.number()),
    // Optional Meet & Greet fee override honored at approval (owner exceptions).
    meetGreetFee: v.optional(v.number()),
    meetGreetDistanceMiles: v.optional(v.number()),
    meetGreetOutsideArea: v.optional(v.boolean()),
    meetGreetManual: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const patch: any = { status: args.status };
    if (args.depositAmount !== undefined) patch.depositAmount = args.depositAmount;
    if (args.depositLink !== undefined) patch.depositLink = args.depositLink;
    if (args.totalPrice !== undefined) patch.totalPrice = args.totalPrice;
    if (args.isHoliday !== undefined) patch.isHoliday = args.isHoliday;
    if (args.holidaySurchargeDays !== undefined)
      patch.holidaySurchargeDays = args.holidaySurchargeDays;
    if (args.holidaySurcharge !== undefined)
      patch.holidaySurcharge = args.holidaySurcharge;
    if (args.meetGreetFee !== undefined) patch.meetGreetFee = args.meetGreetFee;
    if (args.meetGreetDistanceMiles !== undefined)
      patch.meetGreetDistanceMiles = args.meetGreetDistanceMiles;
    if (args.meetGreetOutsideArea !== undefined)
      patch.meetGreetOutsideArea = args.meetGreetOutsideArea;
    if (args.meetGreetManual !== undefined) patch.meetGreetManual = args.meetGreetManual;

    await ctx.db.patch(args.id, patch);

    // Track whether this approval created a fresh pet profile (so the caller
    // knows to email the returning client their new return code).
    let profileCreated = false;
    let returnCode: string | undefined;

    // If approved, create a booking and schedule the end-of-stay email to fire
    // automatically at the client's departure date + time.
    if (args.status === "approved") {
      const request = await ctx.db.get(args.id);
      if (request) {
        const approvedAt = Date.now();
        const bookingId = await ctx.db.insert("bookings", {
          requestId: args.id,
          clientName: request.clientName,
          clientEmail: request.clientEmail,
          arrivalDate: request.arrivalDate,
          departureDate: request.departureDate,
          totalPrice: request.totalPrice,
          isHoliday: (request as any).isHoliday,
          holidaySurchargeDays: (request as any).holidaySurchargeDays,
          holidaySurcharge: (request as any).holidaySurcharge,
          depositPaid: false,
          createdAt: approvedAt,
        });

        // Schedule a one time deposit reminder to fire 24 hours after the
        // approval moment. It calls back to the site endpoint, which decides
        // based on the booking's CURRENT depositPaid whether to actually send
        // (a client pays and the deposit-received email already covers the
        // rest; a reminder only goes out if the deposit is still unpaid at
        // the 24h mark). Stored on the booking so it can be cancelled the
        // moment the owner records the deposit as paid.
        {
          const reminderTs = approvedAt + 24 * 60 * 60 * 1000;
          const token = depositReminderSecret();
          const depositAmount =
            (request as any).depositAmount !== undefined &&
            (request as any).depositAmount !== null
              ? (request as any).depositAmount
              : Math.round((request as any).totalPrice * 0.5);
          const reminderJobId = await ctx.scheduler.runAt(
            reminderTs,
            internal.scheduling.sendDepositReminder,
            {
              siteUrl: SITE_PUBLIC_URL,
              token,
              data: {
                bookingId,
                requestId: args.id,
                clientName: request.clientName,
                clientEmail: request.clientEmail,
                depositAmount,
                arrivalDate: request.arrivalDate,
                departureDate: request.departureDate,
                petNames: (request as any).petNames,
              },
            },
          );
          await ctx.db.patch(bookingId, { depositReminderJobId: reminderJobId });
        }

        // Save this client's pet profile so they can pre-fill next time.
        // One record per email; the first approval generates and stores the
        // return code, later approvals refresh the saved pet details in place.
        {
          const email = (request.clientEmail || "").trim().toLowerCase();
          const existingProfile = email
            ? await ctx.db
                .query("petProfiles")
                .withIndex("by_email", (q) => q.eq("clientEmail", email))
                .first()
            : null;

          const pets = Array.isArray(request.petDetails)
            ? (request.petDetails as any[]).map((p) => ({
                name: p?.name || "",
                breed: p?.breed,
                age: p?.age,
                type: p?.type || "adultDog",
                species: p?.species,
              }))
            : [];

          if (existingProfile) {
            await ctx.db.patch(existingProfile._id, {
              clientName: request.clientName,
              pets,
              anxieties: (request as any).petAnxieties,
              anxietyManifestation: (request as any).petAnxietyManifestation,
              sleepsInBed: (request as any).petSleepsInBed,
              quirks: (request as any).petQuirks,
            });
            returnCode = existingProfile.returnCode;
          } else if (email) {
            returnCode = await generateReturnCode(ctx);
            await ctx.db.insert("petProfiles", {
              clientEmail: email,
              returnCode,
              clientName: request.clientName,
              pets,
              anxieties: (request as any).petAnxieties,
              anxietyManifestation: (request as any).petAnxietyManifestation,
              sleepsInBed: (request as any).petSleepsInBed,
              quirks: (request as any).petQuirks,
              createdAt: Date.now(),
            });
            profileCreated = true;
          }
        }

        // Feature A: reflect this approval in the availability calendar. The
        // whole table is recomputed against the set of approved requests, so
        // overlapping stays both remain blocked and re-approving is a no-op.
        await reconcileBookingBlocks(ctx);

        // Only schedule once per requested stay. Re-approving idempotently
        // leaves the already-scheduled job in place.
        if (!(request as any).postCompletionJobId) {
          const depTs = departureTimestampEpoch(
            request.departureDate,
            request.departureTime,
          );
          if (depTs > Date.now() - 60_000) {
            const token = postCompletionSecret();
            const jobId = await ctx.scheduler.runAt(
              depTs,
              internal.scheduling.sendPostCompletion,
              {
                siteUrl: SITE_PUBLIC_URL,
                token,
                data: {
                  requestId: args.id,
                  clientName: request.clientName,
                  clientEmail: request.clientEmail,
                  clientPhone: request.clientPhone,
                  clientAddress: request.clientAddress,
                  arrivalDate: request.arrivalDate,
                  arrivalTime: request.arrivalTime,
                  departureDate: request.departureDate,
                  departureTime: request.departureTime,
                  pets: request.pets,
                  isHoliday: request.isHoliday,
                  totalPrice: request.totalPrice,
                  priceBreakdown: request.priceBreakdown,
                  notes: request.notes,
                  petNames: request.petNames,
                  petDetails: request.petDetails,
                  petAnxieties: request.petAnxieties,
                  petAnxietyManifestation: request.petAnxietyManifestation,
                  petSleepsInBed: request.petSleepsInBed,
                  petQuirks: request.petQuirks,
                  referredBy: request.referredBy,
                },
              },
            );
            await ctx.db.patch(args.id, { postCompletionJobId: jobId });
          }
        }
      }
    }

    // If a previously-approved stay is declined/cancelled, cancel its
    // scheduled end-of-stay email so it can never fire.
    if (args.status !== "approved") {
      // Feature A: reconciling against the approved set here unblocks this
      // stay's dates when no other approved booking covers them (the decline
      // or cancel already flipped the request status above). Manual rows are
      // never removed.
      await reconcileBookingBlocks(ctx);
      const request = await ctx.db.get(args.id);
      const jobId = request && (request as any).postCompletionJobId;
      if (jobId) {
        try {
          await ctx.scheduler.cancel(jobId);
        } catch (err) {
          console.error(
            "[scheduling] failed to cancel job",
            jobId,
            err instanceof Error ? err.message : String(err),
          );
        }
        await ctx.db.patch(args.id, { postCompletionJobId: undefined });
      }
    }

    return { success: true, profileCreated, returnCode };
  },
});

/**
 * Public save/upsert path for a returning client's pet profiles, keyed by the
 * client's email. The first save for an email generates and returns a fresh
 * return code; later saves keep the existing code and refresh the details.
 * (The approval flow also saves automatically via updateRequestStatus.)
 */
export const savePetProfile = internalMutation({
  args: {
    clientEmail: v.string(),
    clientName: v.string(),
    pets: v.array(
      v.object({
        name: v.string(),
        breed: v.optional(v.string()),
        age: v.optional(v.string()),
        type: v.string(),
        species: v.optional(v.string()),
        vetName: v.optional(v.string()),
        vetPhone: v.optional(v.string()),
        feedingInstructions: v.optional(v.string()),
      }),
    ),
    anxieties: v.optional(v.string()),
    anxietyManifestation: v.optional(v.string()),
    sleepsInBed: v.optional(v.string()),
    quirks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.clientEmail.trim().toLowerCase();
    if (!email) throw new Error("Client email is required to save a profile.");

    const existing = await ctx.db
      .query("petProfiles")
      .withIndex("by_email", (q) => q.eq("clientEmail", email))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        clientName: args.clientName,
        pets: args.pets,
        anxieties: args.anxieties,
        anxietyManifestation: args.anxietyManifestation,
        sleepsInBed: args.sleepsInBed,
        quirks: args.quirks,
      });
      return { success: true, returnCode: existing.returnCode, created: false };
    }

    const returnCode = await generateReturnCode(ctx);
    await ctx.db.insert("petProfiles", {
      clientEmail: email,
      returnCode,
      clientName: args.clientName,
      pets: args.pets,
      anxieties: args.anxieties,
      anxietyManifestation: args.anxietyManifestation,
      sleepsInBed: args.sleepsInBed,
      quirks: args.quirks,
      createdAt: Date.now(),
    });
    return { success: true, returnCode, created: true };
  },
});

export const deleteRequest = internalMutation({
  args: {
    id: v.id("requests"),
  },
  handler: async (ctx, args) => {
    // Cancel any scheduled end-of-stay email for this request before removing
    // it, so a deleted/cancelled booking can never trigger an email.
    const request = await ctx.db.get(args.id);
    const jobId = request && (request as any).postCompletionJobId;
    if (jobId) {
      try {
        await ctx.scheduler.cancel(jobId);
      } catch (err) {
        console.error(
          "[scheduling] failed to cancel job on delete",
          jobId,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    // Remove any bookings linked to this request so no orphaned rows remain.
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.id))
      .collect();
    for (const booking of bookings) {
      await ctx.db.delete(booking._id);
    }
    await ctx.db.delete(args.id);
    // Feature A: the deleted request may have been approved, so reconcile the
    // auto-blocks against whatever approved requests remain. Idempotent.
    await reconcileBookingBlocks(ctx);
    return { success: true };
  },
});

export const updateBooking = internalMutation({
  args: {
    id: v.id("bookings"),
    depositPaid: v.boolean(),
    paymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = { depositPaid: args.depositPaid };
    if (args.paymentMethod !== undefined) {
      patch.paymentMethod = args.paymentMethod;
    }
    await ctx.db.patch(args.id, patch);
    return { success: true };
  },
});

/**
 * Atomically claims the one-time deposit-received confirmation email for a
 * booking. The flag is persisted in the same mutation that reads it, so a
 * repeated save or a concurrent double-save can only ever win the claim once:
 * - First call (depositEmailSent was false): sets it true, returns shouldSend=true.
 * - Every later call (already true, e.g. owner re-saves, or toggles deposit
 *   paid off and back on): returns shouldSend=false.
 * The caller sends the client email only when shouldSend is true, making
 * duplicate confirmation emails impossible.
 */
export const markDepositEmailSent = internalMutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) {
      return { shouldSend: false, reason: "not_found" };
    }
    if ((booking as any).depositEmailSent) {
      return { shouldSend: false, reason: "already_sent" };
    }
    await ctx.db.patch(args.id, { depositEmailSent: true });
    return { shouldSend: true };
  },
});

/**
 * Atomically claims the one-time cancellation email for a booking (mirrors
 * markDepositEmailSent). Only the caller that wins the claim sends the email,
 * so a repeated or concurrent cancel can never double-send.
 */
export const markCancellationEmailSent = internalMutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) {
      return { shouldSend: false, reason: "not_found" };
    }
    if ((booking as any).cancellationEmailSent) {
      return { shouldSend: false, reason: "already_sent" };
    }
    await ctx.db.patch(args.id, { cancellationEmailSent: true });
    return { shouldSend: true };
  },
});

/**
 * Atomically claims the reschedule email for a booking. The rescheduleBooking
 * mutation resets rescheduleEmailSent to false BEFORE this claim runs, so each
 * deliberate reschedule wins the claim exactly once and sends one email, while
 * a repeated or concurrent claim for the same reschedule can never double-send.
 */
export const markRescheduleEmailSent = internalMutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) {
      return { shouldSend: false, reason: "not_found" };
    }
    if ((booking as any).rescheduleEmailSent) {
      return { shouldSend: false, reason: "already_sent" };
    }
    await ctx.db.patch(args.id, { rescheduleEmailSent: true });
    return { shouldSend: true };
  },
});

/**
 * Reschedule a confirmed stay. Updates both the request and its booking row
 * with the new dates (and the new total when the price changed), keeps the
 * deposit as-is, and resets the one-time reschedule-email claim so exactly one
 * reschedule confirmation email is sent for this change. A reschedule never
 * triggers a refund.
 */

/**
 * Update the remaining-balance tracking fields on a booking (mirrors
 * updateBooking for the deposit). Sets whether the remaining balance (total
 * minus deposit) has been received and, when received, how it was received.
 */
export const updateBookingBalance = internalMutation({
  args: {
    id: v.id("bookings"),
    balancePaid: v.boolean(),
    balancePaymentMethod: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = { balancePaid: args.balancePaid };
    if (args.balancePaymentMethod !== undefined) {
      patch.balancePaymentMethod = args.balancePaymentMethod;
    }
    await ctx.db.patch(args.id, patch);
    return { success: true };
  },
});

/**
 * Atomically claims the one-time balance-received confirmation email for a
 * booking (mirrors markDepositEmailSent). Only the caller that wins the claim
 * sends the email, so a repeated or concurrent save can never double-send.
 */
export const markBalanceEmailSent = internalMutation({
  args: {
    id: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.id);
    if (!booking) {
      return { shouldSend: false, reason: "not_found" };
    }
    if ((booking as any).balanceEmailSent) {
      return { shouldSend: false, reason: "already_sent" };
    }
    await ctx.db.patch(args.id, { balanceEmailSent: true });
    return { shouldSend: true };
  },
});

export const rescheduleBooking = internalMutation({
  args: {
    requestId: v.id("requests"),
    bookingId: v.id("bookings"),
    arrivalDate: v.string(),
    arrivalTime: v.string(),
    departureDate: v.string(),
    departureTime: v.string(),
    totalPrice: v.number(),
    priceBreakdown: v.optional(v.any()),
    isHoliday: v.boolean(),
    holidaySurchargeDays: v.optional(v.number()),
    holidaySurcharge: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Update the originating request (keeps the end-of-stay follow-up working
    // off the stored dates) and the booking row. Deposit and amount paid are
    // intentionally untouched: a reschedule keeps the deposit and balance.
    await ctx.db.patch(args.requestId, {
      arrivalDate: args.arrivalDate,
      arrivalTime: args.arrivalTime,
      departureDate: args.departureDate,
      departureTime: args.departureTime,
      totalPrice: args.totalPrice,
      priceBreakdown: args.priceBreakdown,
      isHoliday: args.isHoliday,
      holidaySurchargeDays: args.holidaySurchargeDays,
      holidaySurcharge: args.holidaySurcharge,
    });
    await ctx.db.patch(args.bookingId, {
      arrivalDate: args.arrivalDate,
      departureDate: args.departureDate,
      totalPrice: args.totalPrice,
      isHoliday: args.isHoliday,
      holidaySurchargeDays: args.holidaySurchargeDays,
      holidaySurcharge: args.holidaySurcharge,
      // Reset so the follow-up claim can win once for this reschedule.
      rescheduleEmailSent: false,
    });
    // Feature A: the request row (which drives the auto-block set) already
    // points at the new dates, so reconciling unblocks the old range where no
    // other approved booking covers it and blocks the new range.
    await reconcileBookingBlocks(ctx);
    return { success: true };
  },
});

export const setAdminAuth = internalMutation({
  args: {
    salt: v.string(),
    hash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("adminAuth").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        salt: args.salt,
        hash: args.hash,
      });
    } else {
      await ctx.db.insert("adminAuth", {
        salt: args.salt,
        hash: args.hash,
      });
    }
    return { success: true };
  },
});

export const setAvailability = internalMutation({
  args: {
    date: v.string(),
    isOpen: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Upsert: check if date exists
    const existing = await ctx.db
      .query("availability")
      .filter((q) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOpen: args.isOpen,
        note: args.note,
      });
    } else {
      await ctx.db.insert("availability", {
        date: args.date,
        isOpen: args.isOpen,
        note: args.note,
      });
    }

    return { success: true };
  },
});

/**
 * Upsert one or more site settings (key -> value). Blank value removes a key
 * so the engine falls back to its default. Used by the admin Meet & Greet
 * settings editor.
 */
export const saveSiteSettings = internalMutation({
  args: {
    entries: v.array(
      v.object({ key: v.string(), value: v.optional(v.string()) }),
    ),
  },
  handler: async (ctx, args) => {
    for (const entry of args.entries) {
      const existing = await ctx.db
        .query("siteSettings")
        .withIndex("by_key", (q) => q.eq("key", entry.key))
        .first();
      const value = entry.value?.trim();
      if (value === undefined || value === "") {
        if (existing) await ctx.db.delete(existing._id);
      } else if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("siteSettings", { key: entry.key, value });
      }
    }
    return { success: true };
  },
});

/**
 * Upsert the owner's custom copy for one email template. Passing an empty body
 * or subject clears that field so the email falls back to its built in default.
 * Passing both empty clears the row entirely (owner reverted to defaults).
 */
export const saveEmailTemplate = internalMutation({
  args: {
    slug: v.string(),
    body: v.optional(v.string()),
    subject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emailTemplates")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    // Empty body and subject means the owner reverted to defaults entirely.
    const hasContent = Boolean(args.body?.trim() || args.subject?.trim());

    if (existing) {
      if (hasContent) {
        await ctx.db.patch(existing._id, {
          body: args.body?.trim() ? args.body : undefined,
          subject: args.subject?.trim() ? args.subject : undefined,
        });
      } else {
        await ctx.db.delete(existing._id);
      }
    } else if (hasContent) {
      await ctx.db.insert("emailTemplates", {
        slug: args.slug,
        body: args.body?.trim() ? args.body : undefined,
        subject: args.subject?.trim() ? args.subject : undefined,
      });
    }
    return { success: true };
  },
});

/**
 * Atomically claim the one time deposit reminder for a booking. Called by the
 * site's /api/deposit-reminder endpoint (via the scheduled job callback) right
 * before it sends. Wins the claim only when the deposit is STILL unpaid and the
 * reminder has not already been sent, so:
 * - a client who paid before the 24h mark is never nagged (depositPaid true),
 * - a client who paid after the reminder already fired gets no second reminder
 *   (depositReminderSent already true),
 * - a retried or replayed endpoint call can never send twice.
 */
export const claimDepositReminder = internalMutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return { shouldSend: false, reason: "not_found" };
    }
    if ((booking as any).depositPaid) {
      return { shouldSend: false, reason: "already_paid" };
    }
    if ((booking as any).depositReminderSent) {
      return { shouldSend: false, reason: "already_sent" };
    }
    // Claim it and clear the pending job id (it has fired or won't be needed).
    await ctx.db.patch(args.bookingId, {
      depositReminderSent: true,
      depositReminderJobId: undefined,
    });
    return { shouldSend: true };
  },
});

/**
 * Cancel a pending deposit reminder job. Called when the owner marks the
 * deposit as paid BEFORE the 24h reminder would have fired, so a paid client
 * is never nagged. Idempotent: if the reminder already fired (job id cleared)
 * or was never scheduled, this is a no-op.
 */
export const cancelDepositReminder = internalMutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return { success: false, reason: "not_found" };
    }
    const jobId = (booking as any).depositReminderJobId;
    if (jobId) {
      try {
        await ctx.scheduler.cancel(jobId);
      } catch (err) {
        console.error(
          "[scheduling] failed to cancel deposit reminder job",
          jobId,
          err instanceof Error ? err.message : String(err),
        );
      }
      await ctx.db.patch(args.bookingId, { depositReminderJobId: undefined });
    }
    return { success: true };
  },
});

/**
 * Resend a returning client's return code by email (client initiated "Lost your
 * code?"). Faces three cases:
 * - A pet profile already exists      -> return the existing code (resend email).
 * - No profile but a past approved     -> LEGACY BACKFILL: generate a fresh code
 *   booking/request for this email       and create the pet profile from that
 *                                        booking's saved pet details (same shape
 *                                        as updateRequestStatus), then return it.
 * - No profile and no approved booking -> return { found:false } so the caller
 *   shows a friendly message and sends NO empty code email.
 */
export const resendReturnCode = internalMutation({
  args: {
    clientEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const email = (args.clientEmail || "").trim().toLowerCase();
    if (!email) throw new Error("Email is required.");

    // Case 2a: an existing profile.
    const existing = await ctx.db
      .query("petProfiles")
      .withIndex("by_email", (q) => q.eq("clientEmail", email))
      .first();
    if (existing) {
      return {
        found: true,
        backfilled: false,
        clientName: existing.clientName,
        returnCode: existing.returnCode,
        petNames: existing.pets
          .map((p: any) => (p?.name || "").trim())
          .filter(Boolean)
          .join(", "),
      };
    }

    // Case 2b: legacy backfill from a previously approved booking.
    let request: any = null;
    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_email", (q) => q.eq("clientEmail", email))
      .first();
    if (booking) {
      request = booking.requestId ? await ctx.db.get(booking.requestId) : null;
    }
    if (!request || request.status !== "approved") {
      request = await ctx.db
        .query("requests")
        .withIndex("by_email", (q) => q.eq("clientEmail", email))
        .filter((q) => q.eq(q.field("status"), "approved"))
        .first();
    }
    if (!request || request.status !== "approved") {
      // Case 2c: no profile and no approved booking. Do NOT email an empty code.
      return { found: false };
    }

    const pets = Array.isArray(request.petDetails)
      ? (request.petDetails as any[]).map((p) => ({
          name: p?.name || "",
          breed: p?.breed,
          age: p?.age,
          type: p?.type || "adultDog",
          species: p?.species,
        }))
      : [];
    const code = await generateReturnCode(ctx);
    await ctx.db.insert("petProfiles", {
      clientEmail: email,
      returnCode: code,
      clientName: request.clientName,
      pets,
      anxieties: (request as any).petAnxieties,
      anxietyManifestation: (request as any).petAnxietyManifestation,
      sleepsInBed: (request as any).petSleepsInBed,
      quirks: (request as any).petQuirks,
      createdAt: Date.now(),
    });
    return {
      found: true,
      backfilled: true,
      clientName: request.clientName,
      returnCode: code,
      petNames: pets.map((p) => p.name).filter(Boolean).join(", "),
    };
  },
});

/**
 * Feature A: one-time (and safe to re-run) sweep that reconciles the
 * availability table with every currently approved booking. Blocks the ranges
 * of the real confirmed bookings (Sonia Oct 10-11 2026, Laura Sep 6-7 2026,
 * Laura Oct 19-23 2026) with note "Blocked by booking: <clientName>", leaves
 * the owner's manual rows untouched, and removes nothing that a manual row or
 * another approved booking still covers. Idempotent: repeated calls are no-ops
 * once the table already reflects the approved set.
 */
export const syncAvailabilityFromBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const before = await ctx.db.query("availability").collect();
    await reconcileBookingBlocks(ctx);
    const after = await ctx.db.query("availability").collect();
    const autoBlocked = after
      .filter((r) => (r as any).isOpen === false)
      .filter((r) =>
        typeof (r as any).note === "string" &&
        (r as any).note.startsWith(BOOKING_BLOCK_PREFIX),
      )
      .map((r) => ({
        date: (r as any).date as string,
        note: (r as any).note as string,
      }));
    return { success: true, rowsBefore: before.length, rowsAfter: after.length, autoBlocked };
  },
});
// ── Admin password reset ──────────────────────────────────────────────────
// Only the sha256 hash of a reset token is ever stored. The raw token lives
// only in the email link and in memory during request handling, so a database
// read never reveals a working reset link.
export const createPasswordReset = internalMutation({
  args: {
    tokenHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("passwordReset", {
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});
// Atomically find, verify, and invalidate one reset token. Returns the token's
// expiry when the token is valid and unexpired (so the site can event a stale
// row) and null otherwise. Consumption and invalidation happen in the same
// mutation, so a token can never be used twice.
export const consumePasswordReset = internalMutation({
  args: {
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("passwordReset")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", args.tokenHash))
      .first();
    if (!row) return { valid: false, expiresAt: null };
    const expiresAt = row.expiresAt;
    await ctx.db.delete(row._id);
    return { valid: Date.now() <= expiresAt, expiresAt };
  },
});

