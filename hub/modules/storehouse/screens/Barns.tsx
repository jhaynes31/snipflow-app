"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { money } from "@/convex/storehouse/pure";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";

const IDEAS = ["Car repair", "Christmas", "Vet", "Insurance renewal", "Birthdays", "Home repair", "Medical"];

/** The Barns: the things that aren't monthly but always come. */
export function Barns() {
  const rows = useQuery(api.storehouse.money.barns);
  const add = useMutation(api.storehouse.money.addBarn);
  const set = useMutation(api.storehouse.money.setBarn);
  const remove = useMutation(api.storehouse.money.removeBarn);
  const { busy, error, run } = useAction();
  const [form, setForm] = useState({ name: "", target: "", balance: "", monthly: "" });
  if (!rows) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Barns" subtitle="Joseph filled the storehouses before the famine. A little set aside each month so the car, Christmas, and the vet stop being emergencies." />
      <Card>
        <div className="sh-chips">{IDEAS.map((i) => <button key={i} type="button" className="sh-chip" onClick={() => setForm({ ...form, name: i })}>{i}</button>)}</div>
        <div className="sh-row sh-wrap mt-3">
          <input className="sh-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={60} placeholder="Barn" aria-label="Name" />
          <input className="sh-input sh-input-sm" type="number" min={0} value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} placeholder="In it now" aria-label="Balance" />
          <input className="sh-input sh-input-sm" type="number" min={0} value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} placeholder="Monthly" aria-label="Monthly" />
          <input className="sh-input sh-input-sm" type="number" min={0} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="Target (optional)" aria-label="Target" />
          <Btn disabled={busy || !form.name.trim()} onClick={() => void run(async () => { await add({ name: form.name, balance: Number(form.balance || 0), monthly: Number(form.monthly || 0), target: form.target ? Number(form.target) : undefined }); setForm({ name: "", target: "", balance: "", monthly: "" }); })}>Add</Btn>
        </div>
        <ErrorNote error={error} />
        <p className="sh-hint">The monthly amount becomes a line in each new month&apos;s plan.</p>
      </Card>
      <Card>
        {rows.length === 0 && <p className="sh-muted">No barns yet.</p>}
        {rows.map((b) => (
          <div key={b._id} className="st-entry">
            <p><strong>{b.name}</strong> · {money(b.balance)} in it{b.target ? ` of ${money(b.target)}` : ""} · {money(b.monthly)} a month</p>
            <div className="sh-row sh-wrap">
              <label className="sh-label">In it now <input className="sh-input sh-input-sm" type="number" min={0} defaultValue={b.balance} onBlur={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== b.balance) void run(() => set({ id: b._id, balance: n })); }} aria-label="Balance" /></label>
              <label className="sh-label">Monthly <input className="sh-input sh-input-sm" type="number" min={0} defaultValue={b.monthly} onBlur={(e) => { const n = Number(e.target.value); if (Number.isFinite(n) && n !== b.monthly) void run(() => set({ id: b._id, monthly: n })); }} aria-label="Monthly" /></label>
              <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: b._id }))}>Remove</button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
