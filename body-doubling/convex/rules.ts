/**
 * The community's rules, in one place and with no database access, so the
 * Convex functions, the screens and the tests all read the same numbers.
 *
 * Money is in cents. Time is in milliseconds since the epoch (UTC).
 */

export const HOUR_MS = 3_600_000;

// ── Prices ────────────────────────────────────────────────────────────────
export const PRICES = {
  membershipMonthly: 5000, // $50 / month
  memberExtraHour: 1200, // $12 / hr
  memberExtraSession: 4000, // $40 for a full extra 4-hour session
  dropInHour: 1800, // $18 / hr, work blocks only
  dropInSession: 7000, // $70 for a full 4-hour session
} as const;

/** Hours a membership includes per billing cycle (two 4-hour sessions). */
export const INCLUDED_HOURS_PER_CYCLE = 8;
/** Hours in a full session, and in the $40 "extra session" pack. */
export const FULL_SESSION_HOURS = 4;

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

// ── Session shape ─────────────────────────────────────────────────────────

/**
 * A block inside a session. Bookends (the opening and closing circle) are for
 * people joining the whole session; drop-ins paying by the hour join work
 * blocks only.
 */
export type Block = { kind: "bookend" | "work"; category: string; hours: number };

export function sessionHours(blocks: Block[]): number {
  return blocks.reduce((sum, b) => sum + b.hours, 0);
}

export function workBlocks(blocks: Block[]): Block[] {
  return blocks.filter((b) => b.kind === "work");
}

/** 2 drop-in slots for smaller sessions, 3 once there are 10 seats. */
export function defaultDropInSlots(capacity: number): number {
  return capacity >= 10 ? 3 : 2;
}

export type SlotCounts = {
  memberSlots: number;
  dropInSlots: number;
  membersTaken: number;
  dropInsTaken: number;
};

export function slotsLeft(c: SlotCounts): { members: number; dropIns: number } {
  return {
    members: Math.max(0, c.memberSlots - c.membersTaken),
    dropIns: Math.max(0, c.dropInSlots - c.dropInsTaken),
  };
}

// ── Paying for a member booking ───────────────────────────────────────────

export type MemberHours = {
  /** Included hours still unused this cycle. */
  includedLeft: number;
  /** Purchased extra hours on hand (they carry over between cycles). */
  extraHours: number;
};

export type MemberPlan =
  | { ok: true; fromIncluded: number; fromExtra: number }
  | { ok: false; shortBy: number };

/** Included hours first, then purchased extras. */
export function planMemberBooking(hours: MemberHours, needed: number): MemberPlan {
  const fromIncluded = Math.min(Math.max(0, hours.includedLeft), needed);
  const fromExtra = Math.min(Math.max(0, hours.extraHours), needed - fromIncluded);
  const shortBy = needed - fromIncluded - fromExtra;
  if (shortBy > 0) return { ok: false, shortBy };
  return { ok: true, fromIncluded, fromExtra };
}

/**
 * The cheapest way for a member to buy `hours` extra hours: whole $40
 * session packs for every 4 hours, $12 an hour for the rest — unless one
 * more pack is cheaper than the loose hours.
 */
export function extraHoursPrice(hours: number): { packs: number; loose: number; cents: number } {
  let packs = Math.floor(hours / FULL_SESSION_HOURS);
  let loose = hours - packs * FULL_SESSION_HOURS;
  if (loose * PRICES.memberExtraHour > PRICES.memberExtraSession) {
    packs += 1;
    loose = 0;
  }
  return { packs, loose, cents: packs * PRICES.memberExtraSession + loose * PRICES.memberExtraHour };
}

// ── Drop-ins ──────────────────────────────────────────────────────────────

export type DropInChoice = { kind: "full" } | { kind: "hourly"; blockIndexes: number[] };

/** Price and hours for a drop-in's choice, or an error to show them. */
export function dropInQuote(blocks: Block[], choice: DropInChoice): { cents: number; hours: number } | { error: string } {
  if (choice.kind === "full") return { cents: PRICES.dropInSession, hours: sessionHours(blocks) };
  const picked = [...new Set(choice.blockIndexes)];
  if (picked.length === 0) return { error: "Pick at least one work block." };
  let hours = 0;
  for (const i of picked) {
    const b = blocks[i];
    if (!b || b.kind !== "work") return { error: "Hourly drop-ins can join work blocks only." };
    hours += b.hours;
  }
  return { cents: Math.round(hours * PRICES.dropInHour), hours };
}

// ── Waitlist ──────────────────────────────────────────────────────────────

export type WaitlistEntry = { priorityPaused: boolean; joinedAt: number };

/** Everyone in the order they joined, with paused-priority members after. */
export function compareWaitlist(a: WaitlistEntry, b: WaitlistEntry): number {
  if (a.priorityPaused !== b.priorityPaused) return a.priorityPaused ? 1 : -1;
  return a.joinedAt - b.joinedAt;
}

// ── Missed sessions ───────────────────────────────────────────────────────

/**
 * What happens after a missed session, by how many a member has now:
 * the first gets a friendly note about the policy; from the second on, their
 * waitlist spot goes to the back of the line until a host resets it.
 */
export function noShowOutcome(noShowCount: number): "none" | "gentleReminder" | "pausePriority" {
  if (noShowCount <= 0) return "none";
  if (noShowCount === 1) return "gentleReminder";
  return "pausePriority";
}

// ── Goals form timing ─────────────────────────────────────────────────────

/** The goals form is sent 48 hours ahead (or right away if booked later). */
export const GOALS_LEAD_MS = 48 * HOUR_MS;

export function goalsDue(startsAt: number, now: number): boolean {
  return now >= startsAt - GOALS_LEAD_MS && now < startsAt;
}

/** Self check-in is open from 15 minutes before the start until the end. */
export function checkInOpen(startsAt: number, hours: number, now: number): boolean {
  return now >= startsAt - 15 * 60_000 && now <= startsAt + hours * HOUR_MS;
}

/** How long an unpaid drop-in checkout holds a seat (Stripe's minimum). */
export const DROP_IN_HOLD_MS = 30 * 60_000;
