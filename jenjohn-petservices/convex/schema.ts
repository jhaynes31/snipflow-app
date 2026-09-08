import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reviews: defineTable({
    name: v.string(),
    date: v.string(),
    quote: v.string(),
  }).index("by_date", ["date"]),

  availability: defineTable({
    date: v.string(),
    isOpen: v.boolean(),
    note: v.optional(v.string()),
  }).index("by_date", ["date"]),

  requests: defineTable({
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
    // System-derived holiday surcharge (see src/lib/holidays.ts). Optional and
    // migration-safe so pre-existing rows without them stay valid.
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
    referralRewardStatus: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    depositAmount: v.optional(v.number()),
    depositLink: v.optional(v.string()),
    postCompletionJobId: v.optional(v.string()),
    postCompletionSent: v.optional(v.boolean()),
    // Meet & Greet travel fee (OWNER-ONLY, separate from totalPrice). Computed
    // server-side at request creation; never shown to the client or added to
    // their visible price breakdown. All optional and migration-safe.
    meetGreetDistanceMiles: v.optional(v.number()),
    meetGreetFee: v.optional(v.number()),
    meetGreetOutsideArea: v.optional(v.boolean()),
    meetGreetManual: v.optional(v.boolean()),
  }).index("by_status", ["status"])
    .index("by_email", ["clientEmail"]),

  // Single-row store for the admin password. Holds a pbkdf2 derived hash plus
  // its random salt so the password persists across redeploys and restarts.
  // No raw password is ever stored; the .env ADMIN_PASSWORD remains the seed
  // / fallback until the owner sets a password from within the admin panel.
  adminAuth: defineTable({
    salt: v.string(),
    hash: v.string(),
  }),
  // One record per client. Holds a single human-friendly return code plus an
  // array of that client's pet profiles, so one code unlocks all their pets.
  petProfiles: defineTable({
    clientEmail: v.string(),
    returnCode: v.string(),
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
    createdAt: v.number(),
  }).index("by_email", ["clientEmail"])
    .index("by_code", ["returnCode"]),

  bookings: defineTable({
    requestId: v.id("requests"),
    clientName: v.string(),
    clientEmail: v.string(),
    arrivalDate: v.string(),
    departureDate: v.string(),
    totalPrice: v.number(),
    depositPaid: v.boolean(),
    // Persistent copy of the holiday state at approval, so downstream logic
    // (refund, reminders, emails) is consistent with the approved pricing.
    isHoliday: v.optional(v.boolean()),
    holidaySurchargeDays: v.optional(v.number()),
    holidaySurcharge: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    createdAt: v.number(),
    // One-time guard: true once the deposit-received email has been claimed for
    // this booking, so a repeated or concurrent save can never double-send.
    depositEmailSent: v.optional(v.boolean()),
    // One-time guards for the cancellation and reschedule client emails.
    // cancellationEmailSent is a permanent one-time claim; rescheduleEmailSent
    // is reset to false by each new reschedule so every reschedule sends once.
    cancellationEmailSent: v.optional(v.boolean()),
    rescheduleEmailSent: v.optional(v.boolean()),
    // Scheduled one-time deposit reminder. depositReminderJobId is the Convex
    // scheduler job scheduled 24h after approval; the site endpoint claim
    // (claimDepositReminder) atomically sets depositReminderSent so a reminder
    // can never double send, and clears the job id once it fires or is cancelled.
    depositReminderJobId: v.optional(v.string()),
    depositReminderSent: v.optional(v.boolean()),
    // Remaining-balance tracking: whether the balance (total minus deposit) has
    // been received, how it was received, and a one-time guard for the
    // balance-received confirmation email (mirrors depositEmailSent).
    balancePaid: v.optional(v.boolean()),
    balancePaymentMethod: v.optional(v.string()),
    balanceEmailSent: v.optional(v.boolean()),
  }).index("by_requestId", ["requestId"])
    .index("by_email", ["clientEmail"]),

  // Owner written client email overrides. One row per template slug. body holds
  // the owner's custom client facing text, subject holds an optional custom
  // subject line. When a field is absent, the built in default is used, so the
  // existing emails are unaffected until the owner edits them.
  emailTemplates: defineTable({
    slug: v.string(),
    body: v.optional(v.string()),
    subject: v.optional(v.string()),
  }).index("by_slug", ["slug"]),

  // Single key->current value store for admin-editable settings (Meet & Greet
  // calculator knobs, base address, distance provider, etc.). Query
  // getSiteSettings merges these over the engine defaults so a missing row
  // falls back cleanly.
  siteSettings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
  // Short lived admin password reset tokens. Only the sha256 hash of the raw
  // token is stored, never the token itself, so a database read never leaks a
  // working reset link. Rows live 30 minutes (expiresAt) and are deleted when
  // consumed or expired.
  passwordReset: defineTable({
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_tokenHash", ["tokenHash"]),
});
