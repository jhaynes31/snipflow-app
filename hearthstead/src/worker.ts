import { DelayedError, Worker } from "bullmq";
import { config } from "./config";
import { db } from "./db";
import { markFailed, processTask, reconcile } from "./orchestrator";
import { closeQueue, redisConnection, TASK_QUEUE } from "./queue";

export function startWorker(opts: { concurrency?: number } = {}) {
  const conn = redisConnection();
  const worker = new Worker<{ taskId: string; attempt: number }>(
    TASK_QUEUE,
    async (job, token) => {
      const { taskId, attempt } = job.data;
      const outcome = await processTask(taskId, attempt);
      if (outcome === "agent_busy") {
        // The agent is on another task; look again shortly without spending a retry.
        await job.moveToDelayed(Date.now() + 3000, token);
        throw new DelayedError();
      }
      return outcome;
    },
    {
      connection: conn,
      concurrency: opts.concurrency ?? 4,
      // A worker that dies holding a job loses its lock after this long, and
      // the job goes back to waiting for another worker to pick up.
      lockDuration: config.jobLockMs,
      stalledInterval: config.jobLockMs,
    },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const maxTries = job.opts.attempts ?? 1;
    console.error(`[worker] task ${job.data.taskId} try ${job.attemptsMade}/${maxTries} failed: ${err.message}`);
    if (job.attemptsMade >= maxTries) await markFailed(job.data.taskId, job.data.attempt, err.message);
  });
  worker.on("error", (err) => console.error("[worker]", err.message));
  worker.on("closed", () => conn.disconnect());
  return worker;
}

// Run as a process: `npm run worker`.
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = startWorker();
  await reconcile();
  const sweep = setInterval(() => reconcile().catch((e) => console.error("[reconcile]", e)), 60_000);
  console.log("[worker] running. Ctrl-C to stop.");

  const shutdown = async () => {
    console.log("[worker] finishing current jobs, then stopping...");
    clearInterval(sweep);
    await worker.close();
    await closeQueue();
    await db.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
