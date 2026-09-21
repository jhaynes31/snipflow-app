"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { buildSystemPrompt, COACH_MODEL, MENTOR_VOICE, taskPromptFor } from "./prompt";
import { availableTools, coachToolList } from "../toolIndex";
import { crisisReply, detectCrisis, detectReassuranceLoop } from "./safety";

/**
 * The one shared coach service. Every module talks to the model through
 * here and nowhere else, so the character and the guardrails are the same
 * everywhere. The API key lives in Convex's environment, never in the
 * browser.
 */
export const send = action({
  args: {
    id: v.id("coachConversations"),
    message: v.string(),
    /** A key into TASK_PROMPTS, never raw prompt text. */
    task: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ reply: string; crisis: boolean; loop: boolean }> => {
    const message = args.message.trim();
    if (!message) throw new ConvexError("Write something first.");
    if (message.length > 4000) throw new ConvexError("That message is long (max 4000 characters). Try it in two parts.");

    const context = await ctx.runQuery(internal.coach.conversations.contextFor, { id: args.id });

    // Crisis wording stops the normal flow before any model call.
    if (detectCrisis(message).level === "crisis") {
      const reply = crisisReply(context.partnerName);
      await ctx.runMutation(internal.coach.conversations.append, { id: args.id, userMessage: message, assistantMessage: reply });
      return { reply, crisis: true, loop: false };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ConvexError("The coach isn't connected yet. Add ANTHROPIC_API_KEY to the Convex environment and try again.");
    }

    const userMessages = [...context.messages.filter((m) => m.role === "user").map((m) => m.content), message];
    const loop = detectReassuranceLoop(userMessages);
    const system = buildSystemPrompt({
      displayName: context.displayName,
      partnerName: context.partnerName,
      faith: context.faith,
      mySections: context.mySections,
      partnerSections: context.partnerSections,
      taskPrompt: taskPromptFor(args.task),
      tools: coachToolList(availableTools(context.rooms)),
      loopSuspected: loop,
      wellPath: args.task?.startsWith("well.") ? context.wellPath : null,
      mentor: args.task?.startsWith("metamorphosis.") ? { voice: MENTOR_VOICE, sheet: context.mentorSheet, shelf: context.mentorShelf } : null,
    });

    const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 90_000 });
    let reply: string;
    try {
      const response = await client.messages.create({
        model: COACH_MODEL,
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system,
        messages: [...context.messages, { role: "user", content: message }],
      });
      if (response.stop_reason === "refusal") {
        reply = "I can't go further with that one, and I don't want to leave you alone with it. If you're not safe, call or text 988. Otherwise, tell me what's underneath it and we'll take that instead.";
      } else {
        reply = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        if (!reply) reply = "I didn't manage a reply that time. Say it again, or say it a different way, and I'll try again.";
      }
    } catch (err) {
      console.error("coach.chat.send: model call failed", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      if (err instanceof Anthropic.AuthenticationError) {
        throw new ConvexError("The coach's key isn't being accepted. Check ANTHROPIC_API_KEY in Convex.");
      }
      if (err instanceof Anthropic.RateLimitError) {
        throw new ConvexError("The coach is busy right now. Give it a minute and try again. Your message is still in the box.");
      }
      if (err instanceof Anthropic.APIConnectionTimeoutError) {
        throw new ConvexError("The coach took too long to answer. Try again, or try a shorter message. Your message is still in the box.");
      }
      if (err instanceof Anthropic.APIError) {
        throw new ConvexError(`The coach couldn't answer just now (${err.status ?? "no status"}). Try again in a moment. Your message is still in the box.`);
      }
      throw new ConvexError(`The coach hit a snag: ${err instanceof Error ? err.message : String(err)}. Your message is still in the box.`);
    }

    await ctx.runMutation(internal.coach.conversations.append, { id: args.id, userMessage: message, assistantMessage: reply });
    return { reply, crisis: false, loop };
  },
});
