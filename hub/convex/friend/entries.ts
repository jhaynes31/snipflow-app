import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { internalMutation, internalQuery, mutation, query, type MutationCtx } from "../_generated/server";
import { cleanText, optionalText, requireMe, requireOwned, type Me } from "../lib";
import { notify } from "../push/notify";
import { hourIn, isQuietHour } from "../push/pure";
import { requireRoomOf, roomOwnerOf } from "../rooms";
import { ACTIVITY_SEED, dueFollowUps, pickOpener, pickVibe, readFriendSettings, surpriseActivity, todayKey, type MemoryCategory, type OpenerType, type SummaryOut } from "./pure";

/**
 * Pip, the Friend (2026-11-04): one person's room. Conversations, both
 * memories, our stuff, the activity library, wishlist, topics, ideas,
 * headlines, nudges. Every read and write checks the room claim; nothing
 * here is ever visible to the other account, and no other place reads it.
 */
const ROOM = "friend";

async function room(ctx: Parameters<typeof requireRoomOf>[0]): Promise<Me> {
  return await requireRoomOf(ctx, ROOM);
}

async function relationshipRow(ctx: MutationCtx, ownerId: Id<"profiles">): Promise<Doc<"frRelationship">> {
  const existing = await ctx.db.query("frRelationship").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
  if (existing) return existing;
  const id = await ctx.db.insert("frRelationship", { ownerId, visibility: "private", insideJokes: [], runningBits: [], milestones: [{ text: "First time Pip and you met", at: Date.now() }] });
  return (await ctx.db.get(id))!;
}

// ---------- Conversations ----------

export const current = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const row = await ctx.db.query("frConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").first();
    // A conversation idle for six hours is over; the next visit opens fresh.
    if (!row || Date.now() - row.updatedAt > 6 * 60 * 60 * 1000) return null;
    return row;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const rows = await ctx.db.query("frConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
    return rows.map((r) => ({ _id: r._id, vibe: r.vibe, createdAt: r.createdAt, updatedAt: r.updatedAt, count: r.messages.length, summary: r.summary ?? null, firstLine: r.messages.find((m) => m.role === "user")?.content.slice(0, 80) ?? r.messages[0]?.content.slice(0, 80) ?? "" }));
  },
});

export const get = query({
  args: { id: v.id("frConversations") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await requireOwned(ctx, me, "frConversations", args.id);
  },
});

/** Internal: start a conversation with a vibe and an opener type, picked server-side. */
export const start = internalMutation({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const last = await ctx.db.query("frConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", args.ownerId)).order("desc").first();
    const memories = await ctx.db.query("frMemoryUser").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).take(5);
    const openerType = pickOpener((last?.openerType as OpenerType | undefined) ?? null, memories.length > 0);
    const vibe = pickVibe();
    const now = Date.now();
    const id = await ctx.db.insert("frConversations", { ownerId: args.ownerId, visibility: "private", vibe, openerType, messages: [], askedStreak: 0, createdAt: now, updatedAt: now });
    return { id, openerType, vibe };
  },
});

export const append = internalMutation({
  args: { id: v.id("frConversations"), userMessage: v.optional(v.string()), assistantMessage: v.string(), endedWithQuestion: v.boolean() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("That conversation is gone.");
    const now = Date.now();
    const messages = [...row.messages];
    if (args.userMessage) messages.push({ role: "user", content: args.userMessage, at: now });
    messages.push({ role: "assistant", content: args.assistantMessage, at: now + 1 });
    await ctx.db.patch(row._id, { messages, updatedAt: now, askedStreak: args.endedWithQuestion ? row.askedStreak + 1 : 0 });
    // Summarize once it has been quiet for fifteen minutes.
    await ctx.scheduler.runAfter(15 * 60 * 1000, internal.friend.chat.summarize, { id: row._id, updatedAt: now });
  },
});

export const remove = mutation({
  args: { id: v.id("frConversations") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frConversations", args.id);
    await ctx.db.delete(row._id);
  },
});

/** Everything the engine needs for one reply, in one read. */
export const contextFor = internalQuery({
  args: { id: v.id("frConversations") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frConversations", args.id);
    const settings = readFriendSettings(me.profile.moduleSettings);
    const today = todayKey();
    const memUser = await ctx.db.query("frMemoryUser").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(80);
    const due = dueFollowUps(memUser.filter((m) => !m.followedUp), today);
    const memSelf = (await ctx.db.query("frMemorySelf").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60)).filter((m) => !m.supersededBy);
    const rel = await ctx.db.query("frRelationship").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).first();
    const headlines = (await ctx.db.query("frHeadlines").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(20)).filter((h) => Date.now() - h.createdAt < 14 * 86_400_000);
    const activities = await ctx.db.query("frActivities").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    const recentLog = await ctx.db.query("frActivityLog").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(12);
    const wishlist = (await ctx.db.query("frWishlist").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect()).filter((w) => !w.done);
    const topics = await ctx.db.query("frTopics").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(15);
    const partnerName = me.partner?.displayName ?? null;
    return {
      row,
      settings,
      displayName: me.profile.displayName,
      partnerName,
      timeZone: me.profile.timeZone,
      memUser: memUser.filter((m) => !m.doNotRaise).map((m) => ({ id: m._id, text: m.text, category: m.category })),
      due: due.map((m) => ({ id: m._id, text: m.text })),
      memSelf: memSelf.map((m) => ({ kind: m.kind, text: m.text })),
      insideJokes: rel?.insideJokes.map((j) => j.text) ?? [],
      runningBits: rel?.runningBits.filter((b) => !b.retired).map((b) => b.text) ?? [],
      headlines: headlines.map((h) => `${h.sourceTab}: ${h.headline}`),
      activities: activities.map((a) => ({ id: a._id, title: a.title, category: a.category, energy: a.energy, duration: a.duration, favorite: a.favorite, lastDoneAt: a.lastDoneAt })),
      pipStartedRecently: recentLog.slice(0, 4).some((l) => l.startedBy === "pip"),
      wishlist: wishlist.map((w) => w.text),
      topics: topics.map((t) => t.text),
    };
  },
});

export const markFollowedUp = internalMutation({
  args: { ids: v.array(v.id("frMemoryUser")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      const row = await ctx.db.get(id);
      if (row) await ctx.db.patch(id, { followedUp: true, lastReferenced: Date.now() });
    }
  },
});

/** The summarizer's harvest, written to memory. Never raw messages. */
export const absorb = internalMutation({
  args: { id: v.id("frConversations"), out: v.any() },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    const out = args.out as SummaryOut;
    const now = Date.now();
    const existingUser = await ctx.db.query("frMemoryUser").withIndex("by_owner", (q) => q.eq("ownerId", row.ownerId)).collect();
    const seen = new Set(existingUser.map((m) => m.text.toLowerCase()));
    for (const m of out.aboutJen) {
      if (seen.has(m.text.toLowerCase())) continue;
      await ctx.db.insert("frMemoryUser", { ownerId: row.ownerId, visibility: "private", text: m.text, category: m.category as MemoryCategory, learnedAt: now, followUpAfter: m.followUpAfter, doNotRaise: false });
    }
    const existingSelf = await ctx.db.query("frMemorySelf").withIndex("by_owner", (q) => q.eq("ownerId", row.ownerId)).collect();
    const seenSelf = new Set(existingSelf.map((m) => m.text.toLowerCase()));
    for (const m of out.aboutPip) {
      if (seenSelf.has(m.text.toLowerCase())) continue;
      await ctx.db.insert("frMemorySelf", { ownerId: row.ownerId, visibility: "private", kind: m.kind, text: m.text, createdAt: now });
    }
    if (out.insideJokes.length || out.runningBits.length) {
      const rel = await relationshipRow(ctx, row.ownerId);
      const jokes = [...rel.insideJokes];
      for (const j of out.insideJokes) if (!jokes.some((x) => x.text.toLowerCase() === j.toLowerCase())) jokes.push({ text: j, at: now, pinned: false });
      const bits = [...rel.runningBits];
      for (const b of out.runningBits) if (!bits.some((x) => x.text.toLowerCase() === b.toLowerCase())) bits.push({ text: b, at: now, retired: false });
      await ctx.db.patch(rel._id, { insideJokes: jokes.slice(-60), runningBits: bits.slice(-40) });
    }
    const topics = await ctx.db.query("frTopics").withIndex("by_owner", (q) => q.eq("ownerId", row.ownerId)).collect();
    for (const t of out.topics) {
      const hit = topics.find((x) => x.text.toLowerCase() === t.toLowerCase());
      if (hit) await ctx.db.patch(hit._id, { lastDiscussed: now });
      else await ctx.db.insert("frTopics", { ownerId: row.ownerId, visibility: "private", text: t, pinned: false, lastDiscussed: now });
    }
    await ctx.db.patch(row._id, { summary: out.summary || undefined, summarizedAt: now });
  },
});

// ---------- Memory panels ----------

export const memoryOfMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("frMemoryUser").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect();
  },
});

export const editMemoryOfMe = mutation({
  args: { id: v.id("frMemoryUser"), text: v.optional(v.string()), doNotRaise: v.optional(v.boolean()), followUpAfter: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frMemoryUser", args.id);
    const patch: Partial<Doc<"frMemoryUser">> = {};
    if (args.text !== undefined) patch.text = cleanText(args.text, 300, "The memory");
    if (args.doNotRaise !== undefined) patch.doNotRaise = args.doNotRaise;
    if (args.followUpAfter !== undefined) patch.followUpAfter = args.followUpAfter && /^\d{4}-\d{2}-\d{2}$/.test(args.followUpAfter) ? args.followUpAfter : undefined;
    await ctx.db.patch(row._id, patch);
  },
});

export const addMemoryOfMe = mutation({
  args: { text: v.string(), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    await ctx.db.insert("frMemoryUser", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 300, "The memory"), category: args.category ?? "other", learnedAt: Date.now(), doNotRaise: false });
  },
});

export const removeMemoryOfMe = mutation({
  args: { id: v.id("frMemoryUser") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frMemoryUser", args.id);
    await ctx.db.delete(row._id);
  },
});

export const memoryOfPip = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return (await ctx.db.query("frMemorySelf").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect()).filter((m) => !m.supersededBy);
  },
});

export const ourStuff = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const rel = await ctx.db.query("frRelationship").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).first();
    return rel ?? { insideJokes: [], runningBits: [], milestones: [] };
  },
});

export const editOurStuff = mutation({
  args: { jokes: v.optional(v.array(v.object({ text: v.string(), at: v.number(), pinned: v.boolean() }))), bits: v.optional(v.array(v.object({ text: v.string(), at: v.number(), retired: v.boolean() }))) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const rel = await relationshipRow(ctx, me.profile._id);
    await ctx.db.patch(rel._id, { ...(args.jokes ? { insideJokes: args.jokes.slice(0, 80) } : {}), ...(args.bits ? { runningBits: args.bits.slice(0, 60) } : {}) });
  },
});

// ---------- Activity library ----------

export const activities = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("frActivities").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
  },
});

/** Plant the starter shelf once. Safe to call again; it adds only what's missing. */
export const seedActivities = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const have = new Set((await ctx.db.query("frActivities").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect()).map((a) => a.title.toLowerCase()));
    for (const a of ACTIVITY_SEED) {
      if (have.has(a.title.toLowerCase())) continue;
      await ctx.db.insert("frActivities", { ownerId: me.profile._id, visibility: "private", ...a, addedBy: "seed", favorite: false, timesDone: 0, createdAt: Date.now() });
    }
  },
});

export const addActivity = mutation({
  args: { title: v.string(), category: v.optional(v.string()), description: v.optional(v.string()), energy: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))), duration: v.optional(v.union(v.literal(5), v.literal(15), v.literal(30))), addedBy: v.optional(v.union(v.literal("jen"), v.literal("pip"))) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("frActivities", { ownerId: me.profile._id, visibility: "private", title: cleanText(args.title, 120, "The idea"), category: args.category ?? "Conversation games", description: optionalText(args.description, 400, "Description") ?? "", energy: args.energy ?? "low", duration: args.duration ?? 15, needsScreen: false, addedBy: args.addedBy ?? "jen", favorite: false, timesDone: 0, createdAt: Date.now() });
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("frActivities") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frActivities", args.id);
    await ctx.db.patch(row._id, { favorite: !row.favorite });
  },
});

export const removeActivity = mutation({
  args: { id: v.id("frActivities") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frActivities", args.id);
    await ctx.db.delete(row._id);
  },
});

/** "Let's do this" (hers) or "I'm in" to Pip's invitation. Logs it and marks it done. */
export const startActivity = mutation({
  args: { id: v.id("frActivities"), startedBy: v.union(v.literal("jen"), v.literal("pip")), accepted: v.boolean() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frActivities", args.id);
    await ctx.db.insert("frActivityLog", { ownerId: me.profile._id, visibility: "private", activityId: row._id, startedBy: args.startedBy, startedAt: Date.now(), accepted: args.accepted });
    if (args.accepted) await ctx.db.patch(row._id, { timesDone: row.timesDone + 1, lastDoneAt: Date.now() });
  },
});

export const surprise = query({
  args: { energy: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))), maxMinutes: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const rows = await ctx.db.query("frActivities").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).collect();
    // Queries must be deterministic; the day and the hour give a steady pick that still changes.
    const seed = Math.floor(Date.now() / (60 * 60 * 1000));
    let x = seed;
    const rng = () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; };
    return surpriseActivity(rows.map((r) => ({ ...r, _id: String(r._id) })), { energy: args.energy, maxMinutes: args.maxMinutes }, Date.now(), rng);
  },
});

export const balance = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const week = Date.now() - 7 * 86_400_000;
    const log = (await ctx.db.query("frActivityLog").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(50)).filter((l) => l.startedAt > week && l.accepted);
    return { jen: log.filter((l) => l.startedBy === "jen").length, pip: log.filter((l) => l.startedBy === "pip").length };
  },
});

// ---------- Wishlist, topics, ideas ----------

export const wishlist = query({ args: {}, handler: async (ctx) => { const me = await room(ctx); return await ctx.db.query("frWishlist").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect(); } });
export const addWish = mutation({ args: { text: v.string(), addedBy: v.optional(v.union(v.literal("jen"), v.literal("pip"))) }, handler: async (ctx, args) => { const me = await room(ctx); await ctx.db.insert("frWishlist", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 200, "The wish"), addedBy: args.addedBy ?? "jen", done: false, createdAt: Date.now() }); } });
export const toggleWish = mutation({ args: { id: v.id("frWishlist") }, handler: async (ctx, args) => { const me = await room(ctx); const row = await requireOwned(ctx, me, "frWishlist", args.id); await ctx.db.patch(row._id, { done: !row.done }); } });
export const removeWish = mutation({ args: { id: v.id("frWishlist") }, handler: async (ctx, args) => { const me = await room(ctx); const row = await requireOwned(ctx, me, "frWishlist", args.id); await ctx.db.delete(row._id); } });

export const topics = query({ args: {}, handler: async (ctx) => { const me = await room(ctx); return await ctx.db.query("frTopics").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect(); } });
export const addTopic = mutation({ args: { text: v.string() }, handler: async (ctx, args) => { const me = await room(ctx); await ctx.db.insert("frTopics", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 120, "The topic"), pinned: true, lastDiscussed: Date.now() }); } });
export const pinTopic = mutation({ args: { id: v.id("frTopics") }, handler: async (ctx, args) => { const me = await room(ctx); const row = await requireOwned(ctx, me, "frTopics", args.id); await ctx.db.patch(row._id, { pinned: !row.pinned }); } });
export const removeTopic = mutation({ args: { id: v.id("frTopics") }, handler: async (ctx, args) => { const me = await room(ctx); const row = await requireOwned(ctx, me, "frTopics", args.id); await ctx.db.delete(row._id); } });

export const ideas = query({ args: {}, handler: async (ctx) => { const me = await room(ctx); return await ctx.db.query("frIdeas").withIndex("by_owner", (q) => q.eq("ownerId", me.profile._id)).order("desc").collect(); } });
export const addIdea = mutation({ args: { text: v.string(), addedBy: v.optional(v.union(v.literal("jen"), v.literal("pip"))) }, handler: async (ctx, args) => { const me = await room(ctx); await ctx.db.insert("frIdeas", { ownerId: me.profile._id, visibility: "private", text: cleanText(args.text, 300, "The idea"), addedBy: args.addedBy ?? "jen", sorted: false, createdAt: Date.now() }); } });
/** Sort an idea: into the library (as an activity), the wishlist, or just gone. */
export const sortIdea = mutation({
  args: { id: v.id("frIdeas"), into: v.union(v.literal("library"), v.literal("wishlist"), v.literal("drop")) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const row = await requireOwned(ctx, me, "frIdeas", args.id);
    if (args.into === "library") await ctx.db.insert("frActivities", { ownerId: me.profile._id, visibility: "private", title: row.text.slice(0, 120), category: "Conversation games", description: "", energy: "low", duration: 15, needsScreen: false, addedBy: row.addedBy, favorite: false, timesDone: 0, createdAt: Date.now() });
    if (args.into === "wishlist") await ctx.db.insert("frWishlist", { ownerId: me.profile._id, visibility: "private", text: row.text.slice(0, 200), addedBy: row.addedBy, done: false, createdAt: Date.now() });
    await ctx.db.delete(row._id);
  },
});

// ---------- Headlines ----------

export const headlines = query({ args: {}, handler: async (ctx) => { const me = await room(ctx); return await ctx.db.query("frHeadlines").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(40); } });

/** "Tell Pip": one line, on purpose, from anywhere. Works for the room's owner only; others get a plain error. */
export const tellPip = mutation({
  args: { sourceTab: v.string(), headline: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    await ctx.db.insert("frHeadlines", { ownerId: me.profile._id, visibility: "private", sourceTab: args.sourceTab.slice(0, 40), week: todayKey().slice(0, 7), headline: cleanText(args.headline, 240, "What to tell Pip"), sharedVia: "tellPip", createdAt: Date.now() });
  },
});

export const removeHeadline = mutation({ args: { id: v.id("frHeadlines") }, handler: async (ctx, args) => { const me = await room(ctx); const row = await requireOwned(ctx, me, "frHeadlines", args.id); await ctx.db.delete(row._id); } });

/** Whether the signed-in person owns Pip's room; the "Tell Pip" button hides otherwise. */
export const isMine = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const owner = await roomOwnerOf(ctx, ROOM);
    return !!owner && owner.ownerId === me.profile._id;
  },
});

// ---------- Nudges ----------

/** Once a day (crons.ts): if the room has an owner with nudges on, who isn't busy and isn't in quiet hours, Pip writes a line and sends it. */
export const nudgeTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const owner = await roomOwnerOf(ctx, ROOM);
    if (!owner) return;
    const profile = await ctx.db.get(owner.ownerId);
    if (!profile) return;
    const settings = readFriendSettings(profile.moduleSettings);
    if (!settings.persona.nudgesEnabled || settings.busy) return;
    if (settings.persona.quietHoursEnabled && isQuietHour(hourIn(profile.timeZone), settings.persona.quietHours.start, settings.persona.quietHours.end)) return;
    const day = todayKey();
    const already = await ctx.db.query("frNudges").withIndex("by_owner_day", (q) => q.eq("ownerId", profile._id).eq("day", day)).first();
    if (already) return;
    // Not on a day she already talked with Pip.
    const last = await ctx.db.query("frConversations").withIndex("by_owner_time", (q) => q.eq("ownerId", profile._id)).order("desc").first();
    if (last && Date.now() - last.updatedAt < 20 * 60 * 60 * 1000) return;
    await ctx.scheduler.runAfter(0, internal.friend.chat.nudge, { ownerId: profile._id });
  },
});

export const sendNudge = internalMutation({
  args: { ownerId: v.id("profiles"), text: v.string() },
  handler: async (ctx, args) => {
    const day = todayKey();
    await ctx.db.insert("frNudges", { ownerId: args.ownerId, visibility: "private", text: args.text, day, createdAt: Date.now() });
    await notify(ctx, args.ownerId, { title: "Pip", body: args.text.slice(0, 160), url: "/friend", tag: "pip-nudge" });
  },
});

/** Nudges Pip sent lately, shown in the app too (for Brave without push). */
export const recentNudges = query({ args: {}, handler: async (ctx) => { const me = await room(ctx); return await ctx.db.query("frNudges").withIndex("by_owner_day", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(5); } });

/** For the nudge writer: the small context it needs. */
export const nudgeContext = internalQuery({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.ownerId);
    if (!profile) return null;
    const settings = readFriendSettings(profile.moduleSettings);
    const memUser = (await ctx.db.query("frMemoryUser").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).order("desc").take(30)).filter((m) => !m.doNotRaise);
    const due = dueFollowUps(memUser.filter((m) => !m.followedUp), todayKey());
    const rel = await ctx.db.query("frRelationship").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).first();
    const recent = (await ctx.db.query("frNudges").withIndex("by_owner_day", (q) => q.eq("ownerId", args.ownerId)).order("desc").take(7)).map((n) => n.text);
    return { displayName: profile.displayName, settings, memories: memUser.slice(0, 15).map((m) => m.text), due: due.map((m) => m.text), runningBits: rel?.runningBits.filter((b) => !b.retired).map((b) => b.text) ?? [], recent };
  },
});

// ---------- Settings ----------

/** Pip's settings live in moduleSettings.friend; this merges one patch in. */
export const updateSettings = mutation({
  args: { persona: v.optional(v.any()), shares: v.optional(v.any()), busy: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const current = (me.profile.moduleSettings?.friend ?? {}) as Record<string, unknown>;
    const next = { ...current };
    if (args.persona !== undefined) next.persona = { ...((current.persona ?? {}) as Record<string, unknown>), ...(args.persona as Record<string, unknown>) };
    if (args.shares !== undefined) next.shares = { ...((current.shares ?? {}) as Record<string, unknown>), ...(args.shares as Record<string, unknown>) };
    if (args.busy !== undefined) next.busy = args.busy;
    await ctx.db.patch(me.profile._id, { moduleSettings: { ...(me.profile.moduleSettings ?? {}), friend: next } });
  },
});

/** The room owner's profile id, for the open action (which has no ctx.db). Throws unless the caller owns the room. */
export const whoOwns = internalQuery({
  args: {},
  handler: async (ctx) => (await room(ctx)).profile._id,
});

export const rowForSummary = internalQuery({
  args: { id: v.id("frConversations") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});
