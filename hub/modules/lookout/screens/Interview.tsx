"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { INTAKE, nextQuestion, type IntakeQuestion } from "@/convex/lookout/intake";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";
import { saveLabel, useAutosave } from "../useAutosave";

const KIND_LABEL = { about: "About you", must: "A requirement", prefer: "A preference" };

/**
 * The career interview, one question on screen at a time. Answers are saved
 * as you go and can be changed any time. Nothing is filled in for you.
 */
export function Interview() {
  const answers = useQuery(api.lookout.data.answers);
  const settings = useQuery(api.lookout.data.settings);
  const save = useMutation(api.lookout.data.saveAnswer);
  const { busy, error, run } = useAction();
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ key: string; text: string } | null>(null);
  // Answers save as they're typed; the question on screen stays put until "Save and go on".
  const auto = useAutosave(async (value) => {
    const [key, ...rest] = value.split("\u0000");
    await save({ key, answer: rest.join("\u0000"), skip: false });
  });
  if (!answers || !settings) return <Spinner />;

  const byKey = new Map(answers.map((a) => [a.key, a]));
  const answered = new Set(answers.filter((a) => a.answer.trim()).map((a) => a.key));
  const skipped = new Set(answers.filter((a) => a.skipped && !a.answer.trim()).map((a) => a.key));
  const owner = settings.role === "owner";
  const q: IntakeQuestion | null = (picked ? INTAKE.find((x) => x.key === picked) : null) ?? nextQuestion(answered, skipped);
  const text = draft && q && draft.key === q.key ? draft.text : (q ? byKey.get(q.key)?.answer ?? "" : "");
  const index = q ? INTAKE.findIndex((x) => x.key === q.key) : -1;
  const onlyOwner = q?.key === "disclose" && !owner;

  function type(key: string, text: string) {
    setDraft({ key, text });
    setPicked(key);
    if (text.trim()) auto.change(`${key}\u0000${text}`);
  }

  async function commit(skip: boolean) {
    if (!q) return;
    await auto.flush();
    await save({ key: q.key, answer: skip ? byKey.get(q.key)?.answer ?? "" : text, skip });
    setDraft(null);
    setPicked(null);
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The interview" subtitle={`One question at a time. ${answered.size} of ${INTAKE.length} answered. Skip anything and come back to it.`} />
      {q ? (
        <Card>
          <p className="sh-eyebrow">{q.topic} · {KIND_LABEL[q.kind]} · {index + 1} of {INTAKE.length}</p>
          <p className="lo-question">{q.question}</p>
          {q.hint && <p className="sh-hint">{q.hint}</p>}
          {onlyOwner ? (
            <p className="sh-note">This one is only for the person looking for work to answer.</p>
          ) : q.short ? (
            <input className="sh-input" value={text} maxLength={300} onChange={(e) => type(q.key, e.target.value)} onBlur={() => void auto.flush()} aria-label={q.question} />
          ) : (
            <textarea className="sh-textarea" rows={6} value={text} onChange={(e) => type(q.key, e.target.value)} onBlur={() => void auto.flush()} aria-label={q.question} />
          )}
          {!onlyOwner && <span className="sh-hint">{saveLabel(auto.state)}</span>}
          <ErrorNote error={error} />
          {!onlyOwner && (
            <div className="sh-row sh-wrap mt-3">
              <Btn disabled={busy || !text.trim()} onClick={() => void run(() => commit(false))}>Save and go on</Btn>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => commit(true))}>Skip for now</Btn>
              {picked && <Btn variant="ghost" onClick={() => { setPicked(null); setDraft(null); }}>Back to the next question</Btn>}
            </div>
          )}
          {!owner && <p className="sh-hint">Answers you write wait for a confirmation before they&apos;re used in any document.</p>}
        </Card>
      ) : (
        <Card>
          <p><strong>Every question has an answer.</strong> Change any of them below whenever something changes.</p>
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Your answers</h2>
        {INTAKE.map((x) => {
          const a = byKey.get(x.key);
          return (
            <div key={x.key} className="lo-entry">
              <p className="sh-hint">{x.topic} · {KIND_LABEL[x.kind]}</p>
              <p><strong>{x.question}</strong></p>
              {a?.answer ? <p style={{ whiteSpace: "pre-wrap" }}>{a.answer}</p> : <p className="sh-muted">{a?.skipped ? "Skipped for now." : "Not answered yet."}</p>}
              <div className="sh-row sh-wrap">
                <button type="button" className="sh-link" onClick={() => { setPicked(x.key); setDraft(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{a?.answer ? "Change" : "Answer"}</button>
                {a?.answer && !a.confirmed && (owner ? <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => save({ key: x.key, answer: a.answer, confirmed: true }))}>Confirm it&apos;s right</button> : <span className="sh-hint">Waiting for confirmation</span>)}
              </div>
            </div>
          );
        })}
      </Card>
      <SavedAnswers />
    </div>
  );
}

/** Answers to employers' application questions, kept so the same question is answered for him next time. */
function SavedAnswers() {
  const rows = useQuery(api.lookout.data.savedAnswers);
  const update = useMutation(api.lookout.data.updateSavedAnswer);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  if (!rows) return null;
  return (
    <Card>
      <h2 className="sh-h2">Saved application answers</h2>
      <p className="sh-hint">Answers given on job applications, kept so the same question is filled in on the next one. Answers about one particular job (like why that company) are only reused for that job.</p>
      {rows.length === 0 && <p className="sh-muted">None yet. They&apos;re saved from each job&apos;s application answers.</p>}
      {rows.map((r) => (
        <div key={r._id} className="lo-entry">
          <p><strong>{r.question}</strong></p>
          {editing === r._id ? (
            <>
              <textarea className="sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label={r.question} />
              <div className="sh-row">
                <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await update({ id: r._id, answer: text }); setEditing(null); })}>Save</Btn>
                <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
              </div>
            </>
          ) : (
            <p style={{ whiteSpace: "pre-wrap" }}>{r.answer}</p>
          )}
          <div className="sh-row">
            {editing !== r._id && <button type="button" className="sh-link" onClick={() => { setEditing(r._id); setText(r.answer); }}>Change</button>}
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => update({ id: r._id, remove: true }))}>Forget it</button>
          </div>
        </div>
      ))}
      <ErrorNote error={error} />
    </Card>
  );
}
