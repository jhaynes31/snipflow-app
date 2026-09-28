export type ModelTier = "fast" | "smart";

export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface ModelRequest {
  tier: ModelTier;
  system: string;
  messages: Message[];
  tools: ToolSpec[];
  maxTokens: number;
  /** Lets the Mock Provider pick a believable canned answer. Real providers ignore it. */
  hint: { role: string; taskKind: "plan" | "work"; title: string };
}

export interface ModelResponse {
  provider: string;
  model: string;
  text: string;
  toolCalls: ToolCall[];
  usage: { inputTokens: number; outputTokens: number };
}

/** Every model call in Hearthstead goes through this interface. */
export interface ModelProvider {
  name: string;
  complete(req: ModelRequest): Promise<ModelResponse>;
}
