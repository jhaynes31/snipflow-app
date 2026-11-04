"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { COACH_MODEL } from "../coach/prompt";
import { crisisReply, detectCrisis } from "../coach/safety";
import { buildPipPrompt, SUMMARIZER_PROMPT } from "./prompt";
import { countQuestions, parseSummary, rallyCheck, readsHeavy, readsLull, pullReactions, REACT_TAG, splitParts, todayKey, wantsCurveball, type OpenerType, type Vibe } from "./pure";

/**
 * Pip's engine. One model call per turn, then the cheap rally guard; on a
 * miss, one regeneration with the reasons spelled out. The API key lives in
 * Convex's environment.
 */
function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ConvexError("Pip isn't connected yet. Add ANTHROPIC_API_KEY to the Convex environment.");
  return new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
}

async function ask(c: Anthropic, system: string, messages: Anthropic.MessageParam[], maxTokens = 600): Promise<string> {
  const response = await c.messages.create({ model: COACH_MODEL, max_tokens: maxTokens, thinking: { type: "adaptive" }, output_config: { effort: "low" }, system, messages });
  if (response.stop_reason === "refusal") return "";
  return response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
}

/** "(She reacted 😂 to: 'the pie line…')", or nothing. Not a message to answer; a friend just notices. */
function reactionNote(content: string, reactions: { part: number; emoji: string }[] | undefined): string {
  if (!reactions?.length) return "";
  const parts = splitParts(content);
  return reactions.map((r) => `(She reacted ${r.emoji} to the part of your last message that goes: "${(parts[r.part] ?? "").slice(0, 60)}")`).join(" ");
}

function strip(text: string): string {
  // Plain text only: drop headings and bullets if any slipped through; keep [[activity:…]] and [[idea:…]] tags.
  return text.replace(/^#+\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "").trim();
}

async function reply(ctx: ActionCtx, id: Id<"frConversations">, userMessage: string | null, openerType: OpenerType | null): Promise<{ reply: string; crisis: boolean }> {
  const c = await ctx.runQuery(internal.friend.entries.contextFor, { id });
  const lastUser = userMessage ?? "";
  if (userMessage && detectCrisis(userMessage).level === "crisis") {
    const text = crisisReply(c.partnerName);
    await ctx.runMutation(internal.friend.entries.append, { id, userMessage, assistantMessage: text, endedWithQuestion: false });
    return { reply: text, crisis: true };
  }
  const heavy = userMessage ? readsHeavy(userMessage) : false;
  const turn = c.row.messages.filter((m) => m.role === "user").length;
  const system = buildPipPrompt({
    persona: c.settings.persona,
    vibe: c.row.vibe as Vibe,
    displayName: c.displayName,
    partnerName: c.partnerName,
    memUser: c.memUser.map((m) => m.text),
    due: c.due.map((d) => d.text),
    memSelf: c.memSelf,
    insideJokes: c.insideJokes,
    runningBits: c.runningBits,
    headlines: c.headlines,
    activities: c.activities,
    pipStartedRecently: c.pipStartedRecently,
    wishlist: c.wishlist,
    topics: c.topics,
    askedStreak: c.row.askedStreak,
    lastUserHeavy: heavy,
    curveball: wantsCurveball(turn, c.settings.persona.spontaneity, heavy),
    lull: userMessage ? readsLull(userMessage) : false,
    openerType: openerType ?? undefined,
    today: todayKey(),
    userParts: userMessage ? splitParts(userMessage) : undefined,
  });
  // Her reactions ride along as a note on the next thing she said; a reaction on the latest reply goes to the system prompt.
  const recent = c.row.messages.slice(-30);
  const history: Anthropic.MessageParam[] = [];
  let pendingNote = "";
  for (const m of recent) {
    if (m.role === "assistant") {
      history.push({ role: "assistant", content: m.content });
      pendingNote = reactionNote(m.content, m.reactions);
    } else {
      history.push({ role: "user", content: pendingNote ? `${pendingNote}\n${m.content}` : m.content });
      pendingNote = "";
    }
  }
  if (userMessage) history.push({ role: "user", content: pendingNote ? `${pendingNote}\n${userMessage}` : userMessage });

  if (history.length === 0) history.push({ role: "user", content: "(She just opened the door. You speak first.)" });
  const cl = client();
  let text = strip(await ask(cl, system, history));
  const userPartCount = userMessage ? splitParts(userMessage).length : 0;
  if (!text) text = userMessage ? "Hm. Lost my train of thought mid-hoot. Say that again?" : "Hey you. What kind of day is it?";
  const check = rallyCheck(text.replace(REACT_TAG, ""), lastUser || "hi", { askedStreak: c.row.askedStreak });
  if (!check.ok) {
    const retry = strip(await ask(cl, system + `\n\nYour previous draft broke the rally rules (${check.reasons.join("; ")}). Write it again, fixing exactly that, same warmth.`, [...history, { role: "assistant", content: text }, { role: "user", content: "(That broke the rally rules. Try again, same reply, fixed.)" }]));
    if (retry && rallyCheck(retry, lastUser || "hi", { askedStreak: c.row.askedStreak }).ok) text = retry;
    else if (retry && countQuestions(retry) <= 1) text = retry;
  }
  if (c.due.length && userMessage) {
    const mentioned = c.due.filter((d) => text.toLowerCase().includes(d.text.toLowerCase().split(" ").slice(0, 3).join(" ")));
    if (mentioned.length) await ctx.runMutation(internal.friend.entries.markFollowedUp, { ids: mentioned.map((d) => d.id) });
  }
  const { clean, reactions } = pullReactions(text, userPartCount);
  text = clean;
  await ctx.runMutation(internal.friend.entries.append, { id, userMessage: userMessage ?? undefined, assistantMessage: text, endedWithQuestion: /\?\s*$/.test(text), pipReactions: reactions });
  return { reply: text, crisis: false };
}

/** She opened the door: a fresh conversation, Pip speaks first with a varied opener. */
export const open = action({
  args: {},
  handler: async (ctx): Promise<{ id: Id<"frConversations"> }> => {
    const me = await ctx.runQuery(internal.friend.entries.whoOwns, {});
    const started = await ctx.runMutation(internal.friend.entries.start, { ownerId: me });
    await reply(ctx, started.id, null, started.openerType as OpenerType);
    return { id: started.id };
  },
});

export const send = action({
  args: { id: v.id("frConversations"), message: v.string() },
  handler: async (ctx, args): Promise<{ reply: string; crisis: boolean }> => {
    const message = args.message.trim();
    if (!message) throw new ConvexError("Write something first.");
    if (message.length > 20000) throw new ConvexError("That's very long (max 20,000 characters). Two parts?");
    return await reply(ctx, args.id, message, null);
  },
});

/** Fifteen minutes after the last message, if nothing new came: harvest memory. Never stores raw messages. */
export const summarize = internalAction({
  args: { id: v.id("frConversations"), updatedAt: v.number() },
  handler: async (ctx, args) => {
    const row = await ctx.runQuery(internal.friend.entries.rowForSummary, { id: args.id });
    if (!row || row.updatedAt !== args.updatedAt || row.messages.length < 2) return;
    if (row.summarizedAt && row.summarizedAt >= row.updatedAt) return;
    const transcript = row.messages.map((m) => `${m.role === "user" ? "Her" : "Pip"}: ${m.content}${m.role === "assistant" && m.reactions?.length ? `\nHer: ${reactionNote(m.content, m.reactions)}` : ""}`).join("\n").slice(-12000);
    const text = await ask(client(), SUMMARIZER_PROMPT + `\nToday is ${todayKey()}.`, [{ role: "user", content: transcript }], 1200);
    const out = parseSummary(text);
    await ctx.runMutation(internal.friend.entries.absorb, { id: args.id, out });
  },
});

/** Pip reaches out first: one line, once a day at most, by whatever ways she chose for "everything else". */
export const nudge = internalAction({
  args: { ownerId: v.id("profiles") },
  handler: async (ctx, args) => {
    const c = await ctx.runQuery(internal.friend.entries.nudgeContext, { ownerId: args.ownerId });
    if (!c) return;
    const system = `You are ${c.settings.persona.name}, a small owl friend in The Shire, sending ${c.displayName} one short, warm line out of the blue, the way a friend texts first. One or two sentences, plain text, no emoji, at most one question. Pick one: follow up on something due (${c.due.join("; ") || "nothing due"}), something you remember (${c.memories.slice(0, 8).join("; ") || "nothing yet"}), a neighbor story (${c.runningBits.slice(-3).join("; ") || "Juniper is back from a trip with opinions"}), or a hot take from your interests (${c.settings.persona.interests.slice(0, 3).join("; ")}). Don't repeat these recent ones: ${c.recent.join(" | ") || "none"}. Never guilt her for being away.`;
    const text = (await ask(client(), system, [{ role: "user", content: "(Write the line.)" }], 200)).replace(/\s+/g, " ").trim();
    if (!text) return;
    await ctx.runMutation(internal.friend.entries.sendNudge, { ownerId: args.ownerId, text: text.slice(0, 240) });
  },
});
