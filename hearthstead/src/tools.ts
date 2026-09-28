import type { ToolCall, ToolSpec } from "./providers/types";

/**
 * Tool registry. Phase 1 ships the plumbing only; Phase 2 adds web search,
 * files, render_svg, and the rest, each with a permission flag and an
 * autonomy action type.
 */
interface ToolDef {
  spec: ToolSpec;
  icon: string;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

export interface ToolContext {
  taskId: string;
  projectId: string;
  agentTools: string[];
}

const registry: Record<string, ToolDef> = {};

export function toolsFor(keys: string[]): ToolSpec[] {
  return keys.flatMap((k) => (registry[k] ? [registry[k].spec] : []));
}

export function toolIcon(name: string) {
  return registry[name]?.icon ?? "🔧";
}

export async function runTool(call: ToolCall, ctx: ToolContext): Promise<{ content: string; isError: boolean }> {
  const def = registry[call.name];
  // An agent may only use tools on its own list, whatever the model asks for.
  if (!def || !ctx.agentTools.includes(call.name))
    return { content: `Tool "${call.name}" is not available to you.`, isError: true };
  try {
    return { content: await def.run(call.input, ctx), isError: false };
  } catch (e) {
    return { content: `Tool error: ${(e as Error).message}`, isError: true };
  }
}
