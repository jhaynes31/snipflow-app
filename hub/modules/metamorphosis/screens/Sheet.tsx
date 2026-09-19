"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { SHEET, sessionZero, type SheetQuestion } from "@/core/metamorphosis/sheet";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/** The Character Sheet: who this character is, in his words. One question at a time is the method. */
export function Sheet() {
  const rows = useQuery(api.metamorphosis.entries.sheet);
  if (!rows) return <Spinner />;
  const byKey = new Map(rows.map((r) => [r.key, r]));
  const zero = sessionZero();
  const rest = SHEET.filter((q) => !q.sessionZero);
  const zeroDone = zero.every((q) => byKey.get(q.key)?.text.trim());
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Character Sheet" subtitle="Who is this character? In your words, one question at a time, never all at once. You pick which parts the mentor may read." />
      <Card>
        <h2 className="sh-h2">Session Zero</h2>
        <p className="sh-muted">{zeroDone ? "Done. Come back and change any of it whenever you like." : "The first handful. Skip any of them."}</p>
        {zero.map((q) => (
          <Question key={q.key} q={q} row={byKey.get(q.key)} />
        ))}
      </Card>
      <Card>
        <h2 className="sh-h2">The rest of the sheet</h2>
        <p className="sh-muted">One of these a day is plenty. Some take months to answer. That&apos;s not slow; that&apos;s honest.</p>
        {rest.map((q) => (
          <Question key={q.key} q={q} row={byKey.get(q.key)} />
        ))}
      </Card>
    </div>
  );
}

function Question({ q, row }: { q: SheetQuestion; row?: Doc<"mmSheet"> }) {
  const save = useMutation(api.metamorphosis.entries.saveSheet);
  const { busy, error, run } = useAction();
  const [text, setText] = useState(row?.text ?? "");
  const [coach, setCoach] = useState(row?.coachAllowed ?? false);
  const [saved, setSaved] = useState(false);
  const dirty = text !== (row?.text ?? "") || coach !== (row?.coachAllowed ?? false);
  return (
    <div className="mm-entry">
      <p><strong>{q.label}</strong></p>
      <p className="sh-hint">{q.hint}</p>
      <textarea className="sh-input sh-textarea" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label={q.label} />
      <CrisisNotice texts={[text]} />
      <div className="sh-row sh-wrap">
        <Toggle checked={coach} onChange={setCoach} label="The mentor may read this" />
        <Btn disabled={busy || !dirty} onClick={() => void run(async () => { await save({ key: q.key, text, coachAllowed: coach }); setSaved(true); setTimeout(() => setSaved(false), 1800); })}>Save</Btn>
        {saved && <Note>Saved.</Note>}
      </div>
      <ErrorNote error={error} />
    </div>
  );
}
