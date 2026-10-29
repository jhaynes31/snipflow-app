"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { action, type ActionCtx } from "../_generated/server";
import { ADMIN_SYSTEM, adminSchema } from "./adminPure";
import { MUST_HAVE_FOR_DOCUMENTS } from "./intake";
import { ANSWERS_SCHEMA, ANSWERS_SYSTEM, factsBlock, IMPORT_SYSTEM, importSchema, jobBlock, LETTER_SCHEMA, LETTER_SYSTEM, LOOKOUT_MODEL, READ_SYSTEM, readerSchema, RESUME_SCHEMA, RESUME_SYSTEM, type DraftInput } from "./prompts";
import { renderResume, scrubDashes, type ResumeDraft } from "./writing";

/**
 * The Lookout's writing and reading, through the model. The API key lives
 * in Convex's environment only. Each call asks for JSON in a fixed shape;
 * the draft then goes through the same dash scrub and fact review as a
 * hand edit (data.ts, writeDoc). Refused or unreadable answers save nothing.
 */

async function ask(system: string, user: string | Anthropic.Beta.BetaContentBlockParam[], schema: Record<string, unknown>, history: Anthropic.Beta.BetaMessageParam[] = []): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ConvexError("The writer isn't connected yet. Add ANTHROPIC_API_KEY to the Convex environment and try again.");
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 180_000 });
  const stream = client.beta.messages.stream({
    model: LOOKOUT_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema } },
    system,
    messages: [...history, { role: "user", content: user }],
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === "refusal") throw new ConvexError("The writer couldn't do this one. Nothing was changed.");
  if (response.stop_reason === "max_tokens") throw new ConvexError("The answer ran long and was cut off. Nothing was changed; try again.");
  const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new ConvexError("The writer's answer couldn't be read. Nothing was changed; try again.");
  }
}

async function inputFor(ctx: ActionCtx, jobId: Id<"loJobs">) {
  const d = await ctx.runQuery(internal.lookout.data.forDraft, { jobId });
  const missing = MUST_HAVE_FOR_DOCUMENTS.filter((k) => !d.answers.some((a) => a.key === k));
  if (missing.length) throw new ConvexError("His name and email come from the interview. Answer those first.");
  if (d.roles.length === 0) throw new ConvexError("There's no confirmed work history yet. Add his jobs on the History page first.");
  return d;
}

const list = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : []);

export const draftResume = action({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args): Promise<{ questions: string[] }> => {
    const d = await inputFor(ctx, args.jobId);
    const input: DraftInput = d;
    const raw = (await ask(RESUME_SYSTEM, `${factsBlock(input)}\n\n${jobBlock(input)}\n\nDraft the resume for this job.`, RESUME_SCHEMA)) as Record<string, unknown>;
    const ids = new Set(d.roles.map((r) => r.id));
    const draft: ResumeDraft = {
      summary: typeof raw.summary === "string" ? raw.summary : "",
      skills: list(raw.skills).slice(0, 14),
      roles: (Array.isArray(raw.roles) ? raw.roles : [])
        .map((r) => r as Record<string, unknown>)
        .filter((r) => typeof r.roleId === "string" && ids.has(r.roleId))
        .map((r) => ({ roleId: r.roleId as string, bullets: list(r.bullets).slice(0, 6) })),
      education: list(raw.education),
    };
    const answer = (k: string) => d.answers.find((a) => a.key === k)?.answer;
    const text = renderResume({ name: answer("name")!, email: answer("email"), phone: answer("phone"), location: answer("cityLine"), link: answer("link") }, draft, d.roles.map((r) => ({ ...r, confirmed: true })));
    const questions = list(raw.questions);
    await ctx.runMutation(internal.lookout.data.saveDraft, { jobId: args.jobId, kind: "resume", text, questions });
    return { questions };
  },
});

export const draftLetter = action({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args): Promise<{ questions: string[] }> => {
    const d = await inputFor(ctx, args.jobId);
    const raw = (await ask(LETTER_SYSTEM, `${factsBlock(d)}\n\n${jobBlock(d)}${d.resume ? `\n\n<his_resume_for_this_job>\n${d.resume}\n</his_resume_for_this_job>` : ""}\n\nDraft the cover letter.`, LETTER_SCHEMA)) as Record<string, unknown>;
    const letter = typeof raw.letter === "string" ? raw.letter : "";
    if (!letter.trim()) throw new ConvexError("The writer didn't return a letter. Nothing was changed.");
    const questions = list(raw.questions);
    await ctx.runMutation(internal.lookout.data.saveDraft, { jobId: args.jobId, kind: "letter", text: scrubDashes(letter), questions });
    return { questions };
  },
});

export const draftAnswers = action({
  args: { jobId: v.id("loJobs"), questions: v.string() },
  handler: async (ctx, args): Promise<{ questions: string[] }> => {
    const asked = args.questions.trim();
    if (!asked) throw new ConvexError("Paste the application's questions first.");
    if (asked.length > 12000) throw new ConvexError("That's a lot of questions. Paste them in two parts.");
    const d = await inputFor(ctx, args.jobId);
    const raw = (await ask(ANSWERS_SYSTEM, `${factsBlock(d)}\n\n${jobBlock(d)}\n\n<application_questions>\n${asked}\n</application_questions>\n\nDraft his answers.`, ANSWERS_SCHEMA)) as Record<string, unknown>;
    const pairs = (Array.isArray(raw.answers) ? raw.answers : []).map((p) => p as Record<string, unknown>).filter((p) => typeof p.question === "string" && typeof p.answer === "string");
    const text = pairs.map((p) => `${p.question}\n${p.answer}`).join("\n\n");
    const questions = list(raw.questions);
    await ctx.runMutation(internal.lookout.data.saveDraft, { jobId: args.jobId, kind: "answers", text, questions });
    return { questions };
  },
});

/** Read the listing for the facts it states. Everything read is labeled "read by the assistant" until a person verifies it. */
export const readListing = action({
  args: { jobId: v.id("loJobs") },
  handler: async (ctx, args): Promise<{ read: number }> => {
    const d = await ctx.runQuery(internal.lookout.data.forDraft, { jobId: args.jobId });
    const raw = (await ask(READ_SYSTEM, `<listing>\nTitle: ${d.job.title}\nEmployer: ${d.job.employer}\n${d.job.description.slice(0, 30000)}\n</listing>\n\nRead the facts.`, readerSchema())) as Record<string, { state?: string; value?: string; quote?: string }>;
    const facts: Record<string, { state: "yes" | "no" | "unknown"; value?: string; source: "ai"; note?: string }> = {};
    for (const [k, f] of Object.entries(raw ?? {})) {
      if (!f || (f.state !== "yes" && f.state !== "no")) continue;
      // A yes or no without the listing's own words isn't taken.
      if (!f.quote?.trim()) continue;
      facts[k] = { state: f.state, value: f.value?.trim() || undefined, source: "ai", note: f.quote.trim() };
    }
    await ctx.runMutation(internal.lookout.data.saveReadFacts, { jobId: args.jobId, facts });
    return { read: Object.keys(facts).length };
  },
});

/**
 * Read an uploaded resume into draft history and answers. A PDF goes to the
 * model as the document itself; Word and text files arrive as their text,
 * read in the browser. Nothing read here counts until its owner confirms it.
 */
export const importResume = action({
  args: { fileName: v.string(), pdf: v.optional(v.id("_storage")), text: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ rolesAdded: number; answersAdded: number; notes: string[] }> => {
    await ctx.runQuery(internal.lookout.data.whoFor, {});
    let content: Anthropic.Beta.BetaContentBlockParam[];
    if (args.pdf) {
      if (!(await ctx.runQuery(internal.lookout.data.freshUpload, { id: args.pdf }))) throw new ConvexError("Upload the resume as a PDF and try again.");
      const blob = await ctx.storage.get(args.pdf);
      // The uploaded file is only needed for this one reading.
      await ctx.storage.delete(args.pdf);
      if (!blob) throw new ConvexError("The upload didn't arrive. Try again.");
      if (blob.size > 5 * 1024 * 1024) throw new ConvexError("That PDF is too large. Try one under 5 MB.");
      const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
      content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data } }, { type: "text", text: "Read this resume." }];
    } else {
      const text = (args.text ?? "").trim();
      if (text.length < 80) throw new ConvexError("There wasn't enough text in that file to read. Try a PDF or Word version.");
      content = [{ type: "text", text: `<resume>\n${text.slice(0, 60000)}\n</resume>\n\nRead this resume.` }];
    }
    const raw = (await ask(IMPORT_SYSTEM, content, importSchema())) as { roles?: unknown[]; answers?: Record<string, unknown>; notes?: unknown };
    const str = (x: unknown) => (typeof x === "string" ? x : "");
    const roles = (Array.isArray(raw.roles) ? raw.roles : []).map((r) => r as Record<string, unknown>).map((r) => ({
      employer: str(r.employer),
      title: str(r.title),
      start: str(r.start),
      end: str(r.end),
      location: str(r.location),
      channels: list(r.channels),
      duties: list(r.duties),
      achievements: list(r.achievements),
      tools: list(r.tools),
      sales: r.sales === true,
    }));
    const answers = Object.entries(raw.answers ?? {}).map(([key, answer]) => ({ key, answer: str(answer) })).filter((x) => x.answer.trim());
    return await ctx.runMutation(internal.lookout.data.saveImport, { fileName: args.fileName, roles, answers, notes: list(raw.notes) });
  },
});

/**
 * The assistant: a plain instruction in, a short reply out, and the changes
 * it describes made straight away (each one undoable). See admin.ts.
 */
export const askAssistant = action({
  args: { message: v.string() },
  handler: async (ctx, args): Promise<{ reply: string; applied: number }> => {
    const message = args.message.trim();
    if (!message) throw new ConvexError("Write something first.");
    if (message.length > 8000) throw new ConvexError("That's very long. Try it in two parts.");
    const c = await ctx.runQuery(internal.lookout.admin.forAssistant, {});
    // Earlier turns, oldest first, starting with one of the person's messages.
    const turns = c.history.slice(c.history.findIndex((m) => m.role === "user"));
    const history: Anthropic.Beta.BetaMessageParam[] = [];
    for (const m of turns) {
      if (history.length && history[history.length - 1].role === m.role) continue;
      history.push({ role: m.role, content: m.text });
    }
    if (history.length && history[history.length - 1].role === "user") history.pop();
    const raw = (await ask(ADMIN_SYSTEM, `<current_state>\n${c.block}\n</current_state>\n\n<message>\n${message}\n</message>`, adminSchema(), history)) as { reply?: unknown; changes?: unknown };
    const reply = typeof raw.reply === "string" ? raw.reply : "";
    const changes = Array.isArray(raw.changes) ? raw.changes : [];
    return await ctx.runMutation(internal.lookout.admin.record, { message, reply, changes });
  },
});
