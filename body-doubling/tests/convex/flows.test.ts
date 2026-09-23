/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { HOUR_MS } from "../../convex/rules";

const modules = import.meta.glob("../../convex/**/*.*s");
const BLOCKS = [
  { kind: "bookend" as const, category: "Opening circle", hours: 0.5 },
  { kind: "work" as const, category: "Business", hours: 1 },
  { kind: "work" as const, category: "Play", hours: 1 },
  { kind: "work" as const, category: "Clean", hours: 1 },
  { kind: "bookend" as const, category: "Closing circle", hours: 0.5 },
];

const makeTest = () => convexTest(schema, modules);
type T = ReturnType<typeof makeTest>;

async function person(t: T, email: string, opts: { active?: boolean; name?: string } = {}) {
  const userId = await t.run((ctx) => ctx.db.insert("users", { email }));
  const as = t.withIdentity({ subject: `${userId}|s`, email });
  await as.mutation(api.members.ensure, { name: opts.name ?? email.split("@")[0] });
  const memberId = await t.run(async (ctx) => {
    const m = await ctx.db
      .query("members")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (opts.active !== false) await ctx.db.patch(m!._id, { membership: "active", cycleStart: 1, cycleEnd: Date.now() + 30 * 24 * HOUR_MS });
    return m!._id;
  });
  return { as, memberId };
}

async function newSession(host: Awaited<ReturnType<typeof person>>, inHours = 72, capacity = 8) {
  return await host.as.mutation(api.sessions.create, {
    title: "Tuesday Focus",
    startsAt: Date.now() + inHours * HOUR_MS,
    blocks: BLOCKS,
    capacity,
  });
}

const member = (t: T, id: Id<"members">) => t.run((ctx) => ctx.db.get(id));

describe("body doubling flows", () => {
  let t: T;
  let host: Awaited<ReturnType<typeof person>>;

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = "jen@example.com, john@example.com";
    t = makeTest();
    host = await person(t, "jen@example.com", { active: false });
  });

  it("only hosts create sessions, and 2 seats are saved for drop-ins", async () => {
    const amy = await person(t, "amy@example.com");
    await expect(
      amy.as.mutation(api.sessions.create, { title: "x", startsAt: Date.now() + HOUR_MS, blocks: BLOCKS, capacity: 8 }),
    ).rejects.toThrow(/Only hosts/);
    const id = await newSession(host);
    const s = await t.query(api.sessions.get, { sessionId: id });
    expect(s).toMatchObject({ hours: 4, memberSeats: 6, dropInSeats: 2, memberSeatsLeft: 6, dropInSeatsLeft: 2 });
  });

  it("uses included hours first, then extra, then asks for more", async () => {
    const amy = await person(t, "amy@example.com");
    const [s1, s2, s3] = [await newSession(host, 72), await newSession(host, 96), await newSession(host, 120)];

    expect(await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s1 })).toMatchObject({ booked: true });
    expect(await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s2 })).toMatchObject({ booked: true });
    expect((await member(t, amy.memberId))!.includedHoursUsed).toBe(8);

    expect(await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s3 })).toEqual({ booked: false, shortBy: 4 });

    await t.mutation(internal.payments.extraHoursPaid, { memberId: amy.memberId, hours: 4, amountCents: 4000, checkoutId: "cs_1" });
    // Stripe retries are ignored.
    await t.mutation(internal.payments.extraHoursPaid, { memberId: amy.memberId, hours: 4, amountCents: 4000, checkoutId: "cs_1" });
    expect((await member(t, amy.memberId))!.extraHours).toBe(4);

    const r = await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s3 });
    expect(r.booked).toBe(true);
    const b = await t.run((ctx) => ctx.db.get((r as { bookingId: Id<"bookings"> }).bookingId));
    expect(b).toMatchObject({ paymentType: "extra", fromExtra: 4, fromIncluded: 0 });

    // Canceling gives hours back to where they came from.
    await amy.as.mutation(api.bookings.cancel, { bookingId: b!._id });
    expect(await member(t, amy.memberId)).toMatchObject({ extraHours: 4, includedHoursUsed: 8 });
  });

  it("needs an active membership to book with hours", async () => {
    const sam = await person(t, "sam@example.com", { active: false });
    const s = await newSession(host);
    await expect(sam.as.mutation(api.bookings.bookAsMember, { sessionId: s })).rejects.toThrow(/active membership/);
  });

  it("fills a canceled seat from the waitlist, paused-priority members last", async () => {
    const s = await newSession(host);
    const seated = [];
    for (let i = 0; i < 6; i++) {
      const p = await person(t, `m${i}@example.com`);
      await p.as.mutation(api.bookings.bookAsMember, { sessionId: s });
      seated.push(p);
    }
    await expect(seated[0].as.mutation(api.bookings.bookAsMember, { sessionId: s })).rejects.toThrow(/already/);

    const paused = await person(t, "paused@example.com");
    await t.run((ctx) => ctx.db.patch(paused.memberId, { priorityPaused: true, noShowCount: 2 }));
    const broke = await person(t, "broke@example.com");
    await t.run((ctx) => ctx.db.patch(broke.memberId, { includedHoursUsed: 8 }));
    const next = await person(t, "next@example.com");

    await expect(next.as.mutation(api.bookings.bookAsMember, { sessionId: s })).rejects.toThrow(/full/);
    // Join order: paused first, then broke (no hours), then next.
    await paused.as.mutation(api.bookings.joinWaitlist, { sessionId: s });
    await broke.as.mutation(api.bookings.joinWaitlist, { sessionId: s });
    await next.as.mutation(api.bookings.joinWaitlist, { sessionId: s });

    const mine = await seated[0].as.query(api.bookings.mine, {});
    await seated[0].as.mutation(api.bookings.cancel, { bookingId: mine[0]._id });
    expect((await member(t, seated[0].memberId))!.includedHoursUsed).toBe(0);

    // "broke" is skipped (no hours) with a note; "next" gets the seat before "paused".
    const nextBookings = await next.as.query(api.bookings.mine, {});
    expect(nextBookings[0].status).toBe("confirmed");
    expect((await member(t, next.memberId))!.includedHoursUsed).toBe(4);
    expect((await paused.as.query(api.bookings.mine, {}))[0].status).toBe("waitlisted");
    expect((await broke.as.query(api.members.notices, {})).map((n) => n.kind)).toEqual(["waitlistSkipped"]);
    expect((await next.as.query(api.members.notices, {})).map((n) => n.kind)).toEqual(["waitlistPromoted"]);
  });

  it("first missed session sends a gentle note; the second pauses priority; fixing a mistake undoes it", async () => {
    const amy = await person(t, "amy@example.com");
    await t.run((ctx) => ctx.db.patch(amy.memberId, { extraHours: 8 }));
    const ids = [await newSession(host, 72), await newSession(host, 96)];
    const bookings = [];
    for (const s of ids) {
      const r = await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s });
      bookings.push((r as { bookingId: Id<"bookings"> }).bookingId);
    }
    await expect(amy.as.mutation(api.admin.markAttendance, { bookingId: bookings[0], attendance: "noShow" })).rejects.toThrow(/hosts/);

    await host.as.mutation(api.admin.markAttendance, { bookingId: bookings[0], attendance: "noShow" });
    expect(await member(t, amy.memberId)).toMatchObject({ noShowCount: 1, priorityPaused: false });
    // Marking the same thing twice doesn't count twice.
    await host.as.mutation(api.admin.markAttendance, { bookingId: bookings[0], attendance: "noShow" });
    expect((await member(t, amy.memberId))!.noShowCount).toBe(1);

    await host.as.mutation(api.admin.markAttendance, { bookingId: bookings[1], attendance: "noShow" });
    expect(await member(t, amy.memberId)).toMatchObject({ noShowCount: 2, priorityPaused: true });
    expect((await amy.as.query(api.members.notices, {})).map((n) => n.kind).sort()).toEqual(["gentleReminder", "priorityPaused"]);

    await host.as.mutation(api.admin.markAttendance, { bookingId: bookings[1], attendance: "attended" });
    expect(await member(t, amy.memberId)).toMatchObject({ noShowCount: 1, priorityPaused: false });

    await host.as.mutation(api.admin.updateMember, { memberId: amy.memberId, resetNoShows: true });
    expect((await member(t, amy.memberId))!.noShowCount).toBe(0);
  });

  it("drop-ins hold a seat while paying, confirm on payment, and free it if they don't", async () => {
    const s = await newSession(host, 24);
    const hold = (name: string, token: string) =>
      t.mutation(internal.bookings.holdDropIn, {
        sessionId: s,
        name,
        email: `${name}@example.com`,
        choice: { kind: "hourly", blockIndexes: [1, 3] },
        token,
      });

    const a = await hold("ari", "token-ari-0000000000");
    expect(a.cents).toBe(3600);
    await t.mutation(internal.bookings.setCheckout, { bookingId: a.bookingId, checkoutId: "cs_a" });
    const b = await hold("bo", "token-bo-00000000000");
    await t.mutation(internal.bookings.setCheckout, { bookingId: b.bookingId, checkoutId: "cs_b" });
    await expect(hold("cy", "token-cy-00000000000")).rejects.toThrow(/full/);

    await t.mutation(internal.payments.dropInPaid, { checkoutId: "cs_a", amountCents: 3600 });
    await t.mutation(internal.payments.dropInExpired, { checkoutId: "cs_b" });
    expect(await t.query(api.sessions.get, { sessionId: s })).toMatchObject({ dropInSeatsLeft: 1 });

    // Paid within 48h, so the goals form opens right away, for just their blocks.
    const view = await t.query(api.bookings.byToken, { token: "token-ari-0000000000" });
    expect(view).toMatchObject({ status: "confirmed", goalsOpen: true, goalsNudge: true });
    expect(view!.goalBlocks.map((g) => g.category)).toEqual(["Business", "Clean"]);

    await t.mutation(api.bookings.saveGoals, {
      token: "token-ari-0000000000",
      answers: [
        { blockIndex: 1, goal: "Send 3 invoices" },
        { blockIndex: 2, goal: "not my block" },
        { blockIndex: 3, goal: "Laundry" },
      ],
    });
    const roster = await host.as.query(api.admin.roster, { sessionId: s });
    expect(roster!.seated[0].goals.map((g) => g.goal)).toEqual(["Send 3 invoices", "Laundry"]);
    await expect(t.mutation(api.bookings.saveGoals, { token: "nope-nope-nope-nope", answers: [] })).rejects.toThrow(/couldn't find/);
  });

  it("renewal resets included hours once per cycle", async () => {
    const amy = await person(t, "amy@example.com");
    await t.run((ctx) => ctx.db.patch(amy.memberId, { includedHoursUsed: 8 }));
    const paid = (start: number, invoiceId: string) =>
      t.mutation(internal.payments.membershipPaid, {
        memberId: amy.memberId,
        customerId: "cus_1",
        subscriptionId: "sub_1",
        periodStart: start,
        periodEnd: start + 30 * 24 * HOUR_MS,
        amountCents: 5000,
        invoiceId,
      });
    await paid(1000, "in_1");
    expect((await member(t, amy.memberId))!.includedHoursUsed).toBe(0);
    await t.run((ctx) => ctx.db.patch(amy.memberId, { includedHoursUsed: 4 }));
    await paid(1000, "in_1"); // retry of the same invoice
    expect((await member(t, amy.memberId))!.includedHoursUsed).toBe(4);

    await t.mutation(internal.payments.subscriptionStatus, { subscriptionId: "sub_1", status: "canceled" });
    expect((await member(t, amy.memberId))!.membership).toBe("canceled");
    const me = await amy.as.query(api.members.me, {});
    expect(me).toMatchObject({ includedLeft: 0 });
    expect(me).not.toHaveProperty("scholarship");
  });

  it("sends goals forms 48 hours ahead", async () => {
    const amy = await person(t, "amy@example.com");
    const s = await newSession(host, 72);
    await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s });
    await t.mutation(internal.upkeep.tick, {});
    expect(await amy.as.query(api.members.notices, {})).toEqual([]);

    await t.run((ctx) => ctx.db.patch(s, { startsAt: Date.now() + 40 * HOUR_MS }));
    await t.mutation(internal.upkeep.tick, {});
    await t.mutation(internal.upkeep.tick, {});
    expect((await amy.as.query(api.members.notices, {})).map((n) => n.kind)).toEqual(["goals"]);
  });

  it("hosts can comp a seat, which uses a member seat", async () => {
    const s = await newSession(host);
    const token = await host.as.mutation(api.admin.compSeat, { sessionId: s, guestName: "Riley" });
    expect(typeof token).toBe("string");
    expect(await t.query(api.sessions.get, { sessionId: s })).toMatchObject({ memberSeatsLeft: 5, dropInSeatsLeft: 2 });
  });

  it("canceling a session returns member hours and lists drop-ins to refund", async () => {
    const amy = await person(t, "amy@example.com");
    const s = await newSession(host);
    await amy.as.mutation(api.bookings.bookAsMember, { sessionId: s });
    const d = await t.mutation(internal.bookings.holdDropIn, {
      sessionId: s,
      name: "Dee",
      email: "dee@example.com",
      choice: { kind: "full" },
      token: "token-dee-0000000000",
    });
    await t.mutation(internal.bookings.setCheckout, { bookingId: d.bookingId, checkoutId: "cs_d" });
    await t.mutation(internal.payments.dropInPaid, { checkoutId: "cs_d", amountCents: 7000 });

    const r = await host.as.mutation(api.sessions.cancel, { sessionId: s });
    expect(r.dropInsToRefund).toEqual([{ name: "Dee", email: "dee@example.com", amountCents: 7000 }]);
    expect((await member(t, amy.memberId))!.includedHoursUsed).toBe(0);
    expect(await t.query(api.sessions.upcoming, {})).toEqual([]);
  });
});
