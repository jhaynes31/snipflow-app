"use client";

import { useEffect, useRef, useState } from "react";
import { useAction as useConvexAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

const EXAMPLES = [
  "I uploaded the resume, but the last two jobs on it are no longer current. Both ended in June 2025.",
  "He also used Freshdesk at his most recent job.",
  "Don't lead with the sales jobs from this year; keep them short.",
  "We're not interested in the Acme listing.",
];

/**
 * The assistant: tell the Lookout something in plain words and it puts it
 * in the right place: work history, interview answers, notes for the
 * writer, or a job's status and notes. Changes are made straight away and
 * listed under its reply, with an undo. Anything unclear, it asks about
 * instead of guessing.
 */
export function Assistant() {
  const messages = useQuery(api.lookout.admin.messages);
  const notes = useQuery(api.lookout.admin.notes);
  const ask = useConvexAction(api.lookout.ai.askAssistant);
  const undo = useMutation(api.lookout.admin.undo);
  const removeNote = useMutation(api.lookout.admin.removeNote);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [messages?.length]);
  if (!messages || !notes) return <Spinner />;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Assistant" subtitle="Tell the Lookout what's changed, in your own words. It updates the right places and tells you what it did." />
      <Card>
        {messages.length === 0 && (
          <>
            <p className="sh-muted">For example:</p>
            <ul className="sh-list">
              {EXAMPLES.map((e) => <li key={e}><button type="button" className="sh-link" onClick={() => setText(e)}>{e}</button></li>)}
            </ul>
          </>
        )}
        {messages.map((m) => (
          <div key={m._id} className="lo-entry">
            <p className="sh-hint">{m.role === "user" ? m.author : "The Lookout"} · {timeAgo(m.createdAt)}</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
            {m.applied.length > 0 && (
              <>
                <ul className="sh-list">
                  {m.applied.map((x) => <li key={x} style={m.undone ? { textDecoration: "line-through" } : undefined}>{x}</li>)}
                </ul>
                {m.undone ? <p className="sh-hint">Undone.</p> : <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm("Put back everything this reply changed?")) void run(() => undo({ id: m._id })); }}>Undo {m.applied.length === 1 ? "this change" : "these changes"}</button>}
              </>
            )}
          </div>
        ))}
        <div ref={end} />
        <div className="lo-entry">
          <textarea className="sh-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What should the Lookout know?" aria-label="Message" />
          <ErrorNote error={error} />
          <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await ask({ message: text }); setText(""); })}>{busy ? "Working on it…" : "Send"}</Btn>
        </div>
      </Card>
      <Card>
        <h2 className="sh-h2">Notes for the writer</h2>
        <p className="sh-hint">Standing notes the resume and letter writer follows for every job, as long as they don&apos;t mean inventing anything. Add them by telling the assistant.</p>
        {notes.length === 0 && <p className="sh-muted">None yet.</p>}
        {notes.map((n) => (
          <div key={n._id} className="lo-entry sh-row sh-wrap">
            <span style={{ flex: 1 }}>{n.text}</span>
            <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeNote({ id: n._id }))}>Remove</button>
          </div>
        ))}
      </Card>
    </div>
  );
}
