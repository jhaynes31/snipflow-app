"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AVOID, REBUILDING, RESOURCES } from "@/core/storehouse/lifeboat";
import { Btn, Card, ErrorNote, PageTitle, useAction } from "@/core/ui";

/** The Lifeboat: hardship and get-out-of-debt support. Not bankruptcy. */
export function Lifeboat() {
  const logCall = useMutation(api.storehouse.money.logCall);
  const { busy, error, run } = useAction();
  const [logging, setLogging] = useState<string | null>(null);
  const [call, setCall] = useState({ who: "", offered: "", accepted: "" });
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Lifeboat" subtitle="Support that doesn't depend on a credit score. What each one is, who it's for, and what to say on the phone. Confirm details when you call; programs change." />
      {RESOURCES.map((r) => (
        <Card key={r.key}>
          <h2 className="sh-h2">{r.title}</h2>
          <p><strong>Who:</strong> {r.who}</p>
          <p><strong>What:</strong> {r.what}</p>
          <p><strong>How:</strong> {r.how}</p>
          {r.contact && <p><strong>Contact:</strong> {r.contact}</p>}
          {r.script && <p className="sh-quote">&ldquo;{r.script}&rdquo;</p>}
          <div className="sh-choices mt-3">
            <Btn variant="secondary" onClick={() => setLogging(logging === r.key ? null : r.key)}>Log a call about this</Btn>
            <Link href="/kept-word" className="sh-link">Make the call a word in Kept Word</Link>
          </div>
          {logging === r.key && (
            <div className="sh-row sh-wrap mt-3">
              <input className="sh-input" value={call.who} onChange={(e) => setCall({ ...call, who: e.target.value })} maxLength={120} placeholder="Who you spoke to" aria-label="Who" />
              <input className="sh-input" value={call.offered} onChange={(e) => setCall({ ...call, offered: e.target.value })} maxLength={400} placeholder="What they said" aria-label="Offered" />
              <input className="sh-input" value={call.accepted} onChange={(e) => setCall({ ...call, accepted: e.target.value })} maxLength={400} placeholder="What you decided" aria-label="Accepted" />
              <Btn disabled={busy || !call.who.trim()} onClick={() => void run(async () => { await logCall({ who: `${r.title}: ${call.who}`, offered: call.offered || undefined, accepted: call.accepted || undefined }); setCall({ who: "", offered: "", accepted: "" }); setLogging(null); })}>Save</Btn>
            </div>
          )}
          <ErrorNote error={error} />
        </Card>
      ))}
      <Card tone="alt">
        <h2 className="sh-h2">What to avoid</h2>
        <ul className="sh-list">{AVOID.map((a) => <li key={a} className="st-entry">{a}</li>)}</ul>
      </Card>
      <Card>
        <h2 className="sh-h2">Rebuilding credit</h2>
        <p className="sh-muted">Slow, boring, and it works. Twelve to twenty-four months.</p>
        <ol className="sh-list">{REBUILDING.map((r) => <li key={r} className="st-entry">{r}</li>)}</ol>
      </Card>
    </div>
  );
}
