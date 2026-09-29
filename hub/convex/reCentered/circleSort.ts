"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { BASE_CHARACTER, COACH_MODEL, GUARDRAILS } from "../coach/prompt";
import { CIRCLE_SORT_PROMPT, circleText, hasAnything, parseSort, type CircleSort } from "./circlePure";

/**
 * "Sort it with the coach": one model call over one circle entry. The
 * coach's character and hard rules apply as everywhere else; the sort is
 * saved on the row so it's there next time without asking again.
 */
export const sort = action({
  args: { id: v.id("rcCircle") },
  handler: async (ctx, args): Promise<CircleSort> => {
    const entry = await ctx.runQuery(internal.reCentered.circle.forSort, { id: args.id });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ConvexError("The coach isn't connected yet. Add ANTHROPIC_API_KEY to the Convex environment and try again.");

    const system = [BASE_CHARACTER, GUARDRAILS, `You are talking with ${entry.displayName}.${entry.partnerName ? ` Their spouse is ${entry.partnerName}.` : ""}`, CIRCLE_SORT_PROMPT].join("\n\n");
    const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
    let text: string;
    try {
      const response = await client.messages.create({
        model: COACH_MODEL,
        max_tokens: 1500,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system,
        messages: [{ role: "user", content: circleText({ name: entry.name, text: entry.text, green: entry.green, red: entry.red }) }],
      });
      if (response.stop_reason === "refusal") throw new ConvexError("The coach couldn't sort this one. If anything in it is about being unsafe, open Need help now.");
      text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
    } catch (err) {
      if (err instanceof ConvexError) throw err;
      if (err instanceof Anthropic.AuthenticationError) throw new ConvexError("The coach's key isn't working. Check ANTHROPIC_API_KEY in the Convex environment.");
      if (err instanceof Anthropic.RateLimitError) throw new ConvexError("The coach is busy right now. Try again in a minute.");
      throw new ConvexError("The coach couldn't answer just now. Try again in a moment.");
    }
    const parsed = parseSort(text);
    if (!hasAnything(parsed)) throw new ConvexError("The coach's answer didn't come back in a shape this page can read. Try once more.");
    await ctx.runMutation(internal.reCentered.circle.setSort, { id: args.id, sort: parsed });
    return parsed;
  },
});
