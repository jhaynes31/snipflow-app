/**
 * Multi-turn calls to Anthropic's Messages API for the Sparring Dummy. A
 * sibling of callClaude in contentVoice.ts, kept separate so the single-shot
 * generators are untouched. The whole transcript goes with every request
 * and the fixed system block is cached, so a long practice session stays
 * consistent and cheap. Returns null on any failure; callers show a plain
 * message and never throw into the UI.
 */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callClaudeChat(opts: { system: string; messages: ChatMessage[]; maxTokens: number; model: string; tag: string }): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(`[${opts.tag}] ANTHROPIC_API_KEY not set`);
    return null;
  }
  // The API needs alternating roles starting with user; merge any accidental doubles.
  const messages: ChatMessage[] = [];
  for (const m of opts.messages) {
    const last = messages[messages.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`;
    else messages.push({ ...m });
  }
  if (!messages.length || messages[0].role !== "user") messages.unshift({ role: "user", content: "[Continue.]" });
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
        messages,
      }),
    });
    if (!response.ok) {
      console.error(`[${opts.tag}] Anthropic API error: ${response.status} ${response.statusText}: ${await response.text()}`);
      return null;
    }
    const json = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    return json.content?.find((c) => typeof c.text === "string")?.text ?? "";
  } catch (e) {
    console.error(`[${opts.tag}] request failed:`, String(e));
    return null;
  }
}

/** Parse a JSON object out of a model reply, tolerating fences and stray text. */
export function parseJsonObject<T>(text: string | null): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
