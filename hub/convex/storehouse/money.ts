import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "../_generated/server";
import { emitEvent } from "../events";
import { access, cleanText, optionalText, requireMe, requireOwned } from "../lib";
import { allocate, compare, GROUP_ORDER, monthKeyOf, simulate, STARTER_LINES, type DebtIn, type Strategy } from "./pure";

/**
 * The Storehouse. Household money is shared by nature: either person can
 * add or change anything here, and both see the same numbers. Only money
 * worries are private. No row is ever hidden from the other person.
 */

const group = v.union(v.literal("giving"), v.literal("needs"), v.literal("debt"), v.literal("barns"), v.literal("savings"), v.literal("fun"), v.literal("buffer"));
const kind = v.union(v.literal("card"), v.literal("personal"), v.literal("auto"), v.literal("medical"), v.literal("student"), v.literal("other"));
const strategy = v.union(v.literal("snowball"), v.literal("avalanche"), v.literal("blend"), v.literal("dmp"));

function amount(n: number, label: string, allowZero = true): number {
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw new ConvexError(`${label} needs to be a number, zero or more.`);
  return Math.round(n * 100) / 100;
}

function monthOf(input: string | undefined): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return monthKeyOf(new Date());
}

async function settingsRow(ctx: QueryCtx | MutationCtx): Promise<Doc<"shSettings"> | null> {
  return await ctx.db.query("shSettings").first();
}

async function ensureSettings(ctx: MutationCtx): Promise<Doc<"shSettings">> {
  const row = await settingsRow(ctx);
  if (row) return row;
  const id = await ctx.db.insert("shSettings", { strategy: "blend", extraMonthly: 0, giving: true, pauseAmount: 200, updatedAt: Date.now() });
  return (await ctx.db.get(id))!;
}

// Settings

export const settings = query({
  args: {},
  handler: async (ctx) => {
    await requireMe(ctx);
    const row = await settingsRow(ctx);
    return row ?? { strategy: "blend" as Strategy, extraMonthly: 0, giving: true, pauseAmount: 200 };
  },
});

export const setSettings = mutation({
  args: { strategy: v.optional(strategy), extraMonthly: v.optional(v.number()), giving: v.optional(v.boolean()), pauseAmount: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const row = await ensureSettings(ctx);
    await ctx.db.patch(row._id, {
      strategy: args.strategy ?? row.strategy,
      extraMonthly: args.extraMonthly === undefined ? row.extraMonthly : amount(args.extraMonthly, "Extra toward debt"),
      giving: args.giving ?? row.giving,
      pauseAmount: args.pauseAmount === undefined ? row.pauseAmount : amount(args.pauseAmount, "Pause amount"),
      updatedAt: Date.now(),
    });
  },
});

// Debts

export const debts = query({
  args: {},
  handler: async (ctx) => {
    await requireMe(ctx);
    const rows = await ctx.db.query("shDebts").collect();
    const calls = await ctx.db.query("shCalls").collect();
    return rows
      .sort((a, b) => (a.status === b.status ? a.balance - b.balance : a.status === "open" ? -1 : 1))
      .map((d) => ({ ...d, calls: calls.filter((c) => c.debtId === d._id).sort((a, b) => b.at - a.at) }));
  },
});

export const addDebt = mutation({
  args: { name: v.string(), kind, lender: v.optional(v.string()), balance: v.number(), apr: v.number(), minimum: v.number(), dueDay: v.optional(v.number()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    if (args.dueDay !== undefined && (args.dueDay < 1 || args.dueDay > 31)) throw new ConvexError("Due day is 1 to 31.");
    const now = Date.now();
    return await ctx.db.insert("shDebts", {
      ownerId: me.profile._id,
      visibility: "shared",
      name: cleanText(args.name, 80, "Name"),
      kind: args.kind,
      lender: optionalText(args.lender, 80, "Lender"),
      balance: amount(args.balance, "Balance"),
      apr: amount(args.apr, "Interest rate"),
      minimum: amount(args.minimum, "Minimum payment"),
      dueDay: args.dueDay,
      status: "open",
      hardship: "none",
      note: optionalText(args.note, 300, "Note"),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateDebt = mutation({
  args: { id: v.id("shDebts"), balance: v.optional(v.number()), apr: v.optional(v.number()), minimum: v.optional(v.number()), dueDay: v.optional(v.number()), hardship: v.optional(v.union(v.literal("none"), v.literal("asked"), v.literal("enrolled"), v.literal("declined"))), note: v.optional(v.string()), status: v.optional(v.union(v.literal("open"), v.literal("paid"))) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const d = await ctx.db.get(args.id);
    if (!d) throw new ConvexError("That debt isn't here.");
    const patch: Partial<Doc<"shDebts">> = { updatedAt: Date.now() };
    if (args.balance !== undefined) patch.balance = amount(args.balance, "Balance");
    if (args.apr !== undefined) patch.apr = amount(args.apr, "Interest rate");
    if (args.minimum !== undefined) patch.minimum = amount(args.minimum, "Minimum payment");
    if (args.dueDay !== undefined) patch.dueDay = args.dueDay;
    if (args.hardship !== undefined) patch.hardship = args.hardship;
    if (args.note !== undefined) patch.note = optionalText(args.note, 300, "Note");
    if (args.status !== undefined) {
      patch.status = args.status;
      patch.paidAt = args.status === "paid" ? Date.now() : undefined;
      if (args.status === "paid") {
        patch.balance = 0;
        await emitEvent(ctx, { ownerId: me.profile._id, source: "storehouse", name: "debt.paid", payload: { name: d.name }, visibility: "shared" });
      }
    }
    await ctx.db.patch(d._id, patch);
  },
});

export const removeDebt = mutation({
  args: { id: v.id("shDebts") },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const d = await ctx.db.get(args.id);
    if (!d) return;
    for (const c of await ctx.db.query("shCalls").withIndex("by_debt", (q) => q.eq("debtId", d._id)).collect()) await ctx.db.delete(c._id);
    await ctx.db.delete(d._id);
  },
});

export const logCall = mutation({
  args: { debtId: v.optional(v.id("shDebts")), who: v.string(), offered: v.optional(v.string()), accepted: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("shCalls", { ownerId: me.profile._id, visibility: "shared", debtId: args.debtId, who: cleanText(args.who, 120, "Who you spoke to"), offered: optionalText(args.offered, 400, "What they offered"), accepted: optionalText(args.accepted, 400, "What you accepted"), note: optionalText(args.note, 400, "Note"), at: Date.now() });
  },
});

/** The four strategies compared, for the open debts, at a given extra. */
export const comparison = query({
  args: { extraMonthly: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const s = await settingsRow(ctx);
    const extra = args.extraMonthly ?? s?.extraMonthly ?? 0;
    const open = (await ctx.db.query("shDebts").withIndex("by_status", (q) => q.eq("status", "open")).collect()).filter((d) => d.balance > 0);
    const input: DebtIn[] = open.map((d) => ({ id: d._id, name: d.name, balance: d.balance, apr: d.apr, minimum: d.minimum, kind: d.kind }));
    return { month: monthKeyOf(new Date()), extra, chosen: s?.strategy ?? "blend", schedules: input.length ? compare(input, extra) : [], totalBalance: open.reduce((t, d) => t + d.balance, 0), totalMinimums: open.reduce((t, d) => t + d.minimum, 0) };
  },
});

// The month: income and lines

export const month = query({
  args: { month: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = monthOf(args.month);
    const income = await ctx.db.query("shIncome").withIndex("by_month", (q) => q.eq("month", key)).collect();
    const lines = await ctx.db.query("shLines").withIndex("by_month", (q) => q.eq("month", key)).collect();
    const sitDown = await ctx.db.query("shSitDowns").withIndex("by_month", (q) => q.eq("month", key)).first();
    const barns = await ctx.db.query("shBarns").collect();
    const s = await settingsRow(ctx);
    const incomeTotal = income.reduce((t, i) => t + i.amount, 0);
    const planned = lines.reduce((t, l) => t + l.planned, 0);
    return {
      month: key,
      income: income.sort((a, b) => (a.expectedDay ?? 99) - (b.expectedDay ?? 99)),
      lines: lines.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.order - b.order),
      sitDown,
      barnsMonthly: barns.reduce((t, b) => t + b.monthly, 0),
      allocation: allocate(incomeTotal, planned),
      settings: s ?? { strategy: "blend" as Strategy, extraMonthly: 0, giving: true, pauseAmount: 200 },
      me: me.profile._id,
      partnerName: me.partner?.displayName ?? null,
    };
  },
});

export const addIncome = mutation({
  args: { month: v.optional(v.string()), label: v.string(), amount: v.number(), expectedDay: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("shIncome", { ownerId: me.profile._id, visibility: "shared", month: monthOf(args.month), label: cleanText(args.label, 80, "Label"), amount: amount(args.amount, "Amount"), expectedDay: args.expectedDay, createdAt: Date.now() });
  },
});

export const removeIncome = mutation({
  args: { id: v.id("shIncome") },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const r = await ctx.db.get(args.id);
    if (r) await ctx.db.delete(r._id);
  },
});

/** Start a month's plan: starter lines, the Barns line, and a line per open debt at its minimum plus the extra per the strategy. */
export const startMonth = mutation({
  args: { month: v.optional(v.string()), copyFrom: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = monthOf(args.month);
    const existing = await ctx.db.query("shLines").withIndex("by_month", (q) => q.eq("month", key)).collect();
    if (existing.length > 0) throw new ConvexError("This month already has a plan. Edit the lines instead.");
    const s = await ensureSettings(ctx);
    const prev = args.copyFrom ? await ctx.db.query("shLines").withIndex("by_month", (q) => q.eq("month", args.copyFrom!)).collect() : [];
    let order = 0;
    const base = prev.length ? prev.filter((l) => l.group !== "debt" && l.group !== "barns").map((l) => ({ group: l.group, category: l.category, planned: l.planned })) : STARTER_LINES.filter((l) => s.giving || l.group !== "giving").map((l) => ({ ...l, planned: 0 }));
    for (const l of base) await ctx.db.insert("shLines", { ownerId: me.profile._id, visibility: "shared", month: key, group: l.group, category: l.category, planned: l.planned, order: order++ });
    const barns = await ctx.db.query("shBarns").collect();
    for (const b of barns) if (b.monthly > 0) await ctx.db.insert("shLines", { ownerId: me.profile._id, visibility: "shared", month: key, group: "barns", category: b.name, planned: b.monthly, order: order++ });
    const open = (await ctx.db.query("shDebts").withIndex("by_status", (q) => q.eq("status", "open")).collect()).filter((d) => d.balance > 0);
    if (open.length) {
      const sched = simulate(open.map((d) => ({ id: d._id, name: d.name, balance: d.balance, apr: d.apr, minimum: d.minimum, kind: d.kind })), s.extraMonthly, s.strategy);
      const first = sched.debts.slice().sort((a, b) => a.paidMonth - b.paidMonth)[0];
      for (const d of open) {
        const extra = first && first.id === d._id ? s.extraMonthly : 0;
        await ctx.db.insert("shLines", { ownerId: me.profile._id, visibility: "shared", month: key, group: "debt", category: d.name, planned: Math.min(d.balance, d.minimum + extra), debtId: d._id, order: order++ });
      }
    }
    const sit = await ctx.db.query("shSitDowns").withIndex("by_month", (q) => q.eq("month", key)).first();
    if (!sit) await ctx.db.insert("shSitDowns", { ownerId: me.profile._id, visibility: "shared", month: key, agreedBy: [], createdAt: Date.now(), updatedAt: Date.now() });
  },
});

export const addLine = mutation({
  args: { month: v.optional(v.string()), group, category: v.string(), planned: v.number() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = monthOf(args.month);
    const count = (await ctx.db.query("shLines").withIndex("by_month", (q) => q.eq("month", key)).collect()).length;
    return await ctx.db.insert("shLines", { ownerId: me.profile._id, visibility: "shared", month: key, group: args.group, category: cleanText(args.category, 60, "Category"), planned: amount(args.planned, "Planned"), order: count });
  },
});

export const setLine = mutation({
  args: { id: v.id("shLines"), planned: v.optional(v.number()), category: v.optional(v.string()), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const l = await ctx.db.get(args.id);
    if (!l) throw new ConvexError("That line isn't here.");
    await ctx.db.patch(l._id, { planned: args.planned === undefined ? l.planned : amount(args.planned, "Planned"), category: args.category === undefined ? l.category : cleanText(args.category, 60, "Category"), note: args.note === undefined ? l.note : optionalText(args.note, 200, "Note") });
  },
});

export const removeLine = mutation({
  args: { id: v.id("shLines") },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const l = await ctx.db.get(args.id);
    if (l) await ctx.db.delete(l._id);
  },
});

// The Sit-Down

export const sitDown = mutation({
  args: { month: v.optional(v.string()), lastMonthLine: v.optional(v.string()), agree: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const key = monthOf(args.month);
    let row = await ctx.db.query("shSitDowns").withIndex("by_month", (q) => q.eq("month", key)).first();
    if (!row) {
      const id = await ctx.db.insert("shSitDowns", { ownerId: me.profile._id, visibility: "shared", month: key, agreedBy: [], createdAt: Date.now(), updatedAt: Date.now() });
      row = (await ctx.db.get(id))!;
    }
    const agreedBy = new Set<Id<"profiles">>(row.agreedBy);
    if (args.agree === true) agreedBy.add(me.profile._id);
    if (args.agree === false) agreedBy.delete(me.profile._id);
    await ctx.db.patch(row._id, { lastMonthLine: args.lastMonthLine === undefined ? row.lastMonthLine : optionalText(args.lastMonthLine, 400, "Last month"), agreedBy: [...agreedBy], updatedAt: Date.now() });
    if (args.agree === true && agreedBy.size >= 2) {
      await emitEvent(ctx, { ownerId: me.profile._id, source: "storehouse", name: "sitDown.agreed", payload: { month: key }, visibility: "shared" });
    }
  },
});

// The Barns

export const barns = query({
  args: {},
  handler: async (ctx) => {
    await requireMe(ctx);
    return await ctx.db.query("shBarns").collect();
  },
});

export const addBarn = mutation({
  args: { name: v.string(), target: v.optional(v.number()), balance: v.number(), monthly: v.number() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("shBarns", { ownerId: me.profile._id, visibility: "shared", name: cleanText(args.name, 60, "Name"), target: args.target === undefined ? undefined : amount(args.target, "Target"), balance: amount(args.balance, "Balance"), monthly: amount(args.monthly, "Monthly"), createdAt: Date.now() });
  },
});

export const setBarn = mutation({
  args: { id: v.id("shBarns"), balance: v.optional(v.number()), monthly: v.optional(v.number()), target: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const b = await ctx.db.get(args.id);
    if (!b) throw new ConvexError("That barn isn't here.");
    await ctx.db.patch(b._id, { balance: args.balance === undefined ? b.balance : amount(args.balance, "Balance"), monthly: args.monthly === undefined ? b.monthly : amount(args.monthly, "Monthly"), target: args.target === undefined ? b.target : amount(args.target, "Target") });
  },
});

export const removeBarn = mutation({
  args: { id: v.id("shBarns") },
  handler: async (ctx, args) => {
    await requireMe(ctx);
    const b = await ctx.db.get(args.id);
    if (b) await ctx.db.delete(b._id);
  },
});

// Money worries

export const worries = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireMe(ctx);
    const mine = await ctx.db.query("shWorries").withIndex("by_owner_time", (q) => q.eq("ownerId", me.profile._id)).order("desc").take(30);
    const theirs = me.partner ? (await ctx.db.query("shWorries").withIndex("by_owner_time", (q) => q.eq("ownerId", me.partner!._id)).order("desc").take(30)).filter((w) => access(me, w) === "full") : [];
    return { mine, theirs };
  },
});

export const addWorry = mutation({
  args: { text: v.string(), share: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    return await ctx.db.insert("shWorries", { ownerId: me.profile._id, visibility: args.share ? "shared" : "private", text: cleanText(args.text, 1000, "The worry"), createdAt: Date.now() });
  },
});

export const shareWorry = mutation({
  args: { id: v.id("shWorries"), share: v.boolean() },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const w = await requireOwned(ctx, me, "shWorries", args.id);
    await ctx.db.patch(w._id, { visibility: args.share ? "shared" : "private" });
  },
});

export const removeWorry = mutation({
  args: { id: v.id("shWorries") },
  handler: async (ctx, args) => {
    const me = await requireMe(ctx);
    const w = await requireOwned(ctx, me, "shWorries", args.id);
    await ctx.db.delete(w._id);
  },
});

/** Due days for the calendar feed: any open debt with a due day. Called by calendar.ts. */
export async function billsForCalendar(ctx: { db: QueryCtx["db"] }): Promise<{ id: string; name: string; dueDay: number; minimum: number }[]> {
  const open = await ctx.db.query("shDebts").withIndex("by_status", (q) => q.eq("status", "open")).collect();
  return open.filter((d) => d.dueDay).map((d) => ({ id: d._id, name: d.name, dueDay: d.dueDay!, minimum: d.minimum }));
}
