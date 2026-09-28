"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { toolByKey } from "@/convex/toolIndex";
import { FeltPicker } from "@/core/felt/FeltPicker";
import { AREA_LABEL, movementFor, patternLine, patterns } from "@/core/felt/wheel";
import { useHub } from "@/core/shell/HubContext";
import { useTools } from "@/core/tools/useTools";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, timeAgo, Toggle, useAction } from "@/core/ui";

/** Felt: the wheel with no form attached, every entry, and where it shows up. */
export default function FeltPage() {
  const rows = useQuery(api.felt.mine);
  const setShared = useMutation(api.felt.setShared);
  const remove = useMutation(api.felt.remove);
  const { partner } = useHub();
  const tools = useTools();
  const { run, error, busy } = useAction();
  const [open, setOpen] = useState(true);
  if (!rows) return <Spinner />;
  const p = patterns(rows);
  const line = patternLine(p);
  const move = movementFor(p);
  const moveTool = move ? toolByKey(move.key) : null;
  const partnerName = partner?.displayName ?? "your partner";

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Felt" subtitle="What you feel, where it sits in your body, and what it's like there. Several things at once is normal." action={!open ? <Btn variant="secondary" onClick={() => setOpen(true)}>Open the wheel</Btn> : undefined} />
      {open && (
        <Card>
          <FeltPicker key={rows.length} context="felt" onDone={() => setOpen(false)} />
        </Card>
      )}
      {p.entries >= 3 && (
        <Card tone="alt">
          <h2 className="sh-h3">Where it shows up</h2>
          {line && <p className="hh-line">{line}</p>}
          <ul className="sh-list">
            {p.areas.slice(0, 6).map((a) => (
              <li key={a.area}><strong>{a.label}</strong>, {a.times} {a.times === 1 ? "time" : "times"}{a.feelings.length ? `, mostly ${a.feelings.map((f) => f.word).join(", ")}` : ""}{a.words.length ? ` (${a.words.map((w) => w.word).join(", ")})` : ""}</li>
            ))}
          </ul>
          {p.feelings.length > 0 && <p className="sh-muted">Most named: {p.feelings.slice(0, 5).map((f) => `${f.word} (${f.times})`).join(", ")}.</p>}
          {move && moveTool && tools && (
            <p className="sh-muted">{move.why} <a href={tools.href(moveTool)} className="sh-link">Open {moveTool.name}</a>.</p>
          )}
          <p className="sh-hint">Patterns, not scores. The Apothecary and the coach can see these too, so a body question knows what your stomach does when you&apos;re anxious.</p>
        </Card>
      )}
      <ErrorNote error={error} />
      {rows.length === 0 ? (
        <Note>Nothing kept yet. The wheel is here, and next to every feeling box in The Shire: the check-in, heads-ups, Re-Centered, the coach, and more.</Note>
      ) : (
        <Card>
          <h2 className="sh-h3">Kept</h2>
          {rows.map((r) => (
            <div key={r._id} className="hh-entry">
              <p className="sh-eyebrow">{timeAgo(r.createdAt)}{r.context ? ` · from ${r.context}` : ""}{r.visibility === "shared" ? ` · shared with ${partnerName}` : ""}</p>
              {r.feelings.length > 0 && <p><strong>{r.feelings.join(", ")}</strong></p>}
              {r.body.map((b, i) => (
                <p key={i} className="sh-muted">{AREA_LABEL[b.area] ?? b.area}{b.words.length ? `: ${b.words.join(", ")}` : ""}{b.note ? ` — ${b.note}` : ""}</p>
              ))}
              {r.note && <p className="sh-quote">{r.note}</p>}
              <div className="sh-row sh-wrap">
                <Toggle checked={r.visibility === "shared"} onChange={(v) => void run(() => setShared({ id: r._id, shared: v }))} label={`Share with ${partnerName}`} />
                <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete this one?")) void run(() => remove({ id: r._id })); }}>Delete</Btn>
              </div>
            </div>
          ))}
        </Card>
      )}
      <p className="sh-muted">Private to you. Shared entries show on {partnerName}&apos;s <Link href="/partner" className="sh-link">partner page</Link>. Nothing else leaves this page.</p>
    </div>
  );
}
