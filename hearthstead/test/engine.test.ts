import { resetAll, waitFor } from "./helpers";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { db } from "../src/db";
import { approveTask, createGoal, processTask, rejectTask } from "../src/orchestrator";
import { setProvider } from "../src/providers";
import { MockProvider } from "../src/providers/mock";
import type { ModelRequest } from "../src/providers/types";
import { closeQueue } from "../src/queue";
import { runAgent } from "../src/runner";
import { seed } from "../src/seed";
import { storage } from "../src/storage";
import { startWorker } from "../src/worker";

/** Mock Provider that counts calls, so tests can prove nothing was paid for twice. */
class CountingProvider extends MockProvider {
  calls = 0;
  constructor() {
    super(0);
  }
  override async complete(req: ModelRequest) {
    this.calls++;
    return super.complete(req);
  }
}

let provider: CountingProvider;
let worker: ReturnType<typeof startWorker> | undefined;

before(async () => {
  await resetAll();
});
beforeEach(async () => {
  await worker?.close();
  worker = undefined;
  await resetAll();
  provider = new CountingProvider();
  setProvider(provider);
});
after(async () => {
  await worker?.close();
  await closeQueue();
  await db.$disconnect();
});

test("a goal becomes a plan, tasks run in order, and the result lands in the Inbox", async () => {
  const project = await seed();
  worker = startWorker();
  const goal = await createGoal({ projectId: project.id, title: "Spring promo post", brief: "One short post." });

  const review = await waitFor(() => db.task.findFirst({ where: { goalId: goal.id, status: "needs_review" } }));
  assert.equal(review.planKey, "edit");

  const tasks = await db.task.findMany({ where: { goalId: goal.id }, orderBy: { createdAt: "asc" } });
  assert.deepEqual(tasks.map((t) => [t.planKey, t.status]), [["plan", "done"], ["draft", "done"], ["edit", "needs_review"]]);
  // The edit ran after the draft, and got the draft as input.
  const [draft, edit] = [tasks[1], tasks[2]];
  assert.ok(edit.startedAt! >= draft.finishedAt!);
  assert.deepEqual(edit.dependsOn.sort(), [tasks[0].id, draft.id].sort());

  const deliverables = await db.deliverable.findMany({ where: { taskId: { in: tasks.map((t) => t.id) } } });
  assert.equal(deliverables.length, 3);
  // The Editor worked on the Copywriter's draft, not on the plan.
  const edited = await storage.read(deliverables.find((d) => d.taskId === edit.id)!.path);
  assert.match(edited, /\*\*Headline:\*\*/);
  assert.doesNotMatch(edited, /"tasks"/);
  assert.equal(provider.calls, 3);

  const types = (await db.agentEvent.findMany({ orderBy: { id: "asc" } })).map((e) => e.type);
  for (const t of ["task.start", "task.step", "task.handoff", "task.needs_review"]) assert.ok(types.includes(t), `missing ${t}`);

  await approveTask(review.id);
  assert.equal((await db.goal.findUniqueOrThrow({ where: { id: goal.id } })).status, "done");
});

test("a locked project's plan waits for approval before any work starts", async () => {
  const project = await seed();
  await db.project.update({ where: { id: project.id }, data: { approvalLock: true } });
  worker = startWorker();
  const goal = await createGoal({ projectId: project.id, title: "Holiday booking push", brief: "" });

  const plan = await waitFor(() => db.task.findFirst({ where: { goalId: goal.id, kind: "plan", status: "needs_review" } }));
  await new Promise((r) => setTimeout(r, 500));
  const work = await db.task.findMany({ where: { goalId: goal.id, kind: "work" } });
  assert.ok(work.length > 0 && work.every((t) => t.status === "queued"), "no work before approval");
  assert.equal(provider.calls, 1);

  await approveTask(plan.id);
  await waitFor(() => db.task.findFirst({ where: { goalId: goal.id, planKey: "edit", status: "needs_review" } }));
});

test("sending work back creates a new attempt with the owner's notes", async () => {
  const project = await seed();
  worker = startWorker();
  const goal = await createGoal({ projectId: project.id, title: "Newsletter intro", brief: "" });
  const edit = await waitFor(() => db.task.findFirst({ where: { goalId: goal.id, planKey: "edit", status: "needs_review" } }));

  await rejectTask(edit.id, "Warmer, please.");
  const again = await waitFor(() =>
    db.task.findFirst({ where: { id: edit.id, status: "needs_review", attempts: 1 } }),
  );
  assert.equal(again.reviewNotes, "Warmer, please.");
  assert.deepEqual((await db.deliverable.findMany({ where: { taskId: edit.id } })).map((d) => d.attempt).sort(), [0, 1]);
});

test("the budget guard blocks a task instead of spending past an agent's budget", async () => {
  const project = await seed();
  await db.agent.updateMany({ where: { role: "copywriter" }, data: { dailyTokenBudget: 0 } });
  worker = startWorker();
  const goal = await createGoal({ projectId: project.id, title: "Ad copy", brief: "" });

  // The goal is written last, so wait for it.
  await waitFor(() => db.goal.findFirst({ where: { id: goal.id, status: "blocked" } }));
  const blocked = await db.task.findFirstOrThrow({ where: { goalId: goal.id, status: "blocked" } });
  assert.equal(blocked.planKey, "draft");
  assert.match(blocked.lastError!, /daily budget/);
  assert.equal(provider.calls, 1, "only the plan was paid for");
  assert.ok(await db.agentEvent.findFirst({ where: { type: "budget.exhausted" } }));
});

test("the pause switch stops new work from starting", async () => {
  const project = await seed();
  await db.settings.update({ where: { id: "global" }, data: { paused: true } });
  worker = startWorker();
  const goal = await createGoal({ projectId: project.id, title: "Paused goal", brief: "" });
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(provider.calls, 0);
  assert.equal((await db.task.findFirstOrThrow({ where: { goalId: goal.id } })).status, "queued");
});

test("replaying a task after a crash reuses saved steps and never duplicates output", async () => {
  const project = await seed();
  // No worker: drive the job by hand, as a crashed-then-restarted worker would.
  const goal = await createGoal({ projectId: project.id, title: "Replay me", brief: "" });
  const plan = await db.task.findFirstOrThrow({ where: { goalId: goal.id } });

  // First run "crashes" after the model answered: the step is saved, nothing else happened.
  await db.task.update({ where: { id: plan.id }, data: { status: "in_progress" } });
  await runAgent(plan.id, 0);
  assert.equal(provider.calls, 1);

  // The restarted worker runs the same job twice (stall re-delivery + reconcile).
  const outcomes = await Promise.all([processTask(plan.id, 0), processTask(plan.id, 0)]);
  assert.ok(outcomes.includes("done"));
  assert.equal(provider.calls, 1, "saved step replayed, not re-bought");
  assert.equal(await db.deliverable.count({ where: { taskId: plan.id } }), 1);
  assert.equal(await db.usageEntry.count({ where: { taskId: plan.id } }), 1);
  assert.equal(await db.task.count({ where: { goalId: goal.id, kind: "work" } }), 2);
  const strategist = await db.agent.findFirstOrThrow({ where: { role: "strategist" } });
  assert.equal(strategist.tasksDone, 1);
});

test("two runs racing on the same step agree on one answer and one bill", async () => {
  const project = await seed();
  const goal = await createGoal({ projectId: project.id, title: "Race me", brief: "" });
  const plan = await db.task.findFirstOrThrow({ where: { goalId: goal.id } });
  const [a, b] = await Promise.all([runAgent(plan.id, 0), runAgent(plan.id, 0)]);
  assert.equal(a, b);
  assert.equal(await db.taskStep.count({ where: { taskId: plan.id } }), 1);
  assert.equal(await db.usageEntry.count({ where: { taskId: plan.id } }), 1);
});
