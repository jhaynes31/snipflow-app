import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "../_generated/server";
import { cleanText, optionalText, randomToken, requireMe, requireOwned } from "../lib";
import { dayKey } from "../tend/patterns";
import { requireRoomOf, roomOwnerOf } from "../rooms";

const ROOM = "metamorphosis";
const room = (ctx: Parameters<typeof requireRoomOf>[0]) => requireRoomOf(ctx, ROOM);

/** Step 3 of Metamorphosis. Every row his, private, deletable, except the Blessing, which the partner writes and only he reads. */

// Letters (his, and the mentor's)

export const letters = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmLetters").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const writeLetter = mutation({
  args: { key: v.string(), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmLetters", { ownerId: me.profile._id, visibility: "private", kind: "mine", key: cleanText(args.key, 30, "Key"), title: cleanText(args.title, 120, "Title"), body: cleanText(args.body, 8000, "The letter"), createdAt: Date.now() });
  },
});

export const openLetter = mutation({
  args: { id: v.id("mmLetters") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const l = await requireOwned(ctx, me, "mmLetters", args.id);
    if (!l.openedAt) await ctx.db.patch(l._id, { openedAt: Date.now() });
  },
});

export const removeLetter = mutation({
  args: { id: v.id("mmLetters") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const l = await requireOwned(ctx, me, "mmLetters", args.id);
    await ctx.db.delete(l._id);
  },
});

/** Saves the mentor's monthly letter. Internal; only the letter action writes. */
export const saveMentorLetter = internalMutation({
  args: { ownerId: v.id("profiles"), title: v.string(), body: v.string(), periodStart: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mmLetters", { ownerId: args.ownerId, visibility: "private", kind: "mentor", title: args.title, body: args.body, periodStart: args.periodStart, createdAt: Date.now() });
  },
});

/** What the monthly letter is written from: the room's owner and a month of his own logs, in plain counts and lines. Internal. */
export const letterFacts = internalQuery({
  args: { periodStart: v.string(), periodEnd: v.string() },
  handler: async (ctx, args) => {
    const owner = await roomOwnerOf(ctx, ROOM);
    if (!owner) return null;
    const profile = await ctx.db.get(owner.ownerId);
    if (!profile) return null;
    const settings = (profile.moduleSettings?.metamorphosis as { letters?: boolean } | undefined) ?? {};
    if (settings.letters === false) return null;
    const id = owner.ownerId;
    const within = (day: string) => day >= args.periodStart && day <= args.periodEnd;
    const existing = await ctx.db.query("mmLetters").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect();
    if (existing.some((l) => l.kind === "mentor" && l.periodStart === args.periodStart)) return null;
    const sheet = (await ctx.db.query("mmSheet").withIndex("by_owner_key", (q) => q.eq("ownerId", id)).collect()).filter((r) => r.coachAllowed && r.text.trim()).map((r) => ({ key: r.key, text: r.text }));
    const mirror = (await ctx.db.query("mmMirror").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((m) => within(m.day));
    const tired = (await ctx.db.query("mmTired").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((t) => within(t.day)).map((t) => t.text);
    const scout = (await ctx.db.query("mmScout").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((t) => within(t.day)).map((t) => `${t.noticed}${t.did ? ` → ${t.did}` : ""}`);
    const iron = (await ctx.db.query("mmIron").withIndex("by_owner_status", (q) => q.eq("ownerId", id).eq("status", "kept")).collect()).filter((r) => r.closedAt && within(dayKey(r.closedAt, profile.timeZone))).map((r) => r.text);
    const quests = (await ctx.db.query("mmQuests").withIndex("by_owner_status", (q) => q.eq("ownerId", id).eq("status", "done")).collect()).filter((r) => r.closedAt && within(dayKey(r.closedAt, profile.timeZone))).map((r) => r.title);
    const present = (await ctx.db.query("mmPresent").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((p) => within(p.day)).map((p) => [p.here, p.fought].filter(Boolean).join(" / "));
    const seen = (await ctx.db.query("mmSeen").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((s) => s.done && s.doneAt && within(dayKey(s.doneAt, profile.timeZone))).map((s) => s.act);
    const builder = (await ctx.db.query("mmBuilder").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()).filter((b) => within(b.day)).map((b) => b.action);
    return {
      ownerId: id,
      name: sheet.find((s) => s.key === "name")?.text ?? profile.displayName,
      sheet,
      mirror: { checkIns: mirror.length, survivalDays: mirror.filter((m) => m.survival).length, feelings: mirror.map((m) => m.feeling).filter(Boolean), wants: mirror.map((m) => m.want).filter(Boolean) },
      doneTired: tired,
      scouted: scout,
      ironKept: iron,
      questsDone: quests,
      present,
      seen,
      builder,
    };
  },
});

// The Party

export const party = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmParty").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).collect();
  },
});

export const addParty = mutation({
  args: { name: v.string(), where: v.optional(v.string()), nextStep: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmParty", { ownerId: me.profile._id, visibility: "private", name: cleanText(args.name, 80, "Name"), where: optionalText(args.where, 120, "Where"), nextStep: optionalText(args.nextStep, 200, "Next step"), createdAt: Date.now() });
  },
});

export const updateParty = mutation({
  args: { id: v.id("mmParty"), lastTalked: v.optional(v.string()), nextStep: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmParty", args.id);
    await ctx.db.patch(r._id, { lastTalked: optionalText(args.lastTalked, 200, "Last talked"), nextStep: optionalText(args.nextStep, 200, "Next step") });
  },
});

export const removeParty = mutation({
  args: { id: v.id("mmParty") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmParty", args.id);
    await ctx.db.delete(r._id);
  },
});

// The Horizon

export const horizon = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmHorizon").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(100);
  },
});

export const addHorizon = mutation({
  args: { prompt: v.optional(v.string()), text: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmHorizon", { ownerId: me.profile._id, visibility: "private", prompt: optionalText(args.prompt, 200, "Prompt"), text: cleanText(args.text, 4000, "The dream"), createdAt: Date.now() });
  },
});

export const removeHorizon = mutation({
  args: { id: v.id("mmHorizon") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const r = await requireOwned(ctx, me, "mmHorizon", args.id);
    await ctx.db.delete(r._id);
  },
});

// Small Ways, Present, Builder, Failure Check: simple daily logs

export const smallWays = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmSmallWays").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const didSmallWay = mutation({
  args: { title: v.string(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmSmallWays", { ownerId: me.profile._id, visibility: "private", title: cleanText(args.title, 120, "Which one"), note: optionalText(args.note, 300, "Note"), day: dayKey(Date.now(), me.profile.timeZone), createdAt: Date.now() });
  },
});

export const present = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const today = dayKey(Date.now(), me.profile.timeZone);
    const rows = await ctx.db.query("mmPresent").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
    return { today, todays: rows.find((r) => r.day === today) ?? null, rows };
  },
});

export const setPresent = mutation({
  args: { here: v.optional(v.string()), fought: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const day = dayKey(Date.now(), me.profile.timeZone);
    const here = optionalText(args.here, 300, "Here");
    const fought = optionalText(args.fought, 300, "Fought for");
    if (!here && !fought) throw new ConvexError("Write one of the two. Tiny counts.");
    const rows = await ctx.db.query("mmPresent").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(5);
    const existing = rows.find((r) => r.day === day);
    if (existing) {
      await ctx.db.patch(existing._id, { here: here ?? existing.here, fought: fought ?? existing.fought });
      return existing._id;
    }
    return await ctx.db.insert("mmPresent", { ownerId: me.profile._id, visibility: "private", day, here, fought, createdAt: Date.now() });
  },
});

export const builder = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmBuilder").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(60);
  },
});

export const addBuilder = mutation({
  args: { action: v.string() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    return await ctx.db.insert("mmBuilder", { ownerId: me.profile._id, visibility: "private", day: dayKey(Date.now(), me.profile.timeZone), action: cleanText(args.action, 300, "The action"), createdAt: Date.now() });
  },
});

export const failureChecks = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmFailureChecks").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
  },
});

export const addFailureCheck = mutation({
  args: { answers: v.array(v.object({ key: v.string(), text: v.string() })) },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const answers = args.answers.map((a) => ({ key: cleanText(a.key, 30, "Key"), text: a.text.trim().slice(0, 800) })).filter((a) => a.text);
    if (answers.length === 0) throw new ConvexError("Write at least what actually happened.");
    return await ctx.db.insert("mmFailureChecks", { ownerId: me.profile._id, visibility: "private", answers, createdAt: Date.now() });
  },
});

/** Actually: his real successes this week and last, named, never counted. */
export const actually = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const id = me.profile._id;
    const now = Date.now();
    const since = now - 14 * 24 * 3600_000;
    const dayOf = (ms: number) => dayKey(ms, me.profile.timeZone);
    const items: { day: string; text: string }[] = [];
    for (const r of await ctx.db.query("mmIron").withIndex("by_owner_status", (q) => q.eq("ownerId", id).eq("status", "kept")).collect()) if (r.closedAt && r.closedAt > since) items.push({ day: dayOf(r.closedAt), text: `You kept your word to yourself: ${r.text}` });
    for (const r of await ctx.db.query("mmQuests").withIndex("by_owner_status", (q) => q.eq("ownerId", id).eq("status", "done")).collect()) if (r.closedAt && r.closedAt > since) items.push({ day: dayOf(r.closedAt), text: `Quest done: ${r.title}` });
    for (const r of await ctx.db.query("mmTired").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) items.push({ day: r.day, text: `You did it tired: ${r.text}` });
    for (const r of await ctx.db.query("mmScout").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) if (r.did) items.push({ day: r.day, text: `You noticed and moved before anyone asked: ${r.did}` });
    for (const r of await ctx.db.query("mmPresent").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) { if (r.here) items.push({ day: r.day, text: `You were here: ${r.here}` }); if (r.fought) items.push({ day: r.day, text: `You fought for something: ${r.fought}` }); }
    for (const r of await ctx.db.query("mmSeen").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) if (r.done && r.doneAt) items.push({ day: dayOf(r.doneAt), text: `You let yourself be seen: ${r.act}` });
    for (const r of await ctx.db.query("mmBuilder").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) items.push({ day: r.day, text: `Business: ${r.action}` });
    for (const r of await ctx.db.query("mmSmallWays").withIndex("by_owner_time", (q) => q.eq("ownerId", id).gte("createdAt", since)).collect()) items.push({ day: r.day, text: `Small way: ${r.title}` });
    for (const r of await ctx.db.query("kwWords").withIndex("by_owner_status", (q) => q.eq("ownerId", id).eq("status", "kept")).collect()) if (r.closedAt && r.closedAt > since) items.push({ day: dayOf(r.closedAt), text: `A word kept, in Kept Word: ${r.text}` });
    items.sort((a, b) => b.day.localeCompare(a.day));
    return { today: dayOf(now), items };
  },
});

// For my therapist: shares

export const shares = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    return await ctx.db.query("mmShares").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(20);
  },
});

export const createShare = mutation({
  args: { sections: v.array(v.string()), days: v.number() },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const days = Math.min(90, Math.max(1, Math.round(args.days)));
    const sections = args.sections.map((s) => cleanText(s, 30, "Section"));
    if (sections.length === 0) throw new ConvexError("Pick at least one section to share.");
    return await ctx.db.insert("mmShares", { ownerId: me.profile._id, visibility: "private", token: randomToken(40), sections, expiresAt: Date.now() + days * 24 * 3600_000, createdAt: Date.now() });
  },
});

export const revokeShare = mutation({
  args: { id: v.id("mmShares") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const s = await requireOwned(ctx, me, "mmShares", args.id);
    await ctx.db.patch(s._id, { revokedAt: Date.now() });
  },
});

/** The shared pages, by token, for the public route. No login; the token is the key. */
export const sharedByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (args.token.length < 20) return null;
    const share = await ctx.db.query("mmShares").withIndex("by_token", (q) => q.eq("token", args.token)).first();
    if (!share || share.revokedAt || share.expiresAt < Date.now()) return null;
    const id = share.ownerId;
    const profile = await ctx.db.get(id);
    const out: { section: string; lines: string[] }[] = [];
    const has = (s: string) => share.sections.includes(s);
    if (has("sheet")) out.push({ section: "Character Sheet", lines: (await ctx.db.query("mmSheet").withIndex("by_owner_key", (q) => q.eq("ownerId", id)).collect()).map((r) => `${r.key}: ${r.text}`) });
    if (has("mirror")) out.push({ section: "The Mirror", lines: (await ctx.db.query("mmMirror").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(120)).map((m) => `${m.day}: ${m.survival ? "survival. " : ""}${[m.feeling, m.under && `under: ${m.under}`, m.body, m.want && `want: ${m.want}`].filter(Boolean).join(" / ")}`) });
    if (has("maps")) out.push({ section: "The Map", lines: (await ctx.db.query("mmMaps").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(30)).map((m) => m.levels.map((l) => `${l.key}: ${l.text}`).join(" | ")) });
    if (has("letters")) out.push({ section: "Letters", lines: (await ctx.db.query("mmLetters").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(20)).map((l) => `${l.title}\n${l.body}`) });
    if (has("failure")) out.push({ section: "Failure Checks", lines: (await ctx.db.query("mmFailureChecks").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(30)).map((f) => f.answers.map((a) => `${a.key}: ${a.text}`).join(" | ")) });
    if (has("present")) out.push({ section: "Present", lines: (await ctx.db.query("mmPresent").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).order("desc").take(60)).map((p) => `${p.day}: ${[p.here, p.fought].filter(Boolean).join(" / ")}`) });
    return { name: profile?.displayName ?? "The room's owner", expiresAt: share.expiresAt, sections: out };
  },
});

// The Blessing

/** The partner writes one. Readable only by the room's owner. The writer sees only that it was opened. */
export const myBlessings = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const rows = await ctx.db.query("mmBlessings").withIndex("by_room", (q) => q.eq("roomId", ROOM)).collect();
    return rows.filter((b) => b.ownerId === me.profile._id).map((b) => ({ _id: b._id, occasion: b.occasion, body: b.body, createdAt: b.createdAt, opened: !!b.openedAt }));
  },
});

export const writeBlessing = mutation({
  args: { occasion: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const owner = await roomOwnerOf(ctx, ROOM);
    if (owner && owner.ownerId === me.profile._id) throw new ConvexError("A blessing is written by the other person, for the room's owner.");
    return await ctx.db.insert("mmBlessings", { ownerId: me.profile._id, visibility: "private", roomId: ROOM, occasion: cleanText(args.occasion, 120, "The occasion"), body: cleanText(args.body, 6000, "The blessing"), createdAt: Date.now() });
  },
});

export const reviseBlessing = mutation({
  args: { id: v.id("mmBlessings"), occasion: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const b = await requireOwned(ctx, me, "mmBlessings", args.id);
    if (b.openedAt) throw new ConvexError("Once it's been opened it stays as it was.");
    await ctx.db.patch(b._id, { occasion: cleanText(args.occasion, 120, "The occasion"), body: cleanText(args.body, 6000, "The blessing") });
  },
});

export const removeBlessing = mutation({
  args: { id: v.id("mmBlessings") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const b = await requireOwned(ctx, me, "mmBlessings", args.id);
    if (b.openedAt) throw new ConvexError("Once it's been opened it stays.");
    await ctx.db.delete(b._id);
  },
});

/** The room's owner reads them. Sealed ones show only the occasion until opened. */
export const blessingsForMe = query({
  args: {},
  handler: async (ctx) => {
    const me = await room(ctx);
    const rows = await ctx.db.query("mmBlessings").withIndex("by_room", (q) => q.eq("roomId", ROOM)).collect();
    return rows
      .filter((b) => b.ownerId !== me.profile._id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((b) => ({ _id: b._id, occasion: b.occasion, body: b.openedAt ? b.body : null, createdAt: b.createdAt, openedAt: b.openedAt ?? null }));
  },
});

export const openBlessing = mutation({
  args: { id: v.id("mmBlessings") },
  handler: async (ctx, args) => {
    const me = await room(ctx);
    const b = await ctx.db.get(args.id);
    if (!b || b.roomId !== ROOM || b.ownerId === me.profile._id) throw new ConvexError("That isn't for you.");
    if (!b.openedAt) await ctx.db.patch(b._id, { openedAt: Date.now() });
  },
});
