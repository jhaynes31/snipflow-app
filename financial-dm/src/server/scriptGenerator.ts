import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAdmin } from "~/server/auth";
import {
  CAPTION_OPTIONS_RULES,
  CTA_OPTIONS_RULES,
  FORMATTING_RULES,
  HASHTAG_RULES,
  VARIETY_RULES,
  buildVoiceBlock,
  callClaude,
  cleanText,
  normalizeCaptions,
  normalizeHashtags,
  normalizeTone,
  parseJsonReply,
} from "./contentVoice";
import { topicPromptLines } from "./topics";
import { campaignPromptBlock } from "~/server/campaign";
import { ensureCtaLine, ensureSpokenEnding, type CampaignContext } from "~/lib/campaign";

import { composeScript, normalizeHookType } from "~/lib/scriptUtils";

// Topic rolling now lives in ./topics (one pool for every generator). These
// re exports keep older imports working.
export { EXTRA_TOPICS, getRandomTopics, type TopicPick } from "./topics";

// ── Types ──────────────────────────────────────────────────────────

export interface ScriptInput {
  topic: string;
  fact: string;
  /** The viewer situation this video speaks to (see topics.ts). */
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  hookType: string;
  targetViewer: string;
  payoff: string;
  /** Optional campaign brief context (Quest Board). Without it nothing changes. */
  campaign?: CampaignContext;
}

export interface HookOption {
  text: string;
  /** Canonical mechanism: curiosity_gap, direct_callout, contrarian, number_specific. */
  hookType: string;
}

export interface ScriptResult {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  /** Mechanism of the currently selected hook. */
  hookType: string;
  targetViewer: string;
  payoff: string;
  title: string;
  /** The currently selected hook (defaults to hooks[0]). */
  hook: string;
  /** 2 to 3 hook options, each a different mechanism. */
  hooks: HookOption[];
  /** The script minus its opening hook line. The full script is hook + scriptBody. */
  scriptBody: string;
  /** Full script: the selected hook followed by scriptBody. */
  script: string;
  /** The chosen call to action, or "" when John leaves it out. */
  callToAction: string;
  /** 2 to 3 call to action options with different asks. */
  callToActions: string[];
  /** The currently selected caption (defaults to captions[0]). */
  caption: string;
  /** 2 to 3 caption options. */
  captions: string[];
  hashtags: string[];
}

export interface SavedScript {
  id: number;
  title: string;
  hook: string;
  script: string;
  callToAction: string;
  caption: string;
  hashtags: string[];
  topic: string;
  tone: string;
  dndThemed: boolean;
  fact: string;
  painPoint: string;
  kind: "script";
  hookType: string;
  targetViewer: string;
  payoff: string;
  createdAt: string;
}

// Hook mechanism helpers and composeScript are client safe and live in
// ~/lib/scriptUtils; re exported here for older imports.
export {
  HOOK_TYPE_LABELS,
  HOOK_TYPE_VALUES,
  composeScript,
  normalizeHookType,
} from "~/lib/scriptUtils";

// ── Prompt pieces ──────────────────────────────────────────────────

/**
 * The hook rule and its self check. This block is deliberately kept intact:
 * it enforces one mechanism per hook, first line, under 12 words, banned
 * openers, and an explicit self check. If hooks feel weak, look at how the
 * topic, pain point, target viewer, and payoff reach the prompt, not here.
 */
const HOOK_RULE_BLOCK = `HOOK GENERATION RULE (strict, applies to every hook you produce):
- The user picks a hook_type from: curiosity_gap, direct_callout, contrarian, number_specific, or mix. When it is mix, YOU choose the single best mechanism for this hook and report which one you used in the "used_hook_type" field.
- The hook must be the FIRST LINE of the spoken script and UNDER 12 WORDS. It must, in its first 1 to 2 seconds of reading, either create a curiosity gap, name the exact viewer situation, make a contrarian claim, or lead with a concrete number or timeframe.
- Match the declared hook_type exactly:
  * curiosity_gap: state a surprising fact or a striking result WITHOUT yet giving the reason. The viewer must be left wanting the why. Withhold the explanation.
  * direct_callout: open with "If you" or "If your" and name the EXACT target viewer situation, then imply the consequence they have not considered. No generic openers.
  * contrarian: state the counter intuitive claim as plain fact, directly and confidently. No "actually", no "surprisingly", no hedging words.
  * number_specific: lead with a concrete number, dollar amount, or timeframe within the FIRST 5 WORDS of the hook.
- BANNED generic openers, never use these and regenerate if you produce one: "Let's talk about", "Here's what you need to know", "Did you know", "In this video".
- The hook must be answerable as "What does this make the viewer want to know?" If there is no clear gap or named situation or surprising claim, the hook failed, so regenerate it.
- target_viewer names exactly who this hook is for. Aim the hook at that person and, for direct_callout, name their exact situation.
- payoff is INTERNAL ONLY. It names what the video actually delivers. The hook must promise that area and nothing the script will not deliver, so the viewer is not tricked. NEVER write the payoff itself into the hook, and never reveal payoff as a label, heading, or internal note in the output.

SELF CHECK (do this before finalizing the hook and regenerate until all are yes):
  (a) Does this hook match its declared hook_type?
  (b) Does it avoid every banned generic opener?
  (c) Would a viewer with no context want to know what happens next?
  If any answer is no, write a new hook and recheck.`;

/**
 * Three hook options per package. The first uses the chosen hook_type (or the
 * best fit when it is "mix"); the other two use DIFFERENT mechanisms so John
 * can compare approaches side by side. Same rule, same self check for each.
 */
const HOOK_OPTIONS_BLOCK = `HOOK OPTIONS (required): Produce THREE hook options in a "hooks" array, each an object with "hook" and "hookType" (one of curiosity_gap, direct_callout, contrarian, number_specific).
- hooks[0] uses the user's chosen hook_type. When the chosen hook_type is mix, choose the best fit and report it in hookType.
- hooks[1] and hooks[2] each use a DIFFERENT mechanism from hooks[0] and from each other, so the three hooks together cover three distinct mechanisms.
- Every one of the three must independently pass the HOOK GENERATION RULE and the SELF CHECK above, aim at the same target viewer, and work as the first spoken line of the same script.
- Write the script so that it opens with hooks[0] verbatim. Any of the three hooks must be able to replace that first line without changing the rest of the script.`;

const SCRIPT_REQUIREMENTS = `REQUIREMENTS:
- TITLE: a short, catchy title for the post (a few words).
- SCRIPT: the full roughly 150 to 180 word script, about one minute read aloud, spoken by the bartender directly to the viewer. OPEN with hooks[0] verbatim as the first spoken line. Speak to the pain point early so the viewer feels seen, teach the key point clearly using the supporting fact, and keep it engaging and honest. Also return "scriptBody": the exact same script with that first hook line removed, so any hook option can be placed in front of it.
- The script must NOT contain the call to action; that is chosen separately from the options below and John may leave it out, so the script has to land on its own.
- All pieces must read as ONE cohesive posting set for the same video: same voice, same tone, same single topic, fact, and pain point.`;

function buildScriptSystemPrompt(tone: string, dndThemed: boolean): string {
  return `You are writing a complete posting package for John, a licensed life insurance agent and the creator of the brand "The Financial DM". John records short, roughly one minute long videos about financial literacy and life planning. Everything you write is spoken or posted by the character described below.

${buildVoiceBlock({ tone, dndThemed, medium: "script" })}

Write a complete, cohesive posting package for the given topic, using the supporting fact as the talking point and the pain point as the viewer's situation to speak to. The package includes the video script plus three hook options, the call to action, caption options, and hashtags, all derived from the same topic, fact, pain point, and tone so they read as one coherent set for the same video.

${SCRIPT_REQUIREMENTS}

${HOOK_RULE_BLOCK}

${HOOK_OPTIONS_BLOCK}

${CTA_OPTIONS_RULES}

${CAPTION_OPTIONS_RULES}
Captions must not restate any of the three hooks' wording.

${HASHTAG_RULES}

${VARIETY_RULES} Keep each package distinct in structure and wording.

${FORMATTING_RULES}

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "title": "Catchy title here", "hooks": [ { "hook": "First hook, under 12 words, using the chosen hook_type", "hookType": "mechanism used" }, { "hook": "Second hook, a different mechanism", "hookType": "mechanism used" }, { "hook": "Third hook, a third mechanism", "hookType": "mechanism used" } ], "script": "The full 150 to 180 word script here, opening with hooks[0] as the first line", "scriptBody": "The same script with the opening hook line removed", "callToActions": ["Call to action option one", "Call to action option two", "Call to action option three"], "captions": ["Caption option one", "Caption option two", "Caption option three"], "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"] }`;
}

function buildHooksOnlySystemPrompt(tone: string, dndThemed: boolean): string {
  return `You are writing replacement hooks for an existing one minute video script by John, a licensed life insurance agent and the creator of the brand "The Financial DM". The script, call to action, caption, and hashtags are FIXED and must not be rewritten. Your only job is three new opening hooks that could each replace the first spoken line of that script.

${buildVoiceBlock({ tone, dndThemed, medium: "script" })}

${HOOK_RULE_BLOCK}

${HOOK_OPTIONS_BLOCK.replace(
    "- Write the script so that it opens with hooks[0] verbatim. Any of the three hooks must be able to replace that first line without changing the rest of the script.",
    "- Each hook must flow naturally into the fixed script body that follows it. Do not repeat the hooks the user says they already have; find new angles.",
  )}

${FORMATTING_RULES}

Respond with valid JSON only, with no other text and no markdown fences. Use exactly this shape:
{ "hooks": [ { "hook": "...", "hookType": "mechanism used" }, { "hook": "...", "hookType": "mechanism used" }, { "hook": "...", "hookType": "mechanism used" } ] }`;
}

function scriptUserContent(data: {
  topic: string;
  fact: string;
  painPoint: string;
  hookType: string;
  targetViewer: string;
  payoff: string;
}): string {
  return `${topicPromptLines(data)}

Hook type: ${normalizeHookType(data.hookType) || "mix"}
Target viewer: ${(data.targetViewer || "").trim() || "no target written, infer the most likely viewer from the pain point"}
What this video delivers (payoff, internal only, do not reveal in the hook): ${data.payoff}`;
}

// ── Parsing helpers ────────────────────────────────────────────────

function parseHooks(
  raw: unknown,
  requestedType: string,
  fallbackHook?: unknown,
  fallbackType?: unknown,
): HookOption[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: HookOption[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const obj = (item ?? {}) as { hook?: unknown; text?: unknown; hookType?: unknown };
    const text = cleanText(obj.hook ?? obj.text);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ text, hookType: normalizeHookType(obj.hookType) });
    if (out.length === 3) break;
  }
  if (out.length === 0) {
    const text = cleanText(fallbackHook);
    if (text) out.push({ text, hookType: normalizeHookType(fallbackType) });
  }
  // The first option should carry the requested mechanism when the model
  // omitted it (and the request was not "mix").
  const req = normalizeHookType(requestedType);
  if (out[0] && !out[0].hookType && req && req !== "mix") out[0].hookType = req;
  return out;
}

/** Remove the hook line from the front of a script when it starts with it. */
export function stripLeadingHook(script: string, hook: string): string {
  const s = cleanText(script);
  const h = cleanText(hook);
  if (!s || !h) return s;
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const ns = norm(s);
  const nh = norm(h);
  if (!nh || !ns.startsWith(nh)) return s;
  // Walk the original string until we have consumed the hook's word count.
  const words = nh.split(" ").length;
  let count = 0;
  let idx = 0;
  const re = /[a-z0-9]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    count += 1;
    if (count === words) {
      idx = m.index + m[0].length;
      break;
    }
  }
  return s.slice(idx).replace(/^[\s.,;:!?'"”’)]+/, "").trim();
}

// ── Server Functions ───────────────────────────────────────────────

export const generateScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: ScriptInput) => d)
  .handler(async ({ data }): Promise<ScriptResult | null> => {
    const tone = normalizeTone(data.tone);
    const dndThemed = Boolean(data.dndThemed);
    // The payoff is internal only: if John did not type one, fall back to the
    // supporting fact so the model still knows what the video delivers.
    const payoff = (data.payoff || "").trim() || data.fact;
    const painPoint = cleanText(data.painPoint);

    const text = await callClaude({
      tag: "scriptGenerator",
      system: buildScriptSystemPrompt(tone, dndThemed),
      user: [scriptUserContent({ ...data, painPoint, payoff }), campaignPromptBlock(data.campaign, "script")].filter(Boolean).join("\n\n"),
      maxTokens: 1800,
    });
    const parsed = parseJsonReply<{
      title?: unknown;
      hooks?: unknown;
      hook?: unknown;
      used_hook_type?: unknown;
      script?: unknown;
      scriptBody?: unknown;
      callToActions?: unknown;
      callToAction?: unknown;
      captions?: unknown;
      caption?: unknown;
      hashtags?: unknown;
    }>(text, "scriptGenerator");
    if (!parsed) return null;
    const callToActions = normalizeCaptions(parsed.callToActions, parsed.callToAction).map((c) => ensureCtaLine(c, data.campaign));

    const hooks = parseHooks(parsed.hooks, data.hookType, parsed.hook, parsed.used_hook_type);
    const hook = hooks[0]?.text ?? "";
    const rawScript = cleanText(parsed.script);
    // With a campaign brief the spoken script always ends with the tease (middle parts) and the CTA line.
    const scriptBody = ensureSpokenEnding(cleanText(parsed.scriptBody) || stripLeadingHook(rawScript, hook), data.campaign);
    const captions = normalizeCaptions(parsed.captions, parsed.caption).map((c) => ensureCtaLine(c, data.campaign));

    return {
      topic: data.topic,
      fact: data.fact,
      painPoint,
      tone,
      dndThemed,
      hookType: hooks[0]?.hookType || normalizeHookType(data.hookType) || "mix",
      targetViewer: data.targetViewer,
      payoff,
      title: cleanText(parsed.title),
      hook,
      hooks,
      scriptBody,
      script: composeScript(hook, scriptBody),
      callToAction: callToActions[0] ?? "",
      callToActions,
      caption: captions[0] ?? "",
      captions,
      hashtags: normalizeHashtags(parsed.hashtags),
    };
  });

export interface RegenerateHooksInput {
  topic: string;
  fact: string;
  painPoint: string;
  tone: string;
  dndThemed: boolean;
  hookType: string;
  targetViewer: string;
  payoff: string;
  title: string;
  scriptBody: string;
  /** Hooks John already has, so the new set finds different angles. */
  previousHooks: string[];
}

/**
 * Re roll ONLY the hooks. The script, call to action, caption, and hashtags
 * are left exactly as they are; the client swaps the returned options in.
 */
export const regenerateHooks = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: RegenerateHooksInput) => d)
  .handler(async ({ data }): Promise<HookOption[] | null> => {
    const tone = normalizeTone(data.tone);
    const payoff = (data.payoff || "").trim() || data.fact;
    const previous = (data.previousHooks || []).map(cleanText).filter(Boolean);
    const user = `${scriptUserContent({ ...data, payoff })}

Title of the video: ${cleanText(data.title) || "untitled"}

FIXED SCRIPT BODY (each new hook must be able to lead straight into this):
${cleanText(data.scriptBody)}

Hooks the user already has (do not repeat these or lightly reword them):
${previous.length ? previous.map((h) => `- ${h}`).join("\n") : "- none yet"}`;

    const text = await callClaude({
      tag: "scriptGenerator.hooks",
      system: buildHooksOnlySystemPrompt(tone, Boolean(data.dndThemed)),
      user,
      maxTokens: 600,
    });
    const parsed = parseJsonReply<{ hooks?: unknown }>(text, "scriptGenerator.hooks");
    if (!parsed) return null;
    const hooks = parseHooks(parsed.hooks, data.hookType);
    return hooks.length ? hooks : null;
  });

// ── Re roll one section ─────────────────────────────────────────────

export type ScriptPart = "title" | "script" | "callToAction" | "captions" | "hashtags";
export const SCRIPT_PARTS: ScriptPart[] = ["title", "script", "callToAction", "captions", "hashtags"];

export interface RegenerateSectionInput {
  part: ScriptPart;
  /** The package as it stands on screen. Everything but `part` is held fixed. */
  result: ScriptResult;
  campaign?: CampaignContext;
}

const PART_LABEL: Record<ScriptPart, string> = { title: "title", script: "script", callToAction: "call to action options", captions: "caption options", hashtags: "hashtags" };

function partRequirement(part: ScriptPart): string {
  switch (part) {
    case "title":
      return `- TITLE: a short, catchy title for the post (a few words). It must be clearly different from the current title, not a light rewording.
Respond with valid JSON only, with no other text and no markdown fences: { "title": "..." }`;
    case "script":
      return `- SCRIPT: a fresh full roughly 150 to 180 word script, about one minute read aloud, spoken by the bartender directly to the viewer. OPEN with the FIXED HOOK verbatim as the first spoken line. Speak to the pain point early so the viewer feels seen, teach the key point clearly using the supporting fact, and keep it engaging and honest. Take a different structure or angle from the current script, not a paraphrase of it. Also return "scriptBody": the exact same script with that first hook line removed.
- The call to action, captions, and hashtags are fixed and must still fit; do not restate the call to action inside the script.
Respond with valid JSON only, with no other text and no markdown fences: { "script": "full script opening with the fixed hook", "scriptBody": "the same script without the hook line" }`;
    case "callToAction":
      return `${CTA_OPTIONS_RULES}
Each new option must be worded differently from the current options, not a light rewording.
Respond with valid JSON only, with no other text and no markdown fences: { "callToActions": ["Call to action option one", "Call to action option two", "Call to action option three"] }`;
    case "captions":
      return `${CAPTION_OPTIONS_RULES}
Captions must not restate the hook's wording, and must not repeat or lightly reword the current captions.
Respond with valid JSON only, with no other text and no markdown fences: { "captions": ["Caption option one", "Caption option two", "Caption option three"] }`;
    case "hashtags":
      return `${HASHTAG_RULES}
Choose a noticeably different set from the current hashtags while staying on the same topic.
Respond with valid JSON only, with no other text and no markdown fences: { "hashtags": ["#HashtagOne", "#HashtagTwo", "#HashtagThree"] }`;
  }
}

function buildSectionSystemPrompt(part: ScriptPart, tone: string, dndThemed: boolean): string {
  return `SCRIPT FORGE · section: ${part}
You are rewriting ONE part of an existing posting package for John, a licensed life insurance agent and the creator of the brand "The Financial DM". John records short, roughly one minute long videos about financial literacy and life planning. Every other part of the package is FIXED and shown to you so the new ${PART_LABEL[part]} still reads as one cohesive set with the same voice, tone, topic, fact, and pain point. Do not rewrite anything except the ${PART_LABEL[part]}.

${buildVoiceBlock({ tone, dndThemed, medium: "script" })}

${partRequirement(part)}

${FORMATTING_RULES}`;
}

/**
 * Re roll ONE section: the title, the script, the call to action, the caption
 * options, or the hashtags. Everything else is sent as fixed context and comes
 * back untouched; the client merges the returned fields in.
 */
export const regenerateSection = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: RegenerateSectionInput) => ({ ...d, part: (SCRIPT_PARTS.includes(d?.part) ? d.part : "script") as ScriptPart }))
  .handler(async ({ data }): Promise<Partial<ScriptResult> | null> => {
    const r = data.result;
    const tone = normalizeTone(r.tone);
    const dndThemed = Boolean(r.dndThemed);
    const payoff = (r.payoff || "").trim() || r.fact;
    const current: Record<ScriptPart, string> = {
      title: cleanText(r.title) || "untitled",
      script: cleanText(r.script),
      callToAction: (r.callToActions?.length ? r.callToActions : [r.callToAction]).map(cleanText).filter(Boolean).map((c) => `- ${c}`).join("\n") || "- none",
      captions: (r.captions || []).map(cleanText).filter(Boolean).map((c) => `- ${c}`).join("\n") || "- none",
      hashtags: (r.hashtags || []).join(" ") || "none",
    };
    const fixed = (Object.keys(current) as ScriptPart[])
      .filter((k) => k !== data.part)
      .map((k) => `${PART_LABEL[k].toUpperCase()} (fixed):\n${current[k]}`)
      .join("\n\n");
    const user = [
      scriptUserContent({ ...r, payoff }),
      `FIXED HOOK (the script's first spoken line):\n${cleanText(r.hook)}`,
      fixed,
      `CURRENT ${PART_LABEL[data.part].toUpperCase()} (replace this with something different):\n${current[data.part]}`,
      campaignPromptBlock(data.campaign, "script"),
    ].filter(Boolean).join("\n\n");

    const text = await callClaude({
      tag: `scriptGenerator.${data.part}`,
      system: buildSectionSystemPrompt(data.part, tone, dndThemed),
      user,
      maxTokens: data.part === "script" ? 1200 : 500,
    });
    const parsed = parseJsonReply<{ title?: unknown; script?: unknown; scriptBody?: unknown; callToActions?: unknown; callToAction?: unknown; captions?: unknown; caption?: unknown; hashtags?: unknown }>(text, `scriptGenerator.${data.part}`);
    if (!parsed) return null;

    switch (data.part) {
      case "title": {
        const title = cleanText(parsed.title);
        return title ? { title } : null;
      }
      case "script": {
        const hook = cleanText(r.hook);
        const rawScript = cleanText(parsed.script);
        const scriptBody = ensureSpokenEnding(cleanText(parsed.scriptBody) || stripLeadingHook(rawScript, hook), data.campaign);
        return scriptBody ? { scriptBody, script: composeScript(hook, scriptBody) } : null;
      }
      case "callToAction": {
        const callToActions = normalizeCaptions(parsed.callToActions, parsed.callToAction).map((c) => ensureCtaLine(c, data.campaign));
        return callToActions.length ? { callToActions, callToAction: callToActions[0] } : null;
      }
      case "captions": {
        const captions = normalizeCaptions(parsed.captions, parsed.caption).map((c) => ensureCtaLine(c, data.campaign));
        return captions.length ? { captions, caption: captions[0] } : null;
      }
      case "hashtags": {
        const hashtags = normalizeHashtags(parsed.hashtags);
        return hashtags.length ? { hashtags } : null;
      }
    }
  });

// ── Saved Script Library (database) ────────────────────────────────

async function ensureScriptsTable(): Promise<void> {
  await sql()`
    CREATE TABLE IF NOT EXISTS saved_scripts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      script TEXT NOT NULL,
      call_to_action TEXT NOT NULL,
      hashtags TEXT,
      topic TEXT,
      tone TEXT,
      dnd_themed BOOLEAN DEFAULT FALSE,
      fact TEXT,
      kind TEXT NOT NULL DEFAULT 'script',
      hook TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  // Add the columns on pre existing tables (idempotent).
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'script'`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS hook TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS caption TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS hook_type TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS target_viewer TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS payoff TEXT`;
  await sql()`ALTER TABLE saved_scripts ADD COLUMN IF NOT EXISTS pain_point TEXT`;
}

/** Create the saved_scripts table if it does not exist. Idempotent. */
export const initScriptsTable = createServerFn()
  .middleware([requireAdmin])
  .handler(async () => {
    await ensureScriptsTable();
    return { ok: true };
  });

/** Persist a generated posting package (the selected hook and caption). */
export const saveScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: ScriptResult) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; id?: number; error?: string }> => {
    try {
      await ensureScriptsTable();
      const result = await sql()`
        INSERT INTO saved_scripts (title, hook, script, call_to_action, caption, hashtags, topic, tone, dnd_themed, fact, kind, hook_type, target_viewer, payoff, pain_point)
        VALUES (${data.title}, ${data.hook}, ${data.script}, ${data.callToAction}, ${data.caption}, ${(data.hashtags || []).join(" ")}, ${data.topic}, ${data.tone}, ${data.dndThemed}, ${data.fact}, 'script', ${data.hookType}, ${data.targetViewer}, ${data.payoff}, ${data.painPoint || ""})
        RETURNING id
      `;
      return { ok: true, id: Number(result[0]?.id) };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

/** List saved scripts, newest first. */
export const getSavedScripts = createServerFn()
  .middleware([requireAdmin])
  .handler(async (): Promise<SavedScript[]> => {
    await ensureScriptsTable();
    const rows = await sql()`
      SELECT * FROM saved_scripts ORDER BY created_at DESC
    `;
    return rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      title: String(r.title ?? ""),
      hook: String(r.hook ?? ""),
      script: String(r.script ?? ""),
      callToAction: String(r.call_to_action ?? ""),
      caption: String(r.caption ?? ""),
      hashtags: (String(r.hashtags ?? "") || "").split(/\s+/).filter(Boolean),
      topic: String(r.topic ?? ""),
      tone: String(r.tone ?? ""),
      dndThemed: Boolean(r.dnd_themed),
      fact: String(r.fact ?? ""),
      painPoint: String(r.pain_point ?? ""),
      kind: "script" as const,
      hookType: String(r.hook_type ?? ""),
      targetViewer: String(r.target_viewer ?? ""),
      payoff: String(r.payoff ?? ""),
      createdAt: String(r.created_at),
    }));
  });

/** Delete a saved script by id. */
export const deleteScript = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      await sql()`DELETE FROM saved_scripts WHERE id = ${data.id}`;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
