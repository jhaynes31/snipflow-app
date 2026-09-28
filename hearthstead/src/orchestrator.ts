import { BudgetExceeded, FarmPaused } from "./budget";
import { db, getSettings } from "./db";
import { emit } from "./events";
import type { Task } from "./generated/prisma/client";
import { enqueueTask } from "./queue";
import { runAgent, TaskStuck } from "./runner";
import { storage } from "./storage";

const SATISFIED = ["done", "approved"] as const;
const isSatisfied = (s: string) => (SATISFIED as readonly string[]).includes(s);

/** Least-busy active agent with the role. */
async function pickAgent(role: string) {
  const agents = await db.agent.findMany({
    where: { role, archived: false },
    include: { _count: { select: { tasks: { where: { status: { in: ["queued", "in_progress"] } } } } } },
  });
  agents.sort((a, b) => a._count.tasks - b._count.tasks);
  return agents[0] ?? null;
}

export async function createGoal(input: { projectId: string; title: string; brief: string; createdBy?: string }) {
  const strategist = await pickAgent("strategist");
  if (!strategist) throw new Error("Hire a Strategist first: every goal starts with a plan.");
  const goal = await db.goal.create({
    data: { projectId: input.projectId, title: input.title, brief: input.brief, createdBy: input.createdBy ?? "me" },
  });
  const task = await db.task.create({
    data: {
      goalId: goal.id,
      projectId: input.projectId,
      kind: "plan",
      planKey: "plan",
      title: `Plan: ${input.title}`,
      brief: "Turn this goal into a small plan of tasks for the team.",
      role: "strategist",
      assignedAgentId: strategist.id,
      createdBy: input.createdBy ?? "me",
    },
  });
  await enqueueTask(task.id, task.attempts);
  return goal;
}

// ---------------------------------------------------------------------------
// Running a task
// ---------------------------------------------------------------------------

export type Outcome = "skipped" | "not_ready" | "paused" | "agent_busy" | "done" | "needs_review" | "blocked";

/**
 * Processes one queue job. Safe to call any number of times for the same
 * (task, attempt): every state change is a conditional update, so a duplicate
 * or replayed job either finds nothing to do or finishes the same work.
 */
export async function processTask(taskId: string, attempt: number): Promise<Outcome> {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task || task.attempts !== attempt || !["queued", "in_progress"].includes(task.status)) return "skipped";

  const deps = await db.task.findMany({ where: { id: { in: task.dependsOn } }, select: { status: true } });
  if (deps.length !== task.dependsOn.length || !deps.every((d) => isSatisfied(d.status))) return "not_ready";

  if ((await getSettings()).paused) return "paused";

  const agentId = task.assignedAgentId!;
  // One task per agent at a time. Re-claiming our own task (after a crash) is fine.
  const claimed = await db.agent.updateMany({
    where: { id: agentId, OR: [{ currentTaskId: null }, { currentTaskId: taskId }] },
    data: { currentTaskId: taskId, status: "working", lastActiveAt: new Date() },
  });
  if (claimed.count === 0) return "agent_busy";

  const started = await db.task.updateMany({
    where: { id: taskId, attempts: attempt, status: "queued" },
    data: { status: "in_progress", startedAt: new Date() },
  });
  if (started.count === 1) {
    await emit("agent.walk_to", { agentId, taskId, payload: { target: "workstation" } });
    await emit("task.start", { agentId, taskId, payload: { title: task.title } });
  }

  try {
    const text = await runAgent(taskId, attempt);
    return task.kind === "plan" ? await finishPlan(task, attempt, text) : await finishWork(task, attempt, text);
  } catch (e) {
    if (e instanceof FarmPaused) {
      await db.task.updateMany({ where: { id: taskId, status: "in_progress" }, data: { status: "queued" } });
      await releaseAgent(agentId, taskId, "sleeping");
      await emit("agent.sleep", { agentId, taskId, payload: { reason: "paused" } });
      return "paused";
    }
    if (e instanceof BudgetExceeded || e instanceof TaskStuck) {
      // Reason first, so nobody sees the block without it.
      if (e instanceof BudgetExceeded) await emit("budget.exhausted", { agentId, taskId, payload: { scope: e.scope, message: e.message } });
      await blockTask(task, e.message);
      return "blocked";
    }
    throw e; // Unexpected: let BullMQ retry, then markFailed() on the last try.
  }
}

async function releaseAgent(agentId: string, taskId: string, status: "idle" | "waiting_review" | "blocked" | "sleeping") {
  await db.agent.updateMany({ where: { id: agentId, currentTaskId: taskId }, data: { currentTaskId: null, status } });
}

async function blockTask(task: Task, reason: string) {
  const r = await db.task.updateMany({
    where: { id: task.id, status: "in_progress" },
    data: { status: "blocked", lastError: reason },
  });
  await releaseAgent(task.assignedAgentId!, task.id, "blocked");
  if (r.count) await emit("task.blocked", { agentId: task.assignedAgentId, taskId: task.id, payload: { reason } });
  await refreshGoal(task.goalId);
}

export async function markFailed(taskId: string, attempt: number, error: string) {
  const task = await db.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const r = await db.task.updateMany({
    where: { id: taskId, attempts: attempt, status: { in: ["queued", "in_progress"] } },
    data: { status: "failed", lastError: error, finishedAt: new Date() },
  });
  if (task.assignedAgentId) await releaseAgent(task.assignedAgentId, taskId, "idle");
  if (r.count) await emit("task.failed", { agentId: task.assignedAgentId, taskId, payload: { error } });
  await refreshGoal(task.goalId);
}

async function saveDeliverable(task: Task, attempt: number, title: string, format: string, content: string) {
  const path = `projects/${task.projectId}/deliverables/${task.id}-${attempt}.${format}`;
  await storage.write(path, content);
  // Prisma's upsert is read-then-insert and races; ON CONFLICT DO NOTHING doesn't.
  await db.deliverable.createMany({
    data: [{ taskId: task.id, attempt, agentId: task.assignedAgentId!, projectId: task.projectId, title, format, path }],
    skipDuplicates: true,
  });
  return db.deliverable.findUniqueOrThrow({ where: { taskId_attempt: { taskId: task.id, attempt } } });
}

/** Moves in_progress → final status exactly once; returns false if another run got there first. */
async function complete(task: Task, attempt: number, status: "done" | "needs_review") {
  const r = await db.task.updateMany({
    where: { id: task.id, attempts: attempt, status: "in_progress" },
    data: { status, finishedAt: new Date() },
  });
  const agentId = task.assignedAgentId!;
  await releaseAgent(agentId, task.id, status === "needs_review" ? "waiting_review" : "idle");
  if (r.count === 0) return false;
  await db.agent.update({ where: { id: agentId }, data: { tasksDone: { increment: 1 } } });
  if (status === "needs_review") {
    await emit("agent.walk_to", { agentId, taskId: task.id, payload: { target: "review_board" } });
    await emit("task.needs_review", { agentId, taskId: task.id, payload: { title: task.title } });
  } else {
    await emit("task.done", { agentId, taskId: task.id, payload: { title: task.title } });
  }
  await emit("agent.idle", { agentId });
  return true;
}

async function finishWork(task: Task, attempt: number, text: string): Promise<Outcome> {
  await saveDeliverable(task, attempt, task.title, "md", text);
  const status = task.requiresApproval ? "needs_review" : "done";
  if (await complete(task, attempt, status)) {
    if (status === "done") await handOff(task);
    await refreshGoal(task.goalId);
    await dispatchReady(task.goalId);
  }
  return status;
}

interface PlanItem {
  key: string;
  title: string;
  brief: string;
  role: string;
  dependsOn: string[];
  requiresApproval: boolean;
}

export function parsePlan(text: string): PlanItem[] {
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  const parsed = JSON.parse(json) as { tasks?: unknown };
  if (!Array.isArray(parsed.tasks) || parsed.tasks.length === 0) throw new Error("Plan has no tasks.");
  const items = parsed.tasks.map((t: Record<string, unknown>) => ({
    key: String(t.key ?? ""),
    title: String(t.title ?? ""),
    brief: String(t.brief ?? ""),
    role: String(t.role ?? ""),
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.map(String) : [],
    requiresApproval: Boolean(t.requiresApproval),
  }));
  const keys = new Set(items.map((i) => i.key));
  if (keys.size !== items.length || keys.has("") || keys.has("plan")) throw new Error("Plan task keys must be unique and non-empty.");
  for (const i of items) for (const d of i.dependsOn) if (!keys.has(d)) throw new Error(`Task "${i.key}" depends on unknown "${d}".`);
  // Reject cycles: repeatedly peel off tasks whose deps are all peeled.
  const done = new Set<string>();
  while (done.size < items.length) {
    const next = items.filter((i) => !done.has(i.key) && i.dependsOn.every((d) => done.has(d)));
    if (next.length === 0) throw new Error("Plan has a dependency cycle.");
    next.forEach((i) => done.add(i.key));
  }
  // Something must reach the owner.
  if (!items.some((i) => i.requiresApproval)) items[items.length - 1].requiresApproval = true;
  return items;
}

async function finishPlan(task: Task, attempt: number, text: string): Promise<Outcome> {
  let items: PlanItem[];
  try {
    items = parsePlan(text);
  } catch (e) {
    await blockTask(task, `The Strategist's plan couldn't be used: ${(e as Error).message}`);
    return "blocked";
  }
  for (const i of items) {
    if (!(await pickAgent(i.role))) {
      await blockTask(task, `The plan needs a ${i.role}, and nobody on the team has that role. Hire one, then retry.`);
      return "blocked";
    }
  }
  await saveDeliverable(task, attempt, task.title, "json", JSON.stringify({ tasks: items }, null, 2));

  // Insert by (goal, planKey) with ON CONFLICT DO NOTHING: replaying this
  // step, or re-planning after a rejection, reuses the same rows instead of
  // creating duplicates. (Prisma's upsert is read-then-insert and races.)
  const data = [];
  for (const i of items) {
    const agent = await pickAgent(i.role);
    data.push({
      goalId: task.goalId,
      projectId: task.projectId,
      planKey: i.key,
      title: i.title,
      brief: i.brief,
      role: i.role,
      requiresApproval: i.requiresApproval,
      assignedAgentId: agent!.id,
      createdBy: task.assignedAgentId!,
      dependsOn: [task.id], // never runnable before its real deps are written below
    });
  }
  await db.task.createMany({ data, skipDuplicates: true });
  const rows = await db.task.findMany({ where: { goalId: task.goalId, planKey: { in: items.map((i) => i.key) } } });
  const ids = new Map(rows.map((r) => [r.planKey, r.id]));
  // Every task waits on the plan, so nothing starts until the plan is approved.
  for (const i of items) {
    await db.task.update({
      where: { id: ids.get(i.key)! },
      data: {
        title: i.title,
        brief: i.brief,
        role: i.role,
        requiresApproval: i.requiresApproval,
        dependsOn: [task.id, ...i.dependsOn.map((d) => ids.get(d)!)],
      },
    });
  }
  // A re-plan may drop tasks; remove those that never started.
  await db.task.deleteMany({
    where: { goalId: task.goalId, kind: "work", status: "queued", planKey: { notIn: items.map((i) => i.key) } },
  });

  const project = await db.project.findUniqueOrThrow({ where: { id: task.projectId } });
  const settings = await getSettings();
  const needsApproval = project.approvalLock || !settings.autoApprovePlans;
  if (await complete(task, attempt, needsApproval ? "needs_review" : "done")) {
    await refreshGoal(task.goalId);
    await dispatchReady(task.goalId);
  }
  return needsApproval ? "needs_review" : "done";
}

async function handOff(task: Task) {
  const next = await db.task.findMany({ where: { goalId: task.goalId, dependsOn: { has: task.id }, status: "queued" } });
  for (const n of next) {
    if (n.assignedAgentId && n.assignedAgentId !== task.assignedAgentId)
      await emit("task.handoff", { agentId: task.assignedAgentId, taskId: task.id, payload: { toAgentId: n.assignedAgentId, toTaskId: n.id } });
  }
}

/** Enqueue every queued task in the goal whose dependencies are all satisfied. */
export async function dispatchReady(goalId: string) {
  const tasks = await db.task.findMany({ where: { goalId } });
  const status = new Map(tasks.map((t) => [t.id, t.status]));
  for (const t of tasks) {
    if (t.status === "queued" && t.dependsOn.every((d) => isSatisfied(status.get(d) ?? ""))) await enqueueTask(t.id, t.attempts);
  }
}

export async function refreshGoal(goalId: string) {
  const tasks = await db.task.findMany({ where: { goalId }, select: { status: true, kind: true } });
  let status: "planning" | "running" | "needs_review" | "done" | "failed" | "blocked";
  if (tasks.some((t) => t.status === "failed")) status = "failed";
  else if (tasks.some((t) => t.status === "blocked")) status = "blocked";
  else if (tasks.some((t) => t.status === "needs_review")) status = "needs_review";
  else if (tasks.length > 1 && tasks.every((t) => isSatisfied(t.status))) status = "done";
  else if (tasks.every((t) => t.kind === "plan")) status = "planning";
  else status = "running";
  await db.goal.update({ where: { id: goalId }, data: { status } });
}

// ---------------------------------------------------------------------------
// Owner actions
// ---------------------------------------------------------------------------

export async function approveTask(taskId: string) {
  const r = await db.task.updateMany({ where: { id: taskId, status: "needs_review" }, data: { status: "approved" } });
  if (r.count === 0) throw new Error("Only items waiting for review can be approved.");
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  if (task.assignedAgentId) await db.agent.updateMany({ where: { id: task.assignedAgentId, status: "waiting_review" }, data: { status: "idle" } });
  await handOff(task);
  await refreshGoal(task.goalId);
  await dispatchReady(task.goalId);
}

/** Sends the task back to its agent with notes. A new attempt number means a new job and a fresh deliverable. */
export async function rejectTask(taskId: string, notes: string) {
  const r = await db.task.updateMany({
    where: { id: taskId, status: "needs_review" },
    data: { status: "queued", reviewNotes: notes, attempts: { increment: 1 }, finishedAt: null },
  });
  if (r.count === 0) throw new Error("Only items waiting for review can be sent back.");
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  if (task.assignedAgentId) await db.agent.updateMany({ where: { id: task.assignedAgentId, status: "waiting_review" }, data: { status: "idle" } });
  await refreshGoal(task.goalId);
  await enqueueTask(task.id, task.attempts);
}

/** Retry a failed or blocked task (e.g. after raising a budget). */
export async function retryTask(taskId: string) {
  const r = await db.task.updateMany({
    where: { id: taskId, status: { in: ["failed", "blocked"] } },
    data: { status: "queued", lastError: null, attempts: { increment: 1 } },
  });
  if (r.count === 0) throw new Error("Only failed or blocked tasks can be retried.");
  const task = await db.task.findUniqueOrThrow({ where: { id: taskId } });
  if (task.assignedAgentId) await db.agent.updateMany({ where: { id: task.assignedAgentId, status: "blocked" }, data: { status: "idle" } });
  await refreshGoal(task.goalId);
  await dispatchReady(task.goalId);
}

/**
 * Safety net run when the worker starts and every minute after: re-enqueue
 * anything that should be running. Job ids dedupe, so this never doubles work.
 */
export async function reconcile() {
  const active = await db.task.findMany({ where: { status: "in_progress" } });
  for (const t of active) await enqueueTask(t.id, t.attempts);
  const goals = await db.task.findMany({ where: { status: "queued" }, distinct: ["goalId"], select: { goalId: true } });
  for (const g of goals) await dispatchReady(g.goalId);
  // Free agents whose "current task" isn't actually running any more.
  const agents = await db.agent.findMany({ where: { currentTaskId: { not: null } } });
  for (const a of agents) {
    const t = await db.task.findUnique({ where: { id: a.currentTaskId! } });
    if (!t || t.status !== "in_progress") await db.agent.update({ where: { id: a.id }, data: { currentTaskId: null, status: "idle" } });
  }
}
