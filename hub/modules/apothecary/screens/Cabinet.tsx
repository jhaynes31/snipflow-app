"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

const KINDS = ["herb", "tincture", "supplement", "topical", "tool", "medication"] as const;
type Kind = (typeof KINDS)[number];

/** The cabinet: what's on the shelf, so "what to try" reaches for what's in the house first. */
export function Cabinet() {
  const rows = useQuery(api.apothecary.entries.cabinet);
  const add = useMutation(api.apothecary.entries.addToCabinet);
  const remove = useMutation(api.apothecary.entries.removeFromCabinet);
  const { busy, error, run } = useAction();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("herb");
  const [forWhat, setForWhat] = useState("");
  const [amount, setAmount] = useState("");
  if (!rows) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The cabinet" subtitle="What you have. Tinctures, herbs, supplements, salves, tools, medications." />
      <Card>
        <Field label="Name"><input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
        <div className="sh-chips">{KINDS.map((k) => <button key={k} type="button" className="sh-chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{k}</button>)}</div>
        <Field label="What for (optional)"><input className="sh-input" value={forWhat} onChange={(e) => setForWhat(e.target.value)} maxLength={200} /></Field>
        <Field label="How much you take (optional)"><input className="sh-input" value={amount} onChange={(e) => setAmount(e.target.value)} maxLength={80} /></Field>
        <ErrorNote error={error} />
        <Btn disabled={busy || !name.trim()} onClick={() => void run(async () => { await add({ name, kind, forWhat: forWhat || undefined, amount: amount || undefined }); setName(""); setForWhat(""); setAmount(""); })}>Put it on the shelf</Btn>
      </Card>
      <Card>
        {rows.length === 0 && <p className="sh-muted">Empty shelf. Add what you already reach for.</p>}
        {rows.map((r) => (
          <div key={r._id} className="ap-entry">
            <p><strong>{r.name}</strong> <span className="sh-muted">· {r.kind}{r.forWhat ? ` · ${r.forWhat}` : ""}{r.amount ? ` · ${r.amount}` : ""}</span></p>
            <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Remove</Btn>
          </div>
        ))}
      </Card>
      <Note>The coach sees this list when you Ask, and reaches for it first. Medications matter here too, for interactions.</Note>
    </div>
  );
}
