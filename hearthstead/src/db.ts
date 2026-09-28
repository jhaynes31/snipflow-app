import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { config } from "./config";

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });

export async function getSettings() {
  return db.settings.upsert({ where: { id: "global" }, update: {}, create: { id: "global" } });
}
