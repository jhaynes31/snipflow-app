import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "./config";

export const TASK_QUEUE = "tasks";

export function redisConnection() {
  // BullMQ workers need maxRetriesPerRequest: null.
  return new Redis(config.redisUrl, { maxRetriesPerRequest: null });
}

let queue: Queue | undefined;
let queueConn: Redis | undefined;
export function taskQueue() {
  queueConn ??= redisConnection();
  queue ??= new Queue(TASK_QUEUE, {
    connection: queueConn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 },
    },
  });
  return queue;
}

/** BullMQ leaves connections it was handed open, so close ours ourselves. */
export async function closeQueue() {
  await queue?.close();
  queueConn?.disconnect();
  queue = queueConn = undefined;
}

/**
 * The job id is the task id plus its attempt number, so enqueueing the same
 * task twice (reconcile sweep + completion hook, or two API calls) is a no-op
 * in BullMQ, while a rejected-and-retried task gets a fresh job.
 */
export async function enqueueTask(taskId: string, attempt: number) {
  await taskQueue().add("run", { taskId, attempt }, { jobId: `${taskId}__${attempt}` });
}
