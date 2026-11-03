"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { TELLS } from "@/core/rooted/content";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Rich } from "@/core/text/RichText";
import { RichTextarea } from "@/core/text/RichTextarea";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

type Pattern = Doc<"rtPeople">["theirPattern"];
const PATTERNS: { key: Pattern; label: string }[] = [
  { key: "avoidant", label: "Avoidant" },
  { key: "anxious", label: "Anxious" },
  { key: "disorganized", label: "Disorganized" },
  { key: "secure", label: "Secure" },
  { key: "unsure", label: "Not sure" },
];

interface Draft { name: string; when: string; theirPattern: Pattern; tells: string[]; cost: string; taught: string; ended: string }
const EMPTY: Draft = { name: "", when: "", theirPattern: "avoidant", tells: [], cost: "", taught: "", ended: "" };

/**
 * The map of past people: who shaped the pattern, what each cost, what
 * each taught. Your own history as the evidence, instead of your memory
 * under stress. Grief is allowed here; so is naming it plainly.
 */
export function People() {
  const people = useQuery(api.rooted.entries.people);
  const add = useMutation(api.rooted.entries.addPerson);
  const edit = useMutation(api.rooted.entries.editPerson);
  const remove = useMutation(api.rooted.entries.removePerson);
  const { busy, error, run } = useAction();
  const [editing, setEditing] = useState<Doc<"rtPeople"> | null>(null);
  const [open, setOpen] = useState(false);

  if (!people) return <Spinner />;
  const counts = people.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.theirPattern]: (acc[p.theirPattern] ?? 0) + 1 }), {});

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The map of past people" subtitle="The people who shaped the pattern. What each cost, what each taught. Your own history, written down, so it can protect you." action={!open && !editing ? <Btn onClick={() => setOpen(true)}>Add someone</Btn> : undefined} />
      {(open || editing) && (
        <Editor key={editing?._id ?? "new"} initial={editing ? { name: editing.name, when: editing.when, theirPattern: editing.theirPattern, tells: editing.tells, cost: editing.cost, taught: editing.taught, ended: editing.ended ?? "" } : EMPTY} busy={busy} error={error} onCancel={() => { setOpen(false); setEditing(null); }} onSave={(d) => void run(async () => { if (editing) await edit({ id: editing._id, ...d, ended: d.ended || undefined }); else await add({ ...d, ended: d.ended || undefined }); setOpen(false); setEditing(null); })} />
      )}
      {people.length > 0 && (
        <p className="sh-muted">
          {people.length} {people.length === 1 ? "person" : "people"} on the map{counts.avoidant ? `, ${counts.avoidant} avoidant` : ""}. {counts.avoidant && counts.avoidant >= 2 ? "The pattern is on paper now. That is what the fail safes are for." : ""}
        </p>
      )}
      {people.map((p) => (
        <Card key={p._id}>
          <div className="sh-row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 className="sh-h2" style={{ margin: 0 }}>{p.name} <span className="sh-muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>· {p.when}</span></h2>
            <span className="rt-pill" data-p={p.theirPattern}>{PATTERNS.find((x) => x.key === p.theirPattern)?.label}</span>
          </div>
          {p.tells.length > 0 && <p className="sh-muted">Tells I saw: {p.tells.join(" · ")}</p>}
          <p><strong>What it cost:</strong> <Rich text={p.cost} /></p>
          <p><strong>What it taught:</strong> <Rich text={p.taught} /></p>
          {p.ended && <p><strong>How it ended:</strong> <Rich text={p.ended} /></p>}
          <p className="sh-hint">
            <button type="button" className="sh-link" onClick={() => { setOpen(false); setEditing(p); }}>Edit</button> ·{" "}
            <button type="button" className="sh-link" disabled={busy} onClick={() => { if (window.confirm(`Remove ${p.name} from the map?`)) void run(() => remove({ id: p._id })); }}>Remove</button>
          </p>
        </Card>
      ))}
      {people.length === 0 && !open && <Note>No one on the map yet. Start with the one that cost the most. You don&apos;t have to be fair to them; you have to be honest with yourself.</Note>}
      <Note>Private to you. Grief belongs here as much as clarity. If a name on this map still has a hook in you, the release journal in Re-Centered is where it goes to God.</Note>
    </div>
  );
}

function Editor({ initial, busy, error, onCancel, onSave }: { initial: Draft; busy: boolean; error: string | null; onCancel: () => void; onSave: (d: Draft) => void }) {
  const [d, setD] = useState<Draft>(initial);
  const ready = d.name.trim() && d.when.trim() && d.cost.trim() && d.taught.trim();
  return (
    <Card tone="alt">
      <Field label="Who" hint="A name, initials, or 'the one from church'."><input className="sh-input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={80} /></Field>
      <Field label="When" hint="Roughly. '2019 to 2021', 'my twenties'."><input className="sh-input" value={d.when} onChange={(e) => setD({ ...d, when: e.target.value })} maxLength={80} /></Field>
      <Field label="Their pattern, as best you can tell">
        <div className="sh-chips">{PATTERNS.map((p) => <button key={p.key} type="button" className="sh-chip" aria-pressed={d.theirPattern === p.key} onClick={() => setD({ ...d, theirPattern: p.key })}>{p.label}</button>)}</div>
      </Field>
      <Field label="Tells I saw, looking back" hint="Tap any. These are the early ones; you probably saw them earlier than you let yourself know.">
        <div className="sh-chips">{TELLS.map((t) => <button key={t.key} type="button" className="sh-chip" aria-pressed={d.tells.includes(t.name)} onClick={() => setD({ ...d, tells: d.tells.includes(t.name) ? d.tells.filter((x) => x !== t.name) : [...d.tells, t.name] })}>{t.name}</button>)}</div>
      </Field>
      <Field label="What it cost"><RichTextarea className="sh-input sh-textarea" rows={3} value={d.cost} onChange={(e) => setD({ ...d, cost: e.target.value })} maxLength={4000} /></Field>
      <Field label="What it taught"><RichTextarea className="sh-input sh-textarea" rows={3} value={d.taught} onChange={(e) => setD({ ...d, taught: e.target.value })} maxLength={4000} /></Field>
      <Field label="How it ended" hint="Optional."><RichTextarea className="sh-input sh-textarea" rows={2} value={d.ended} onChange={(e) => setD({ ...d, ended: e.target.value })} maxLength={2000} /></Field>
      <CrisisNotice texts={[d.cost, d.taught, d.ended]} />
      <ErrorNote error={error} />
      <div className="sh-row mt-3" style={{ gap: "0.5rem" }}>
        <Btn disabled={busy || !ready} onClick={() => onSave(d)}>Keep</Btn>
        <Btn variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Btn>
      </div>
    </Card>
  );
}
