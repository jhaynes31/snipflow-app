"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Evidence for the New. Each truer line collects the moments that proved
 * it: "I said no and nothing broke." Pairing the old belief with a real
 * experience that contradicts it is how the rewrite holds.
 */
export function Evidence() {
  return (
    <Suspense fallback={<Spinner />}>
      <EvidenceInner />
    </Suspense>
  );
}

function EvidenceInner() {
  const params = useSearchParams();
  const beliefs = useQuery(api.renewedMind.entries.beliefs);
  const rows = useQuery(api.renewedMind.entries.evidence);
  const add = useMutation(api.renewedMind.entries.addEvidence);
  const remove = useMutation(api.renewedMind.entries.removeEvidence);
  const { busy, error, run } = useAction();
  const [beliefId, setBeliefId] = useState<Id<"rmBeliefs"> | "">(() => (params.get("belief") as Id<"rmBeliefs"> | null) ?? "");
  const [text, setText] = useState("");
  if (!beliefs || !rows) return <Spinner />;
  const active = beliefs.filter((b) => !b.retiredAt);
  const byBelief = (id: Id<"rmBeliefs">) => rows.filter((r) => r.beliefId === id);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Evidence for the New" subtitle="Moments that proved the truer line. Small counts. Read them on the days the old line is loud." />
      {active.length === 0 ? (
        <Card>
          <p className="sh-muted">Write a truer line first, in <Link href="/renewed-mind/beliefs" className="sh-link">Put Off, Put On</Link>. Then the moments have somewhere to go.</p>
        </Card>
      ) : (
        <Card>
          <Field label="Which line did this prove?">
            <select className="sh-input" value={beliefId} onChange={(e) => setBeliefId(e.target.value as Id<"rmBeliefs"> | "")}>
              <option value="">Pick one</option>
              {active.map((b) => <option key={b._id} value={b._id}>{b.newLine}</option>)}
            </select>
          </Field>
          <Field label="What happened" hint="Specific and small. &ldquo;I said no to the extra shift and nothing broke.&rdquo;">
            <textarea className="sh-input sh-textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={400} />
          </Field>
          <CrisisNotice texts={[text]} />
          <ErrorNote error={error} />
          <Btn disabled={busy || !beliefId || !text.trim()} onClick={() => void run(async () => { await add({ beliefId: beliefId as Id<"rmBeliefs">, text }); setText(""); })}>Add it</Btn>
        </Card>
      )}
      {beliefs.map((b) => {
        const list = byBelief(b._id);
        if (list.length === 0) return null;
        return (
          <Card key={b._id} tone="alt">
            <p className="rm-new">{b.newLine}</p>
            {list.map((r) => (
              <div key={r._id} className="rm-entry">
                <p>{r.text} <span className="sh-muted">· {timeAgo(r.createdAt)}</span></p>
                <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</Btn>
              </div>
            ))}
          </Card>
        );
      })}
      <Note>
        Tend&apos;s <Link href="/tend/tools/evidenceBank" className="sh-link">Evidence Bank</Link> is the wider record of what you did and what it showed. This one is narrower: proof for a specific line you&apos;re rewriting.
      </Note>
    </div>
  );
}
