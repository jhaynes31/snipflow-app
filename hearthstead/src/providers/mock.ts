import type { ModelProvider, ModelRequest, ModelResponse } from "./types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Rough token estimate so budgets and dashboards have realistic numbers.
const estimateTokens = (s: string) => Math.ceil(s.length / 4);

function lastUserText(req: ModelRequest) {
  const msg = [...req.messages].reverse().find((m) => m.role === "user");
  return msg?.content.map((b) => (b.type === "text" ? b.text : "")).join("\n") ?? "";
}

function plan(): string {
  return JSON.stringify({
    tasks: [
      {
        key: "draft",
        title: "Write the first draft",
        brief: "Write a first draft that meets the goal. Use the Brand Kit voice. No invented claims.",
        role: "copywriter",
        dependsOn: [],
        requiresApproval: false,
      },
      {
        key: "edit",
        title: "Edit and polish the draft",
        brief: "Proofread and tighten the draft. Keep the writer's voice. List your changes.",
        role: "editor",
        dependsOn: ["draft"],
        requiresApproval: true,
      },
    ],
  });
}

function draft(title: string, prompt: string) {
  const goal = /Goal: (.*)/.exec(prompt)?.[1] ?? title;
  return [
    `# ${goal}`,
    "",
    "**Headline:** The easiest part of your week starts here.",
    "",
    "Short, friendly opening line that speaks to exactly who this is for.",
    "One clear benefit, stated plainly. One reason to believe it, taken only from the Brand Kit.",
    "",
    "**Call to action:** Book your spot today.",
    "",
    "_(Demo mode: this is canned Mock Provider output, not a real model response.)_",
  ].join("\n");
}

function edit(prompt: string) {
  const source = /--- BEGIN DRAFT ---\n([\s\S]*?)\n--- END DRAFT ---/.exec(prompt)?.[1] ?? "(no draft found)";
  const polished = source.replace("Short, friendly opening line", "A short, friendly opening line");
  return `${polished}\n\n## Changes\n- Tightened the opening line.\n- Checked every claim against the Brand Kit: none unsupported.`;
}

/** Canned outputs with realistic delays: development, tests, and Demo mode. Costs nothing. */
export class MockProvider implements ModelProvider {
  name = "mock";
  constructor(private delayScale = 1) {}

  async complete(req: ModelRequest): Promise<ModelResponse> {
    const prompt = lastUserText(req);
    let text: string;
    if (req.hint.taskKind === "plan") text = plan();
    else if (req.hint.role === "editor") text = edit(prompt);
    else text = draft(req.hint.title, prompt);

    await sleep((1500 + Math.random() * 2500) * this.delayScale);
    return {
      provider: this.name,
      model: `mock-${req.tier}`,
      text,
      toolCalls: [],
      usage: {
        inputTokens: estimateTokens(req.system) + estimateTokens(prompt),
        outputTokens: estimateTokens(text),
      },
    };
  }
}
