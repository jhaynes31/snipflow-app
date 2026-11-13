"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import type { LoopTheme } from "../theme";

/** Three minutes, once a week, optional. */
export function Review({ theme }: { theme: LoopTheme }) {
  void theme;
  const rows = useQuery(api.loops.entries.reviews);
  const add = useMutation(api.loops.entries.addReview);
  const { busy, error, run } = useAction();
  const [showed, setShowed] = useState("");
  const [caught, setCaught] = useState("");
  const [exit, setExit] = useState("");
  const [guardrail, setGuardrail] = useState("");
  return (
    <>
      <PageTitle title="Weekly loop review" subtitle="Three minutes. Optional. No grades." />
      <Card>
        <Field label="Which loops showed up this week?"><input className="sh-input" value={showed} onChange={(e) => setShowed(e.target.value)} maxLength={2000} /></Field>
        <Field label="Where did I catch them?"><input className="sh-input" value={caught} onChange={(e) => setCaught(e.target.value)} maxLength={2000} /></Field>
        <Field label="What exit worked best?"><input className="sh-input" value={exit} onChange={(e) => setExit(e.target.value)} maxLength={2000} /></Field>
        <Field label="One guardrail to strengthen next week"><input className="sh-input" value={guardrail} onChange={(e) => setGuardrail(e.target.value)} maxLength={2000} /></Field>
        <ErrorNote error={error} />
        <Btn big disabled={busy || !(showed.trim() || caught.trim() || exit.trim() || guardrail.trim())} onClick={() => void run(async () => { await add({ showed, caught, exit, guardrail }); setShowed(""); setCaught(""); setExit(""); setGuardrail(""); })}>Keep this review</Btn>
      </Card>
      {!rows ? <Spinner /> : rows.length ? (
        <Card tone="alt">
          {rows.map((r) => <div key={r._id} className="lp-entry"><p className="sh-hint">{timeAgo(r.createdAt)}</p>{r.showed && <p><strong>Showed up:</strong> {r.showed}</p>}{r.caught && <p><strong>Caught at:</strong> {r.caught}</p>}{r.exit && <p><strong>Best exit:</strong> {r.exit}</p>}{r.guardrail && <p><strong>Strengthen:</strong> {r.guardrail}</p>}</div>)}
        </Card>
      ) : <Note>No reviews yet. Sunday evening is a good time.</Note>}
    </>
  );
}
