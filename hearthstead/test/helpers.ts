// Import this first in every test file: it points config at the test
// database and Redis db 1 before anything else reads the environment.
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://hearth:hearth@localhost:5432/hearthstead_test";
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379/1";
process.env.DATA_DIR = path.join(os.tmpdir(), `hearthstead-test-${process.pid}`);
process.env.MODEL_PROVIDER = "mock";
process.env.MOCK_DELAY_SCALE = "0";
process.env.JOB_LOCK_MS = "2000";

execSync("npx prisma migrate deploy", { stdio: "ignore", env: process.env });

export async function resetAll() {
  const { db } = await import("../src/db");
  const { taskQueue } = await import("../src/queue");
  await db.$executeRawUnsafe(
    `TRUNCATE "AgentEvent","UsageEntry","Deliverable","TaskStep","Task","Goal","Agent","Project","Settings" CASCADE`,
  );
  await taskQueue().obliterate({ force: true });
}

export async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, ms = 15000): Promise<T> {
  const until = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > until) throw new Error("Timed out waiting");
    await new Promise((r) => setTimeout(r, 100));
  }
}
