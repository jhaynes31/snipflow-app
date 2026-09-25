"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { KIND_LABEL, SPEAKER_LABEL, type MantelKind } from "@/core/mantel/labels";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

/**
 * The Mantel (2026-09-25): lines kept to come back to, and takeaways in your
 * own words. Search, tags, share one with your partner, make one an Anchor,
 * send one to Renewed Mind. Nothing is counted.
 */
export default function MantelPage() {
  const rows = useQuery(api.mantel.mine);
  const keep = useMutation(api.mantel.keep);
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { profile, partner } = useHub();
  const { run, error, busy } = useAction();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<MantelKind>("takeaway");
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<MantelKind | "all">("all");
  const hub = (profile.moduleSettings?.hub ?? {}) as Record<string, unknown>;
  const onHome = hub.mantelOnHome !== false;
  if (!rows) return <Spinner />;
  const shown = rows.filter((r) => (tag === "all" || r.kind === tag) && (!q.trim() || r.text.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="The Mantel" subtitle="The shelf above the hearth: lines you want to see again, and what you're learning, in your words." />
      <Card>
        <Field label="Write a takeaway" hint="Something you're learning, a line that landed, a prayer. Yours.">
          <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="What I'm learning is…" />
        </Field>
        <div className="sh-chips">
          {(Object.keys(KIND_LABEL) as MantelKind[]).map((k) => (
            <button key={k} type="button" className={`sh-chip ${kind === k ? "" : "sh-chip-quiet"}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
          ))}
        </div>
        <ErrorNote error={error} />
        <Btn big disabled={busy || !text.trim()} onClick={() => void run(async () => { await keep({ text, kind, speaker: "me" }); setText(""); })}>Put it on the mantel</Btn>
      </Card>
      {rows.length > 0 && (
        <div className="sh-row sh-wrap">
          <input className="sh-input" style={{ flex: 1, minWidth: "12rem" }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your mantel" aria-label="Search" />
          <div className="sh-chips">
            <button type="button" className={`sh-chip ${tag === "all" ? "" : "sh-chip-quiet"}`} onClick={() => setTag("all")}>All</button>
            {(Object.keys(KIND_LABEL) as MantelKind[]).map((k) => (
              <button key={k} type="button" className={`sh-chip ${tag === k ? "" : "sh-chip-quiet"}`} onClick={() => setTag(k)}>{KIND_LABEL[k]}</button>
            ))}
          </div>
        </div>
      )}
      {rows.length === 0 ? (
        <Note>Nothing here yet. Every reply from the coach, Dad, or Mom has a small <strong>Keep</strong> button under it. Highlight one sentence first and it keeps just that.</Note>
      ) : (
        <div className="sh-stack">
          {shown.length === 0 && <p className="sh-muted">Nothing matches.</p>}
          {shown.map((r) => <MantelRow key={r._id} row={r} partnerName={partner?.displayName ?? "your partner"} />)}
        </div>
      )}
      <Card tone="alt">
        <Toggle checked={onHome} onChange={(v) => void run(() => setModuleSettings({ moduleId: "hub", settings: { ...hub, mantelOnHome: v } }))} label="Show one line from my mantel on the home page each day" hint="Chosen by the date. Never a streak." />
      </Card>
    </div>
  );
}

function MantelRow({ row, partnerName }: { row: Doc<"mantel">; partnerName: string }) {
  const update = useMutation(api.mantel.update);
  const remove = useMutation(api.mantel.remove);
  const saveManual = useMutation(api.manual.save);
  const manual = useQuery(api.manual.mine);
  const { run, error, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(row.text);
  const [anchored, setAnchored] = useState(false);
  const anchorsBody = manual?.find((s) => s.key === "faithAnchors")?.body ?? "";
  const alreadyAnchor = anchorsBody.includes(row.text);
  return (
    <Card>
      <p className="sh-eyebrow">{KIND_LABEL[row.kind]} · {SPEAKER_LABEL[row.speaker]}{row.source ? `, ${row.source}` : ""} · {timeAgo(row.createdAt)}{row.visibility === "shared" ? ` · shared with ${partnerName}` : ""}</p>
      {editing ? (
        <>
          <textarea className="sh-input sh-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
          <div className="sh-row mt-2">
            <Btn disabled={busy} onClick={() => void run(async () => { await update({ id: row._id, text }); setEditing(false); })}>Save</Btn>
            <Btn variant="ghost" onClick={() => { setText(row.text); setEditing(false); }}>Cancel</Btn>
          </div>
        </>
      ) : (
        <p className="sh-quote" style={{ whiteSpace: "pre-wrap" }}>{row.text}</p>
      )}
      <div className="sh-row sh-wrap">
        <Toggle checked={row.visibility === "shared"} onChange={(v) => void run(() => update({ id: row._id, shared: v }))} label={`Share with ${partnerName}`} />
      </div>
      <div className="sh-row sh-wrap mt-2">
        {alreadyAnchor || anchored ? (
          <span className="sh-hint">An Anchor now.</span>
        ) : (
          <Btn variant="secondary" disabled={busy || manual === undefined} onClick={() => void run(async () => { await saveManual({ key: "faithAnchors", body: anchorsBody ? `${anchorsBody}\n\n${row.text}` : row.text }); setAnchored(true); })}>Make it an Anchor</Btn>
        )}
        <Link href={`/renewed-mind/beliefs?ref=${encodeURIComponent(row.text.slice(0, 300))}`} className="sh-btn sh-btn-secondary">Send to Renewed Mind</Link>
        <Btn variant="ghost" onClick={() => setEditing(true)}>Edit</Btn>
        <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Take this off the mantel? It can't be brought back.")) void run(() => remove({ id: row._id })); }}>Remove</Btn>
      </div>
      <ErrorNote error={error} />
    </Card>
  );
}
