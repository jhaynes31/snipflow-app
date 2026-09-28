import { assertCanSpend, costUsd } from "./budget";
import { db } from "./db";
import { emit } from "./events";
import type { Prisma } from "./generated/prisma/client";
import { getProvider } from "./providers";
import type { ContentBlock, Message, ModelResponse, ToolCall } from "./providers/types";
import { storage } from "./storage";
import { HARD_RULES } from "./templates";
import { toolIcon, toolsFor, runTool } from "./tools";

export class TaskStuck extends Error {}

type Loaded = Awaited<ReturnType<typeof load>>;

async function load(taskId: string) {
  const task = await db.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { goal: true, project: true, assignedAgent: true },
  });
  if (!task.assignedAgent) throw new Error(`Task ${taskId} has no agent assigned.`);
  // Only the outputs this task depends on, latest attempt each: keeps context
  // small. The plan task is a gate every task waits on, not an input.
  const workDeps = await db.task.findMany({ where: { id: { in: task.dependsOn }, kind: "work" }, select: { id: true } });
  const inputs = await Promise.all(
    workDeps.map(async ({ id: depId }) => {
      const d = await db.deliverable.findFirst({ where: { taskId: depId }, orderBy: { attempt: "desc" } });
      return d ? { title: d.title, content: await storage.read(d.path) } : null;
    }),
  );
  return { task, agent: task.assignedAgent, inputs: inputs.filter((x) => x !== null) };
}

function buildSystem({ task, agent }: Loaded) {
  const brand = JSON.stringify(task.project.brandKit ?? {}, null, 2);
  return [
    agent.systemPrompt,
    `Your name is ${agent.name}. Personality: ${agent.personality}`,
    agent.styleNotes ? `The owner's style notes for you:\n${agent.styleNotes}` : "",
    `Project: ${task.project.name}. ${task.project.description}`,
    brand === "{}"
      ? "The Brand Kit is empty. Do not invent brand rules; keep the voice plain and neutral."
      : `Brand Kit (follow it; never invent rules it doesn't state):\n${brand}`,
    HARD_RULES,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function buildPrompt({ task, inputs }: Loaded) {
  const parts = [`Goal: ${task.goal.title}`, task.goal.brief, `Your task: ${task.title}`, task.brief];
  if (task.kind === "plan") {
    const roles = await db.agent.findMany({ where: { archived: false }, distinct: ["role"], select: { role: true } });
    parts.push(`Roles on the team: ${roles.map((r) => r.role).join(", ")}`);
  }
  for (const i of inputs) parts.push(`Input from "${i.title}":\n--- BEGIN DRAFT ---\n${i.content}\n--- END DRAFT ---`);
  if (task.reviewNotes) parts.push(`The owner sent this back with notes. Address them:\n${task.reviewNotes}`);
  return parts.filter(Boolean).join("\n\n");
}

const callKey = (c: ToolCall) => `${c.name}:${JSON.stringify(c.input)}`;

/**
 * Runs one attempt of a task and returns the agent's final text.
 * Each model response is saved as a TaskStep before anything else happens, so
 * a worker that crashes mid-task replays finished steps for free instead of
 * paying for them (or producing different output) a second time.
 */
export async function runAgent(taskId: string, attempt: number): Promise<string> {
  const ctx = await load(taskId);
  const { task, agent } = ctx;
  const provider = getProvider();
  const tools = toolsFor(agent.tools);
  const system = buildSystem(ctx);
  const messages: Message[] = [{ role: "user", content: [{ type: "text", text: await buildPrompt(ctx) }] }];
  const seenCalls = new Map<string, number>();

  for (let step = 0; step < task.maxSteps; step++) {
    const saved = await db.taskStep.findUnique({ where: { taskId_attempt_step: { taskId, attempt, step } } });
    let res: ModelResponse;
    if (saved) {
      res = saved.response as unknown as ModelResponse;
    } else {
      await assertCanSpend({ agentId: agent.id, taskId, projectId: task.projectId });
      await emit("task.step", { agentId: agent.id, taskId, payload: { icon: "🤔", label: "thinking", step } });
      res = await provider.complete({
        tier: agent.model,
        system,
        messages,
        tools,
        maxTokens: 4096,
        hint: { role: agent.role, taskKind: task.kind, title: task.title },
      });
      const cost = costUsd(res.model, res.usage.inputTokens, res.usage.outputTokens);
      // Step and its bill are written together: both or neither.
      try {
        await db.$transaction([
          db.taskStep.create({
            data: { taskId, attempt, step, response: res as unknown as Prisma.InputJsonValue },
          }),
          db.usageEntry.create({
            data: {
              agentId: agent.id,
              taskId,
              projectId: task.projectId,
              provider: res.provider,
              model: res.model,
              inputTokens: res.usage.inputTokens,
              outputTokens: res.usage.outputTokens,
              costUsd: cost,
              attempt,
              step,
            },
          }),
        ]);
      } catch (e) {
        // Another run of this same attempt saved the step first: use its answer so both runs agree.
        if ((e as { code?: string }).code !== "P2002") throw e;
        const winner = await db.taskStep.findUniqueOrThrow({ where: { taskId_attempt_step: { taskId, attempt, step } } });
        res = winner.response as unknown as ModelResponse;
      }
    }

    if (res.toolCalls.length === 0) return res.text;

    const assistant: ContentBlock[] = [];
    if (res.text) assistant.push({ type: "text", text: res.text });
    for (const call of res.toolCalls) {
      const n = (seenCalls.get(callKey(call)) ?? 0) + 1;
      seenCalls.set(callKey(call), n);
      if (n >= 3) throw new TaskStuck(`${agent.name} called ${call.name} with the same input 3 times.`);
      assistant.push({ type: "tool_use", id: call.id, name: call.name, input: call.input });
    }
    let results = saved?.toolResults as ContentBlock[] | null | undefined;
    if (!results) {
      results = [];
      for (const call of res.toolCalls) {
        await emit("task.step", { agentId: agent.id, taskId, payload: { icon: toolIcon(call.name), label: call.name, step } });
        const out = await runTool(call, { taskId, projectId: task.projectId, agentTools: agent.tools });
        results.push({ type: "tool_result", toolUseId: call.id, content: out.content, isError: out.isError });
      }
      await db.taskStep.update({
        where: { taskId_attempt_step: { taskId, attempt, step } },
        data: { toolResults: results as unknown as Prisma.InputJsonValue },
      });
    }
    messages.push({ role: "assistant", content: assistant }, { role: "user", content: results });
  }
  throw new TaskStuck(`Task used all ${task.maxSteps} steps without finishing.`);
}
