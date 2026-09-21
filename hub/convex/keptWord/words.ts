import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type QueryCtx } from "../_generated/server";
import { emitEvent } from "../events";
import { notify, notifyPartner, who } from "../push/notify";
import { cleanText, optionalText, requireMe, requireOwned, requirePartner, type Me } from "../lib";
import { dayKey } from "../tend/patterns";
import { buildWeeks, cleanArea, noticesFor, readKeptWordSettings } from "./pure";

/**
 * Words. Only the giver creates and closes their own words. The partner
 * reads everything and can add "I heard you say", which becomes a word only
 * when the giver confirms it. Nothing here is ever marked by the partner.
 */

const forWhom = v.union(v.literal("partner"), v.literal("me"), v.literal("us"));
const reason = v.union(v.literal("forgot"), v.literal("overcommitted"), v.literal("avoided"), v.literal("changedMind"), v.literal("outsideControl"));
const whatNow = v.union(v.literal("smaller"), v.literal("notHappening"), v.literal("askedHelp"));

function cleanDay(day: string | undefined): string | undefined {
  if (!day) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ConvexError("Pick a day from the calendar.");
  return day;
}

async function allWords(ctx: { db: QueryCtx["db"] }, ids: Id<"profiles">[]): Promise<Doc<"kwWords">[]> {
  const out: Doc<"kwWords">[] = [];
  for (const id of ids) {
    out.push(...(await ctx.db.query("kwWords").withIndex("by_owner_time", (q) => q.eq("ownerId", id)).collect()));
  }
  return out;
}

function household(me: Me): Id<"profiles">[] {
  return [me.profile._id, ...(me.partner ? [me.partner._id] : [])];
}

/** Everything open, for both people, soonest first. Plus what is waiting on me. */
export const open = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const words = (await allWords(ctx, household(me))).filter((w) => w.status === "open");
    const key = (w: Doc<"kwWords">) => w.dueDay ?? "9999";
    words.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : a.createdAt - b.createdAt));
    const heardForMe = await ctx.db
      .query("kwHeard")
      .withIndex("by_about_status", (q) => q.eq("aboutProfileId", me.profile._id).eq("status", "waiting"))
      .collect();
    const heardByMe = me.partner
      ? await ctx.db
          .query("kwHeard")
          .withIndex("by_about_status", (q) => q.eq("aboutProfileId", me.partner!._id).eq("status", "waiting"))
          .collect()
      : [];
    const today = dayKey(Date.now(), me.profile.timeZone);
    return { words, heardForMe, heardByMe, today };
  },
});

/** The whole record for the app-written weeks and the Kept page. */
export const record = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const words = await allWords(ctx, household(me));
    const dayOf = (ms: number) => dayKey(ms, me.profile.timeZone);
    const names: Record<string, string> = { [me.profile._id]: me.profile.displayName };
    if (me.partner) names[me.partner._id] = me.partner.displayName;
    return {
      weeks: buildWeeks(words.filter((w) => w.status !== "open"), dayOf),
      kept: words
        .filter((w) => w.status === "kept")
        .sort((a, b) => (b.closedAt ?? b.createdAt) - (a.closedAt ?? a.createdAt))
        .map((w) => ({ _id: w._id, giverId: w.ownerId, text: w.text, dueDay: w.dueDay, closedAt: w.closedAt ?? w.createdAt, forWhom: w.forWhom })),
      names,
    };
  },
});

/** My private pattern notices. Never the partner's. */
export const myNotices = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const settings = readKeptWordSettings(me.profile.moduleSettings);
    if (!settings.notices) return [];
    const mine = await ctx.db.query("kwWords").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).collect();
    return noticesFor(mine);
  },
});

export const give = mutation({
  args: { text: v.string(), area: v.string(), forWhom, dueDay: v.optional(v.string()), askId: v.optional(v.id("kwAsks")) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const id = await ctx.db.insert("kwWords", {
      ownerId: me.profile._id,
      visibility: "shared",
      text: cleanText(args.text, 300, "The word"),
      area: cleanArea(args.area),
      forWhom: args.forWhom,
      dueDay: cleanDay(args.dueDay),
      status: "open",
      askId: args.askId,
      createdAt: Date.now(),
    });
    let fromAsk = false;
    if (args.askId) {
      const ask = await ctx.db.get(args.askId);
      if (ask && ask.toProfileId === me.profile._id) {
        await ctx.db.patch(ask._id, { answer: "word", answeredAt: Date.now(), wordId: id });
        await emitEvent(ctx, { ownerId: me.profile._id, source: "kept-word", name: "ask.answered", payload: { askId: ask._id, answer: "word" }, visibility: "shared" });
        fromAsk = true;
      }
    }
    if (args.forWhom === "partner" || fromAsk) {
      const word = await ctx.db.get(id);
      await notifyPartner(ctx, me, {
        title: fromAsk ? `${who(me)} made your ask a word` : `${who(me)} gave their word`,
        body: word ? `${word.text}${word.dueDay ? ` · by ${word.dueDay}` : ""}` : "",
        url: "/kept-word",
        tag: `word-${id}`,
      });
    }
    return id;
  },
});

/** Close my own word. "Didn't" needs a reason and a "what now"; there is no quiet close. */
export const close = mutation({
  args: {
    id: v.id("kwWords"),
    outcome: v.union(v.literal("kept"), v.literal("notYet"), v.literal("didnt")),
    reason: v.optional(reason),
    whatNow: v.optional(whatNow),
    note: v.optional(v.string()),
    /** For "say it again, smaller": the new word. */
    smaller: v.optional(v.object({ text: v.string(), dueDay: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const word = await requireOwned(ctx, me, "kwWords", args.id);
    if (word.status !== "open") throw new ConvexError("That word is already closed.");
    const note = optionalText(args.note, 400, "Note");
    const now = Date.now();
    if (args.outcome === "notYet") {
      await ctx.db.patch(word._id, { note });
      return null;
    }
    if (args.outcome === "kept") {
      await ctx.db.patch(word._id, { status: "kept", note, closedAt: now });
      await emitEvent(ctx, { ownerId: me.profile._id, source: "kept-word", name: "word.kept", payload: { wordId: word._id, area: word.area, forWhom: word.forWhom }, visibility: "shared" });
      await notifyPartner(ctx, me, { title: `${who(me)} kept a word`, body: word.text, url: "/kept-word/kept", tag: `word-${word._id}` });
      return null;
    }
    if (!args.reason || !args.whatNow) throw new ConvexError("Say what got in the way, and what now. Those are the two honest parts.");
    let replacedBy: Id<"kwWords"> | undefined;
    if (args.whatNow === "smaller") {
      if (!args.smaller?.text.trim()) throw new ConvexError("Write the smaller word.");
      replacedBy = await ctx.db.insert("kwWords", {
        ownerId: me.profile._id,
        visibility: "shared",
        text: cleanText(args.smaller.text, 300, "The smaller word"),
        area: word.area,
        forWhom: word.forWhom,
        dueDay: cleanDay(args.smaller.dueDay),
        status: "open",
        replaces: word._id,
        createdAt: now,
      });
    }
    await ctx.db.patch(word._id, { status: "didnt", reason: args.reason, whatNow: args.whatNow, note, closedAt: now, replacedBy });
    await emitEvent(ctx, {
      ownerId: me.profile._id,
      source: "kept-word",
      name: "word.didnt",
      payload: { wordId: word._id, area: word.area, forWhom: word.forWhom, whatNow: args.whatNow },
      visibility: "shared",
    });
    const whatNowSaid = args.whatNow === "smaller" ? "Said it again, smaller." : args.whatNow === "notHappening" ? "Said it's not happening." : "Asked for help.";
    await notifyPartner(ctx, me, { title: `${who(me)} didn't keep a word, and said so`, body: `${word.text} · ${whatNowSaid}`, url: "/kept-word", tag: `word-${word._id}` });
    return replacedBy ?? null;
  },
});

/** Before the day comes: "I can't keep this as said; here's what I can do." Counts as honesty, not a broken word. */
export const renegotiate = mutation({
  args: { id: v.id("kwWords"), text: v.string(), dueDay: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const word = await requireOwned(ctx, me, "kwWords", args.id);
    if (word.status !== "open") throw new ConvexError("That word is already closed.");
    const today = dayKey(Date.now(), me.profile.timeZone);
    if (word.dueDay && word.dueDay < today) throw new ConvexError("The day has passed, so this one is kept, not yet, or didn't.");
    const now = Date.now();
    const newId = await ctx.db.insert("kwWords", {
      ownerId: me.profile._id,
      visibility: "shared",
      text: cleanText(args.text, 300, "The new word"),
      area: word.area,
      forWhom: word.forWhom,
      dueDay: cleanDay(args.dueDay),
      status: "open",
      replaces: word._id,
      createdAt: now,
    });
    await ctx.db.patch(word._id, { status: "renegotiated", replacedBy: newId, closedAt: now });
    await notifyPartner(ctx, me, { title: `${who(me)} changed a word before the day`, body: cleanText(args.text, 300, "The new word"), url: "/kept-word", tag: `word-${word._id}` });
    return newId;
  },
});

export const remove = mutation({
  args: { id: v.id("kwWords") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const word = await requireOwned(ctx, me, "kwWords", args.id);
    if (word.status !== "open") throw new ConvexError("Closed words stay on the record.");
    await ctx.db.delete(word._id);
  },
});

/** Send an open word of mine to Every Box as a commitment. */
export const sendToEveryBox = mutation({
  args: { id: v.id("kwWords") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const word = await requireOwned(ctx, me, "kwWords", args.id);
    if (word.sentToEveryBoxAt) throw new ConvexError("Already in Every Box.");
    await ctx.db.patch(word._id, { sentToEveryBoxAt: Date.now() });
    await emitEvent(ctx, { ownerId: me.profile._id, source: "kept-word", name: "word.sendToEveryBox", payload: { title: word.text, wordId: word._id } });
  },
});

// "I heard you say"

export const heard = mutation({
  args: { text: v.string(), dueDay: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const partner = await requirePartner(ctx, me);
    const text = cleanText(args.text, 300, "What you heard");
    const id = await ctx.db.insert("kwHeard", {
      ownerId: me.profile._id,
      visibility: "shared",
      aboutProfileId: partner._id,
      text,
      dueDay: cleanDay(args.dueDay),
      status: "waiting",
      createdAt: Date.now(),
    });
    await notify(ctx, partner._id, { title: `${who(me)} wrote what they heard you say`, body: `${text} · Is that right?`, url: "/kept-word", tag: `heard-${id}` });
    return id;
  },
});

/** The giver confirms (as heard, or edited) or declines. Either way it is on the record. */
export const answerHeard = mutation({
  args: { id: v.id("kwHeard"), confirm: v.boolean(), text: v.optional(v.string()), area: v.optional(v.string()), dueDay: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const h = await ctx.db.get(args.id);
    if (!h || h.aboutProfileId !== me.profile._id) throw new ConvexError("That isn't about you.");
    if (h.status !== "waiting") throw new ConvexError("Already answered.");
    if (!args.confirm) {
      await ctx.db.patch(h._id, { status: "declined" });
      await notify(ctx, h.ownerId, { title: `${who(me)} said that's not quite it`, body: h.text, url: "/kept-word", tag: `heard-${h._id}` });
      return null;
    }
    const wordId = await ctx.db.insert("kwWords", {
      ownerId: me.profile._id,
      visibility: "shared",
      text: cleanText(args.text ?? h.text, 300, "The word"),
      area: cleanArea(args.area ?? "other"),
      forWhom: "partner",
      dueDay: cleanDay(args.dueDay ?? h.dueDay),
      status: "open",
      heardId: h._id,
      createdAt: Date.now(),
    });
    await ctx.db.patch(h._id, { status: "confirmed", wordId });
    await notify(ctx, h.ownerId, { title: `${who(me)} confirmed it as their word`, body: cleanText(args.text ?? h.text, 300, "The word"), url: "/kept-word", tag: `heard-${h._id}` });
    return wordId;
  },
});

export const removeHeard = mutation({
  args: { id: v.id("kwHeard") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const h = await requireOwned(ctx, me, "kwHeard", args.id);
    if (h.status !== "waiting") throw new ConvexError("Answered drafts stay on the record.");
    await ctx.db.delete(h._id);
  },
});

/** Words with a day, for the calendar feed. Called by calendar.ts with a profile, not a viewer. */
export async function wordsForCalendar(ctx: { db: QueryCtx["db"] }, profile: Doc<"profiles">): Promise<{ id: string; text: string; dueDay: string }[]> {
  if (!readKeptWordSettings(profile.moduleSettings).wordsOnCalendar) return [];
  const open = await ctx.db.query("kwWords").withIndex("by_owner_status", (q) => q.eq("ownerId", profile._id).eq("status", "open")).collect();
  return open.filter((w) => w.dueDay).map((w) => ({ id: w._id, text: w.text, dueDay: w.dueDay! }));
}
