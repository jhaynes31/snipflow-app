import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { partnerForProfile } from "./everyBox/lib";

/**
 * Cross-module hooks: the server side of the event bus.
 *
 * A module that wants to react to an event registers a listener here, keyed
 * by event name. `events.emit` writes the event and then calls each listener
 * in the same transaction. Listeners must be quick and must never throw for
 * a user-facing reason; they are bonuses, never dependencies.
 *
 * Adding a module's listener means adding one line to `LISTENERS`. The shell
 * itself never changes.
 *
 * Event names the foundation emits today:
 *   checkin.steady | checkin.tender | checkin.low   { answer }
 *   gentleMode.on | gentleMode.off                    {}
 *   headsUp.sent | headsUp.responded | headsUp.closed { headsUpId, help?, response? }
 *   manual.updated                                    { key }
 */
export type Listener = (ctx: MutationCtx, event: Doc<"events">) => Promise<void>;

/**
 * Every Box: a Project Thinker project sent over becomes a commitment for
 * the person who sent it, active right away since it is their own. Tend
 * never touches Every Box's tables; this is Every Box acting on its own
 * terms in response to information.
 */
async function everyBoxCommitmentFromProject(ctx: MutationCtx, event: Doc<"events">): Promise<void> {
  const partner = await partnerForProfile(ctx, event.ownerId);
  if (!partner) return;
  const payload = event.payload as { title?: string; firstAction?: string | null };
  const title = (payload.firstAction ? `${payload.title}: ${payload.firstAction}` : payload.title ?? "Project").slice(0, 120);
  const now = Date.now();
  await ctx.db.insert("ebCommitments", {
    householdId: partner.householdId,
    title,
    proposedBy: partner._id,
    assignedToIds: [partner._id],
    status: "active",
    createdAt: now,
    agreedAt: now,
    activatedAt: now,
    lastTendedAt: now,
    visibility: "shared",
  });
}

export const LISTENERS: Record<string, Listener[]> = {
  "project.sendToEveryBox": [everyBoxCommitmentFromProject],
  /** A Kept Word word sent over becomes the giver's own active commitment, the same way. */
  "word.sendToEveryBox": [everyBoxCommitmentFromProject],
};

export async function runListeners(ctx: MutationCtx, event: Doc<"events">): Promise<void> {
  for (const listener of LISTENERS[event.name] ?? []) {
    await listener(ctx, event);
  }
}
