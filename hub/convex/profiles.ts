import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  cleanText,
  currentMe,
  optionalText,
  profileForUser,
  randomToken,
  requireMe,
  requireUserId,
} from "./lib";

const textSize = v.union(v.literal("normal"), v.literal("large"), v.literal("larger"));
const themePref = v.union(v.literal("system"), v.literal("light"), v.literal("dark"));

/** What the partner may see of a profile: name and photo, nothing else. */
function partnerView(p: Doc<"profiles">) {
  return { _id: p._id, displayName: p.displayName, photoUrl: p.photoUrl, timeZone: p.timeZone };
}

/**
 * Everything the shell needs: the signed-in person, their profile, and the
 * partner's public view. `null` when signed out. `{ setUp: false }` when
 * signed in but the profile hasn't been created yet.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentMe(ctx);
    if (!me) {
      let userId;
      try {
        userId = await requireUserId(ctx);
      } catch {
        return null;
      }
      const user = await ctx.db.get(userId);
      return { setUp: false as const, email: user?.email ?? null };
    }
    const user = await ctx.db.get(me.userId);
    return {
      setUp: true as const,
      email: user?.email ?? null,
      profile: me.profile,
      partner: me.partner ? partnerView(me.partner) : null,
    };
  },
});

export const create = mutation({
  args: { displayName: v.string(), timeZone: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (await profileForUser(ctx, userId)) throw new Error("Your profile already exists.");
    const now = Date.now();
    return await ctx.db.insert("profiles", {
      userId,
      displayName: cleanText(args.displayName, 40, "Your name"),
      timeZone: cleanText(args.timeZone, 64, "Time zone"),
      calendarToken: randomToken(),
      reminders: {
        dailyCheckInHour: 9,
        dailyCheckInMinute: 0,
        badgeEnabled: true,
        pushEnabled: false,
      },
      accessibility: { textSize: "normal", highContrast: false, quietVisuals: false, theme: "system" },
      modules: { disabled: [], order: [] },
      moduleSettings: {},
      setupDone: false,
      createdAt: now,
    });
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    setupDone: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const patch: Record<string, unknown> = {};
    if (args.displayName !== undefined) patch.displayName = cleanText(args.displayName, 40, "Your name");
    if (args.photoUrl !== undefined) patch.photoUrl = optionalText(args.photoUrl, 500, "Photo link");
    if (args.timeZone !== undefined) patch.timeZone = cleanText(args.timeZone, 64, "Time zone");
    if (args.setupDone !== undefined) patch.setupDone = args.setupDone;
    await ctx.db.patch(me.profile._id, patch);
  },
});

export const updateReminders = mutation({
  args: {
    dailyCheckInHour: v.optional(v.number()),
    dailyCheckInMinute: v.optional(v.number()),
    badgeEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const r = { ...me.profile.reminders };
    if (args.dailyCheckInHour !== undefined) {
      if (!Number.isInteger(args.dailyCheckInHour) || args.dailyCheckInHour < 0 || args.dailyCheckInHour > 23) {
        throw new Error("Pick an hour from 0 to 23.");
      }
      r.dailyCheckInHour = args.dailyCheckInHour;
    }
    if (args.dailyCheckInMinute !== undefined) {
      if (!Number.isInteger(args.dailyCheckInMinute) || args.dailyCheckInMinute < 0 || args.dailyCheckInMinute > 59) {
        throw new Error("Pick a minute from 0 to 59.");
      }
      r.dailyCheckInMinute = args.dailyCheckInMinute;
    }
    if (args.badgeEnabled !== undefined) r.badgeEnabled = args.badgeEnabled;
    await ctx.db.patch(me.profile._id, { reminders: r });
  },
});

export const updateAccessibility = mutation({
  args: {
    textSize: v.optional(textSize),
    highContrast: v.optional(v.boolean()),
    quietVisuals: v.optional(v.boolean()),
    theme: v.optional(themePref),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await ctx.db.patch(me.profile._id, {
      accessibility: {
        ...me.profile.accessibility,
        ...Object.fromEntries(Object.entries(args).filter(([, val]) => val !== undefined)),
      },
    });
  },
});

export const updateModules = mutation({
  args: {
    disabled: v.optional(v.array(v.string())),
    order: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await ctx.db.patch(me.profile._id, {
      modules: {
        disabled: args.disabled ?? me.profile.modules.disabled,
        order: args.order ?? me.profile.modules.order,
      },
    });
  },
});

/** A module stores its own settings under its own key. Other keys are untouched. */
export const setModuleSettings = mutation({
  args: { moduleId: v.string(), settings: v.any() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    await ctx.db.patch(me.profile._id, {
      moduleSettings: { ...me.profile.moduleSettings, [args.moduleId]: args.settings },
    });
  },
});

export const regenerateCalendarToken = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const calendarToken = randomToken();
    await ctx.db.patch(me.profile._id, { calendarToken });
    return calendarToken;
  },
});

/**
 * Everything this person wrote, as plain data, for the "export my data"
 * button. Never includes anything the partner wrote, not even shared items,
 * except heads-ups addressed to this person, which they were given.
 */
export const exportMine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const id = me.profile._id;
    const [manual, sent, received, gentle, checkIns, events] = await Promise.all([
      ctx.db.query("userManualSections").withIndex("by_owner", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("headsUps").withIndex("by_owner", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("headsUps").withIndex("by_receiver_status", (q) => q.eq("receiverId", id)).collect(),
      ctx.db.query("gentleModeState").withIndex("by_owner", (q) => q.eq("ownerId", id)).first(),
      ctx.db.query("checkIns").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
      ctx.db.query("events").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect(),
    ]);
    return {
      exportedAt: Date.now(),
      profile: {
        displayName: me.profile.displayName,
        timeZone: me.profile.timeZone,
        reminders: me.profile.reminders,
        accessibility: me.profile.accessibility,
        modules: me.profile.modules,
        moduleSettings: me.profile.moduleSettings,
      },
      userManual: manual,
      headsUpsSent: sent,
      headsUpsReceived: received,
      gentleMode: gentle,
      checkIns,
      events,
    };
  },
});
