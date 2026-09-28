import { resetAll, waitFor } from "./helpers";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { after, test } from "node:test";
import { db } from "../src/db";
import { createGoal } from "../src/orchestrator";
import { closeQueue } from "../src/queue";
import { seed } from "../src/seed";

// The real thing: a worker process is killed with SIGKILL mid-task (no chance
// to clean up), a fresh one starts, and the work finishes exactly once.
function spawnWorker() {
  return spawn("npx", ["tsx", "src/worker.ts"], {
    env: { ...process.env, MOCK_DELAY_SCALE: "1" }, // ~1.5–4s per model call, so there's time to kill it
    stdio: "ignore",
    detached: true, // own process group, so SIGKILL reaches tsx's child too
  });
}
const kill = (p: ChildProcess) => process.kill(-p.pid!, "SIGKILL");

let worker: ChildProcess | undefined;
after(async () => {
  if (worker && worker.exitCode === null) kill(worker);
  await closeQueue();
  await db.$disconnect();
});

test("a worker killed mid-task is replaced and the work finishes without duplicates", { timeout: 60_000 }, async () => {
  await resetAll();
  const project = await seed();
  const goal = await createGoal({ projectId: project.id, title: "Survive a crash", brief: "" });

  worker = spawnWorker();
  const draft = await waitFor(
    () => db.task.findFirst({ where: { goalId: goal.id, planKey: "draft", status: "in_progress" } }),
    30_000,
  );
  kill(worker);
  await new Promise((r) => worker!.once("exit", r));
  assert.equal((await db.task.findUniqueOrThrow({ where: { id: draft.id } })).status, "in_progress", "killed mid-task");

  worker = spawnWorker();
  await waitFor(() => db.task.findFirst({ where: { goalId: goal.id, planKey: "edit", status: "needs_review" } }), 40_000);

  const tasks = await db.task.findMany({ where: { goalId: goal.id } });
  assert.equal(tasks.length, 3, "no duplicate tasks");
  for (const t of tasks) {
    assert.equal(await db.deliverable.count({ where: { taskId: t.id } }), 1, `one deliverable for ${t.planKey}`);
    assert.equal(await db.usageEntry.count({ where: { taskId: t.id } }), 1, `billed once for ${t.planKey}`);
  }
  const copywriter = await db.agent.findFirstOrThrow({ where: { role: "copywriter" } });
  assert.equal(copywriter.tasksDone, 1);
  assert.equal(copywriter.currentTaskId, null);
});
