import path from "node:path";

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

export const config = {
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://hearth:hearth@localhost:5432/hearthstead",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  dataDir: path.resolve(process.env.DATA_DIR ?? "./data"),
  apiPort: Number(process.env.API_PORT ?? 4000),
  modelProvider: process.env.MODEL_PROVIDER ?? "mock",
  mockDelayScale: Number(process.env.MOCK_DELAY_SCALE ?? 1),
  // How long a crashed worker's job waits before another worker takes it over.
  jobLockMs: Number(process.env.JOB_LOCK_MS ?? 15000),
};
