"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action, internalAction, type ActionCtx } from "../_generated/server";
import { COACH_MODEL } from "../coach/prompt";
import type { DueItem } from "./collect";
import { MINE_SYSTEM_PROMPT, nowPeriod, OURS_SYSTEM_PROMPT, periodTitle, type Period } from "./pure";

/**
 * Writing a season: gather the facts under the privacy rules, hand them to
 * the coach model with the Seasons system prompt, save the prose. The API
 * key lives in Convex's environment only.
 */

const period = v.object({ interval: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly"), v.literal("now")), start: v.string(), end: v.string() });

async function write(ctx: ActionCtx, profileId: Id<"profiles">, kind: "mine" | "ours", p: Period): Promise<Id<"seasonReports">> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Seasons needs the coach. Add ANTHROPIC_API_KEY to the Convex environment and try again.");
  const facts = kind === "mine" ? await ctx.runQuery(internal.seasons.collect.mine, { profileId, period: p }) : await ctx.runQuery(internal.seasons.collect.ours, { profileId, period: p });
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 120_000 });
  const response = await client.messages.create({
    model: COACH_MODEL,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: kind === "mine" ? MINE_SYSTEM_PROMPT : OURS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Facts for the period ${p.start} to ${p.end} ("now"), with the same counts for the period before ("before"):\n\n${JSON.stringify(facts, null, 2)}` }],
  });
  let body = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (response.stop_reason === "refusal" || !body) body = "This season couldn't be written just now. The facts are kept; try again in a little while.";
  return await ctx.runMutation(internal.seasons.reports.save, {
    ownerId: profileId,
    kind,
    interval: p.interval,
    periodStart: p.start,
    periodEnd: p.end,
    title: periodTitle(kind, p),
    body,
    facts,
  });
}

/** "Write my season now": the last 30 days, for the signed-in person. */
export const writeMineNow = action({
  args: {},
  handler: async (ctx): Promise<Id<"seasonReports">> => {
    const me = await ctx.runQuery(internal.seasons.collect.whoAmI, {});
    return await write(ctx, me.profileId, "mine", nowPeriod(me.today));
  },
});

/** "Write our season now": the last 30 days, shared, when both have it on. */
export const writeOursNow = action({
  args: {},
  handler: async (ctx): Promise<Id<"seasonReports">> => {
    const me = await ctx.runQuery(internal.seasons.collect.whoAmI, {});
    if (!me.partnerId) throw new Error("Your partner hasn't joined yet.");
    return await write(ctx, me.profileId, "ours", nowPeriod(me.today));
  },
});

/** The daily tick: write every report that is due today and doesn't exist. */
export const tick = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const due: DueItem[] = await ctx.runQuery(internal.seasons.collect.due, {});
    for (const item of due) {
      try {
        await write(ctx, item.profileId, item.kind, item.period);
      } catch (err) {
        console.error("Seasons: could not write", item.kind, item.period.interval, item.period.start, err instanceof Error ? err.message : err);
      }
    }
    return due.length;
  },
});

export const writeOne = internalAction({
  args: { profileId: v.id("profiles"), kind: v.union(v.literal("mine"), v.literal("ours")), period },
  handler: async (ctx, args): Promise<Id<"seasonReports">> => {
    return await write(ctx, args.profileId, args.kind, args.period);
  },
});
