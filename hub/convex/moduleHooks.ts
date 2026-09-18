import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

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

export const LISTENERS: Record<string, Listener[]> = {
  // Example, once Rooted is in:
  // "forecast.tenderWeek": [rootedSuggestLighterSessions],
};

export async function runListeners(ctx: MutationCtx, event: Doc<"events">): Promise<void> {
  for (const listener of LISTENERS[event.name] ?? []) {
    await listener(ctx, event);
  }
}
