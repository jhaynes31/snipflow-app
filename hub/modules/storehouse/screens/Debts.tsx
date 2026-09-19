"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { describe, money, monthLabel, STRATEGY_LABEL, STRATEGY_NOTE, type Strategy } from "@/convex/storehouse/pure";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const KINDS = [["card", "Credit card"], ["personal", "Personal loan"], ["auto", "Car"], ["medical", "Medical"], ["student", "Student"], ["other", "Other"]] as const;
const HARDSHIP = [["none", "Not asked yet"], ["asked", "Asked"], ["enrolled", "In a program"], ["declined", "They said no"]] as const;

/** Debts: all of them, as facts, and the four strategies compared in sentences. */
export function Debts() {
  const debts = useQuery(api.storehouse.money.debts);
  const settings = useQuery(api.storehouse.money.settings);
  const [extra, setExtra] = useState<number | null>(null);
  const cmp = useQuery(api.storehouse.money.comparison, extra === null ? {} : { extraMonthly: extra });
  const add = useMutation(api.storehouse.money.addDebt);
  const update = useMutation(api.storehouse.money.updateDebt);
  const remove = useMutation(api.storehouse.money.removeDebt);
  const logCall = useMutation(api.storehouse.money.logCall);
  const setSettings = useMutation(api.storehouse.money.setSettings);
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ name: "", kind: "card" as (typeof KINDS)[number][0], lender: "", balance: "", apr: "", minimum: "", dueDay: "" });
  const [callFor, setCallFor] = useState<string | null>(null);
  const [call, setCall] = useState({ who: "", offered: "", accepted: "" });
  if (!debts || !settings || !cmp) return <Spinner />;
  const open = debts.filter((d) => d.status === "open");
  const paid = debts.filter((d) => d.status === "paid");
  const currentExtra = extra ?? settings.extraMonthly;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Debts" subtitle="Every one, as a fact. Then the math, done for you, as dates and dollars. Nobody here is the money police." />
      {open.length > 0 && (
        <Card className="st-truth">
          <p className="st-total">{money(cmp.totalBalance)} across {open.length} {open.length === 1 ? "debt" : "debts"} · {money(cmp.totalMinimums)} a month in minimums</p>
        </Card>
      )}
      <Card>
        <h2 className="sh-h2">Add a debt</h2>
        <div className="sh-row sh-wrap">
          <input className="sh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} placeholder="Name (Visa, car, hospital)" aria-label="Name" />
          <select className="sh-input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as typeof form.kind })} aria-label="Kind">
            {KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className="sh-input" value={form.lender} onChange={(e) => setForm({ ...form, lender: e.target.value })} maxLength={80} placeholder="Lender (optional)" aria-label="Lender" />
        </div>
        <div className="sh-row sh-wrap mt-3">
          <input className="sh-input sh-input-sm" type="number" min={0} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="Balance" aria-label="Balance" />
          <input className="sh-input sh-input-sm" type="number" min={0} step={0.01} value={form.apr} onChange={(e) => setForm({ ...form, apr: e.target.value })} placeholder="Rate %" aria-label="Interest rate" />
          <input className="sh-input sh-input-sm" type="number" min={0} value={form.minimum} onChange={(e) => setForm({ ...form, minimum: e.target.value })} placeholder="Minimum" aria-label="Minimum payment" />
          <input className="sh-input sh-input-sm" type="number" min={1} max={31} value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} placeholder="Due day" aria-label="Due day" />
          <Btn disabled={busy || !form.name.trim() || !form.balance || !form.apr || !form.minimum} onClick={() => void run(async () => { await add({ name: form.name, kind: form.kind, lender: form.lender || undefined, balance: Number(form.balance), apr: Number(form.apr), minimum: Number(form.minimum), dueDay: form.dueDay ? Number(form.dueDay) : undefined }); setForm({ name: "", kind: "card", lender: "", balance: "", apr: "", minimum: "", dueDay: "" }); })}>Add</Btn>
        </div>
        <ErrorNote error={error} />
        <p className="sh-hint">A due day puts the bill on your calendar feed with a reminder two days before.</p>
      </Card>

      {open.length > 0 && (
        <Card>
          <h2 className="sh-h2">The strategy</h2>
          <Field label={`Extra toward debt each month, beyond the minimums: ${money(currentExtra)}`} hint="Slide it and watch Freedom Day move. Then choose the order you'll follow.">
            <input type="range" min={0} max={2000} step={25} value={currentExtra} onChange={(e) => setExtra(Number(e.target.value))} className="tend-range" aria-label="Extra toward debt" />
          </Field>
          {cmp.schedules.map((s) => (
            <div key={s.strategy} className="st-entry">
              <p><strong>{STRATEGY_LABEL[s.strategy]}</strong>{settings.strategy === s.strategy ? <span className="sh-muted"> · chosen</span> : null}</p>
              <p>{describe(s, cmp.month)}</p>
              <p className="sh-hint">{STRATEGY_NOTE[s.strategy]}</p>
              {!s.stuck && <p className="sh-hint">Order: {s.debts.slice().sort((a, b) => a.paidMonth - b.paidMonth).map((d) => `${d.name} (${monthLabel(cmp.month, d.paidMonth)})`).join(", ")}</p>}
              {settings.strategy !== s.strategy && <Btn variant="secondary" disabled={busy} onClick={() => void run(() => setSettings({ strategy: s.strategy as Strategy, extraMonthly: currentExtra }))}>Follow this one</Btn>}
            </div>
          ))}
          {extra !== null && extra !== settings.extraMonthly && (
            <div className="sh-row mt-3">
              <Btn disabled={busy} onClick={() => void run(async () => { await setSettings({ extraMonthly: extra }); setExtra(null); })}>Keep {money(extra)} as our extra</Btn>
            </div>
          )}
          {cmp.schedules.some((s) => s.stuck) && <p className="sh-hint">One or more minimums don&apos;t cover the interest. That&apos;s what <Link href="/storehouse/lifeboat" className="sh-link">The Lifeboat</Link> is for.</p>}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Open</h2>
        {open.length === 0 && <p className="sh-muted">None entered yet.</p>}
        {open.map((d) => (
          <div key={d._id} className="st-entry">
            <p><strong>{d.name}</strong> <span className="sh-muted">· {KINDS.find((k) => k[0] === d.kind)?.[1]}{d.lender ? ` · ${d.lender}` : ""}{d.dueDay ? ` · due the ${d.dueDay}th` : ""}</span></p>
            <p>{money(d.balance)} at {d.apr}% · minimum {money(d.minimum)}</p>
            <div className="sh-row sh-wrap">
              <label className="sh-label">Balance now <input className="sh-input sh-input-sm" type="number" min={0} defaultValue={d.balance} onBlur={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== d.balance) void run(() => update({ id: d._id, balance: n })); }} aria-label="Balance now" /></label>
              <select className="sh-input" value={d.hardship} onChange={(e) => void run(() => update({ id: d._id, hardship: e.target.value as typeof d.hardship }))} aria-label="Hardship program">
                {HARDSHIP.map(([k, l]) => <option key={k} value={k}>Hardship: {l}</option>)}
              </select>
              <Btn variant="secondary" disabled={busy} onClick={() => setCallFor(callFor === d._id ? null : d._id)}>Log a call</Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => update({ id: d._id, status: "paid" }))}>Paid off</Btn>
              <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: d._id }))}>Remove</button>
            </div>
            {callFor === d._id && (
              <div className="sh-row sh-wrap mt-3">
                <input className="sh-input" value={call.who} onChange={(e) => setCall({ ...call, who: e.target.value })} maxLength={120} placeholder="Who you spoke to" aria-label="Who" />
                <input className="sh-input" value={call.offered} onChange={(e) => setCall({ ...call, offered: e.target.value })} maxLength={400} placeholder="What they offered" aria-label="Offered" />
                <input className="sh-input" value={call.accepted} onChange={(e) => setCall({ ...call, accepted: e.target.value })} maxLength={400} placeholder="What you accepted" aria-label="Accepted" />
                <Btn disabled={busy || !call.who.trim()} onClick={() => void run(async () => { await logCall({ debtId: d._id, who: call.who, offered: call.offered || undefined, accepted: call.accepted || undefined }); setCall({ who: "", offered: "", accepted: "" }); setCallFor(null); })}>Save the call</Btn>
              </div>
            )}
            {d.calls.length > 0 && (
              <ul className="sh-list sh-hint mt-3">
                {d.calls.map((c) => <li key={c._id}>{timeAgo(c.at)}: {c.who}{c.offered ? ` offered ${c.offered}` : ""}{c.accepted ? `; accepted ${c.accepted}` : ""}</li>)}
              </ul>
            )}
          </div>
        ))}
      </Card>
      {paid.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Gone</h2>
          {paid.map((d) => <p key={d._id} className="st-entry">{d.name} <span className="sh-muted">· paid off {d.paidAt ? timeAgo(d.paidAt) : ""}</span></p>)}
          <Note>Each of these was a whole thing. They&apos;re gone.</Note>
        </Card>
      )}
    </div>
  );
}
