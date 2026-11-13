"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { BASE_CHARACTER, COACH_MODEL, FATHER_VOICE, MENTOR_VOICE, MOTHER_VOICE } from "../coach/prompt";

/**
 * "Hear from Coach / Mom / Dad / the mentor": one short encouragement in
 * that voice after a slip, for the loop by name and the stage they caught
 * it at. Nothing private is sent; nothing is stored.
 */
export const line = action({
  args: { loopId: v.id("lpLoops"), voice: v.union(v.literal("coach"), v.literal("mom"), v.literal("dad"), v.literal("mentor")), caughtAt: v.optional(v.string()) },
  handler: async (ctx, args): Promise<string> => {
    const info = await ctx.runQuery(internal.loops.entries.forEncouragement, { loopId: args.loopId });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new ConvexError("The coach isn't connected yet.");
    const voice = args.voice === "mom" ? MOTHER_VOICE : args.voice === "dad" ? FATHER_VOICE : args.voice === "mentor" ? `${BASE_CHARACTER}\n\n${MENTOR_VOICE}` : BASE_CHARACTER;
    const system = `${voice}\n\nYou are speaking to ${info.displayName}, who just went around a loop they are working to break, called "${info.name}"${args.caughtAt ? `, and caught it at the stage called "${args.caughtAt}"` : ""}. Write two or three sentences, in your voice, that name responsibility and grace together: not fluffy, not a lecture, never shame. Plain text, no emoji, no questions. The point is: falling back in is part of how loops break; start from here, not over.`;
    const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
    const res = await client.messages.create({ model: COACH_MODEL, max_tokens: 200, thinking: { type: "adaptive" }, output_config: { effort: "low" }, system, messages: [{ role: "user", content: "(Say it.)" }] });
    const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join(" ").trim();
    return text || "You noticed. That's the work working. Start from here.";
  },
});
