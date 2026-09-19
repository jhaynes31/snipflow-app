"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { QUESTIONS, SECTIONS, type Question } from "@/core/crossroads/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, useAction } from "@/core/ui";

const SCALE = ["Doesn't matter", "A little", "Some", "Matters", "A lot", "Non-negotiable"];

/** The questionnaire. Each person answers alone; both can read both once written. */
export function Questions() {
  const data = useQuery(api.crossroads.entries.answers);
  if (!data) return <Spinner />;
  const byKey = new Map(data.mine.map((a) => [a.key, a]));
  const answered = QUESTIONS.filter((q) => { const a = byKey.get(q.key); return a && (a.importance !== undefined || a.text); }).length;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Questions" subtitle="Answer for yourself, not for both of you. Skip anything. Come back to anything. When you've both answered, Together shows where you match and where you differ." />
      <p className="sh-hint">{answered} of {QUESTIONS.length} answered. No rush.</p>
      {SECTIONS.map((section) => (
        <Card key={section}>
          <h2 className="sh-h2">{section}</h2>
          {QUESTIONS.filter((q) => q.section === section).map((q) => (
            <QuestionRow key={q.key} q={q} row={byKey.get(q.key)} />
          ))}
        </Card>
      ))}
    </div>
  );
}

function QuestionRow({ q, row }: { q: Question; row?: Doc<"crAnswers"> }) {
  const answer = useMutation(api.crossroads.entries.answer);
  const { busy, error, run } = useAction();
  const [text, setText] = useState(row?.text ?? "");
  const [saved, setSaved] = useState(false);
  return (
    <div className="cr-entry">
      <p><strong>{q.text}</strong></p>
      {q.hint && <p className="sh-hint">{q.hint}</p>}
      {(q.kind === "importance" || q.kind === "both") && (
        <div className="cr-scale" role="group" aria-label={`${q.text}: how much it matters`}>
          {SCALE.map((label, i) => (
            <button key={i} type="button" className="sh-chip" aria-pressed={row?.importance === i} title={label} style={row?.importance === i ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} disabled={busy} onClick={() => void run(() => answer({ key: q.key, importance: i }))}>
              {i}
            </button>
          ))}
          <span className="sh-hint">{row?.importance !== undefined ? SCALE[row.importance] : "0 doesn't matter, 5 non-negotiable"}</span>
        </div>
      )}
      {(q.kind === "text" || q.kind === "both") && (
        <div className="sh-stack-sm mt-3">
          <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label={q.text} />
          <CrisisNotice texts={[text]} />
          <div className="sh-row">
            <Btn variant="secondary" disabled={busy || text === (row?.text ?? "")} onClick={() => void run(async () => { await answer({ key: q.key, text }); setSaved(true); setTimeout(() => setSaved(false), 1500); })}>Save</Btn>
            {saved && <Note>Saved.</Note>}
          </div>
        </div>
      )}
      <ErrorNote error={error} />
    </div>
  );
}
