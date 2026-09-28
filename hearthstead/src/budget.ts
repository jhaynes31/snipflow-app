import { db, getSettings } from "./db";

/** USD per million tokens. Mock costs nothing (Demo mode). Real prices arrive with the Anthropic provider in Phase 2. */
const PRICES: Record<string, { input: number; output: number }> = {
  "mock-fast": { input: 0, output: 0 },
  "mock-smart": { input: 0, output: 0 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number) {
  const p = PRICES[model];
  if (!p) throw new Error(`No price for model "${model}"; refusing to run it untracked.`);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export class BudgetExceeded extends Error {
  constructor(
    public scope: "global_day" | "global_month" | "project_month" | "agent_day" | "task",
    message: string,
  ) {
    super(message);
  }
}

export class FarmPaused extends Error {
  constructor() {
    super("The farm is paused.");
  }
}

function startOfDay(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function startOfMonth(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function spend(where: object) {
  const r = await db.usageEntry.aggregate({ where, _sum: { costUsd: true, inputTokens: true, outputTokens: true } });
  return {
    usd: r._sum.costUsd ?? 0,
    tokens: (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0),
  };
}

/**
 * Called before every model call. Throws instead of returning a flag so a
 * caller can't forget to check the answer.
 */
export async function assertCanSpend(opts: { agentId: string; taskId: string; projectId: string }) {
  const settings = await getSettings();
  if (settings.paused) throw new FarmPaused();

  const today = startOfDay();
  const month = startOfMonth();

  const day = await spend({ createdAt: { gte: today } });
  if (day.usd >= settings.dailyCapUsd)
    throw new BudgetExceeded("global_day", `Daily cap of $${settings.dailyCapUsd} reached. Out of budget until tomorrow.`);

  const mon = await spend({ createdAt: { gte: month } });
  if (mon.usd >= settings.monthlyCapUsd)
    throw new BudgetExceeded("global_month", `Monthly cap of $${settings.monthlyCapUsd} reached.`);

  const project = await db.project.findUniqueOrThrow({ where: { id: opts.projectId } });
  const proj = await spend({ projectId: opts.projectId, createdAt: { gte: month } });
  if (proj.usd >= project.monthlyBudgetCap)
    throw new BudgetExceeded("project_month", `Project "${project.name}" reached its $${project.monthlyBudgetCap} monthly cap.`);

  const agent = await db.agent.findUniqueOrThrow({ where: { id: opts.agentId } });
  const agentDay = await spend({ agentId: opts.agentId, createdAt: { gte: today } });
  if (agentDay.tokens >= agent.dailyTokenBudget)
    throw new BudgetExceeded("agent_day", `${agent.name} used their ${agent.dailyTokenBudget}-token daily budget.`);

  const task = await db.task.findUniqueOrThrow({ where: { id: opts.taskId } });
  const taskSpend = await spend({ taskId: opts.taskId });
  if (taskSpend.tokens >= task.maxTokens)
    throw new BudgetExceeded("task", `Task hit its ${task.maxTokens}-token limit.`);
}

export async function spendSummary() {
  const [day, month] = await Promise.all([
    spend({ createdAt: { gte: startOfDay() } }),
    spend({ createdAt: { gte: startOfMonth() } }),
  ]);
  const byAgent = await db.usageEntry.groupBy({
    by: ["agentId"],
    where: { createdAt: { gte: startOfDay() } },
    _sum: { costUsd: true, inputTokens: true, outputTokens: true },
  });
  return { day, month, byAgent };
}
