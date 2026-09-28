import { db } from "./db";
import type { Prisma } from "./generated/prisma/client";

/** Section 17 event names. Phase 3 maps each one to an animation. */
export type EventType =
  | "agent.wake"
  | "agent.walk_to"
  | "agent.idle"
  | "agent.sleep"
  | "task.start"
  | "task.step"
  | "task.handoff"
  | "task.needs_review"
  | "task.done"
  | "task.failed"
  | "task.blocked"
  | "budget.exhausted"
  | "farm.paused";

export async function emit(
  type: EventType,
  e: { agentId?: string | null; taskId?: string | null; payload?: Prisma.InputJsonValue } = {},
) {
  await db.agentEvent.create({
    data: { type, agentId: e.agentId ?? null, taskId: e.taskId ?? null, payload: e.payload ?? {} },
  });
}
