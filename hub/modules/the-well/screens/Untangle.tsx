"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { parseRef, refHref } from "@/core/well/refs";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * Untangle: two columns. What I was taught, and what Jesus actually did.
 * You write the first; the Gospels and the coach help with the second. No
 * one grades it.
 */
export function Untangle() {
  const rows = useQuery(api.well.entries.untangle);
  const add = useMutation(api.well.entries.addUntangle);
  const { busy, error, run } = useAction();
  const [taught, setTaught] = useState("");
  const [asking, setAsking] = useState<string | null>(null);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Untangle" subtitle="What you were taught, beside what Jesus actually did. Separating the two is slow, and it is allowed to take years." />
      <Card>
        <Field label="Something I was taught" hint="In church, at home, at camp. Its exact words if you can.">
          <input className="sh-input" value={taught} onChange={(e) => setTaught(e.target.value)} maxLength={600} />
        </Field>
        <CrisisNotice texts={[taught]} />
        <ErrorNote error={error} />
        <Btn disabled={busy || !taught.trim()} onClick={() => void run(async () => { await add({ taught }); setTaught(""); })}>
          Put it on the table
        </Btn>
      </Card>
      {!rows ? <Spinner /> : rows.map((r) => <Row key={r._id} row={r} asking={asking === r._id} onAsk={() => setAsking(asking === r._id ? null : r._id)} />)}
      {rows && rows.length === 0 && (
        <Card tone="alt">
          <p className="sh-muted">Nothing on the table yet. One thing at a time is the whole method.</p>
        </Card>
      )}
    </div>
  );
}

function Row({ row, asking, onAsk }: { row: Doc<"wellUntangle">; asking: boolean; onAsk: () => void }) {
  const update = useMutation(api.well.entries.updateUntangle);
  const remove = useMutation(api.well.entries.removeUntangle);
  const { busy, error, run } = useAction();
  const [jesusDid, setJesusDid] = useState(row.jesusDid ?? "");
  const [ref, setRef] = useState(row.ref ?? "");
  const dirty = jesusDid !== (row.jesusDid ?? "") || ref !== (row.ref ?? "");
  const parsed = row.ref ? parseRef(row.ref) : null;
  return (
    <Card>
      <div className="well-columns">
        <div>
          <p className="sh-eyebrow">What I was taught</p>
          <p>{row.taught}</p>
        </div>
        <div>
          <p className="sh-eyebrow">What Jesus actually did</p>
          <textarea className="sh-input sh-textarea" rows={3} value={jesusDid} onChange={(e) => setJesusDid(e.target.value)} maxLength={1500} placeholder="In your words, from the text." aria-label="What Jesus actually did" />
          <input className="sh-input mt-3" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} placeholder="Reference, like luke 15:20" aria-label="Reference" />
        </div>
      </div>
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap mt-3">
        <Btn disabled={busy || !dirty} onClick={() => void run(() => update({ id: row._id, jesusDid: jesusDid || undefined, ref: ref || undefined }))}>Save</Btn>
        <Btn variant="secondary" onClick={onAsk}>{asking ? "Close the coach" : "Help me find what Jesus did"}</Btn>
        {parsed && <Link href={refHref(parsed)} className="sh-link">Read {row.ref}</Link>}
        <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: row._id }))}>Delete</Btn>
      </div>
      {asking && <CoachChat module="the-well" task="well.untangle" opening={`What I was taught: "${row.taught}"`} placeholder="Where does Jesus deal with this? What did he actually say?" />}
    </Card>
  );
}
