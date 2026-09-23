"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { CoachChat } from "@/core/coach/CoachChat";
import { KNOW_TOPIC_MAP, KNOW_TOPICS } from "@/core/hearth/know";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

/**
 * What I know: the reverse of the rest of the room. She writes; the table
 * takes it seriously and never edits it. Each entry can be marked ready and
 * shared with John one at a time.
 */
export function Know() {
  const rows = useQuery(api.hearth.entries.know);
  const add = useMutation(api.hearth.entries.addKnow);
  const { partner } = useHub();
  const { run, error, busy } = useAction();
  const [topic, setTopic] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  async function save() {
    if (!topic) return;
    await run(() => add({ topic, title, text }));
    setTitle(""); setText(""); setTopic(null);
  }

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="What I know" subtitle="The advice and lived experience you carry that no one has asked for yet. Write it down. It'll be ready when they do." />
      <Card>
        <p className="sh-label">Topic</p>
        <div className="sh-chips">
          {KNOW_TOPICS.map((t) => (
            <button key={t.key} type="button" className={`sh-chip ${topic === t.key ? "" : "sh-chip-quiet"}`} aria-pressed={topic === t.key} onClick={() => setTopic(t.key)}>{t.name}</button>
          ))}
        </div>
        {topic && (
          <>
            <p className="sh-hint mt-2">{KNOW_TOPIC_MAP[topic].prompt}</p>
            <Field label="Give it a title">
              <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="The thing I'd say first" />
            </Field>
            <Field label="What you know" hint="In your words. Nobody edits this, including the coach.">
              <textarea className="sh-input sh-textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} />
            </Field>
            <ErrorNote error={error} />
            <Btn big disabled={busy || !title.trim() || !text.trim()} onClick={() => void save()}>Keep it</Btn>
          </>
        )}
      </Card>
      {!rows ? <Spinner /> : rows.length > 0 && (
        <Card>
          <h2 className="sh-h3">Kept</h2>
          <div>{rows.map((r) => <KnowRow key={r._id} row={r} partnerName={partner?.displayName ?? "your partner"} />)}</div>
        </Card>
      )}
      <Card tone="alt">
        <h2 className="sh-h3">Talk it over at the table</h2>
        <p className="sh-muted">She has what you&apos;ve kept in front of her. She&apos;ll ask you to say more; she won&apos;t rewrite a word.</p>
        <CoachChat module="hearth" task="hearth.know" placeholder="I think I know something about…" />
      </Card>
      <Note>
        Private by default. Mark one <strong>ready</strong> when it&apos;s the version you&apos;d hand someone. Share one with {partner?.displayName ?? "your partner"} and it shows on their partner page, under &ldquo;From your table.&rdquo; Unshare any time.
      </Note>
    </div>
  );
}

function KnowRow({ row, partnerName }: { row: Doc<"hhKnow">; partnerName: string }) {
  const update = useMutation(api.hearth.entries.updateKnow);
  const remove = useMutation(api.hearth.entries.removeKnow);
  const { run, error, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [text, setText] = useState(row.text);
  const topic = KNOW_TOPIC_MAP[row.topic]?.name ?? row.topic;
  return (
    <div className="hh-entry">
      <p className="sh-eyebrow">{topic} · {timeAgo(row.updatedAt)}{row.ready ? " · ready" : ""}{row.visibility === "shared" ? ` · shared with ${partnerName}` : ""}</p>
      {editing ? (
        <>
          <input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          <textarea className="sh-input sh-textarea mt-2" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000} />
          <div className="sh-row mt-2">
            <Btn disabled={busy} onClick={() => void run(async () => { await update({ id: row._id, title, text }); setEditing(false); })}>Save</Btn>
            <Btn variant="ghost" onClick={() => { setTitle(row.title); setText(row.text); setEditing(false); }}>Cancel</Btn>
          </div>
        </>
      ) : (
        <>
          <h3 className="sh-h4">{row.title}</h3>
          <p className="hh-line">{row.text}</p>
          <div className="sh-row" style={{ flexWrap: "wrap", gap: "0.6rem" }}>
            <Toggle checked={row.ready} onChange={(v) => void run(() => update({ id: row._id, ready: v }))} label="Ready to hand someone" />
            <Toggle checked={row.visibility === "shared"} onChange={(v) => void run(() => update({ id: row._id, shared: v }))} label={`Share with ${partnerName}`} />
          </div>
          <div className="sh-row mt-2">
            <Btn variant="ghost" onClick={() => setEditing(true)}>Edit</Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete this one? It can't be brought back.")) void run(() => remove({ id: row._id })); }}>Delete</Btn>
          </div>
        </>
      )}
      <ErrorNote error={error} />
    </div>
  );
}
