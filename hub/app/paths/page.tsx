"use client";

import { useState } from "react";
import type { CustomPath } from "@/convex/paths";
import { searchTools, toolByKey } from "@/convex/toolIndex";
import { usePath } from "@/core/paths/usePath";
import { useTools } from "@/core/tools/useTools";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * Paths (2026-09-23): every path this person can start, and a place to
 * build their own. A path is two to five tools in a row for one situation,
 * walked with one Next button. Nothing here is counted.
 */
export default function PathsPage() {
  const p = usePath();
  const t = useTools();
  const { run, error, busy } = useAction();
  const [building, setBuilding] = useState(false);
  const [name, setName] = useState("");
  const [words, setWords] = useState("");
  const [steps, setSteps] = useState<string[]>([]);
  const [q, setQ] = useState("");
  if (!p.ready || !t) return <Spinner />;

  const hits = q.trim().length >= 2 ? searchTools(q, t.tools).filter((x) => !steps.includes(x.key)).slice(0, 6) : [];
  const mine = p.paths.filter((x) => p.custom.some((c) => c.key === x.key));
  const builtIn = p.paths.filter((x) => !p.custom.some((c) => c.key === x.key));

  async function save() {
    const key = `custom-${Date.now()}`;
    const entry: CustomPath = { key, name: name.trim(), words: words.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean), steps };
    await run(() => p.saveCustom([...p.custom, entry]));
    setName(""); setWords(""); setSteps([]); setQ(""); setBuilding(false);
  }
  const move = (i: number, d: -1 | 1) => setSteps((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n; });

  const PathCard = ({ path, own }: { path: (typeof p.paths)[number]; own?: boolean }) => (
    <Card>
      <h2 className="sh-h3">{path.name}</h2>
      <p className="sh-muted">{path.when}</p>
      <ol className="sh-list">{path.steps.map((k) => { const tool = toolByKey(k); return <li key={k}>{tool?.name ?? k} <span className="sh-muted">· {tool?.place}</span></li>; })}</ol>
      <div className="sh-row sh-wrap">
        <Btn disabled={busy} onClick={() => void run(() => p.start(path.key))}>Start</Btn>
        {own && <Btn variant="ghost" disabled={busy} onClick={() => { if (confirm("Delete this path?")) void run(() => p.saveCustom(p.custom.filter((c) => c.key !== path.key))); }}>Delete</Btn>}
      </div>
    </Card>
  );

  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title="Paths" subtitle="A few tools in a row for one situation. Start one and a bar at the top walks you through it, one Next button at a time." action={<Btn variant="secondary" onClick={() => setBuilding((v) => !v)}>{building ? "Close" : "Build my own"}</Btn>} />
      {p.current && <Note>You&apos;re on <strong>{p.current.name}</strong> right now. The bar at the top has your next step.</Note>}
      <ErrorNote error={error} />
      {building && (
        <Card tone="alt">
          <h2 className="sh-h3">Build a path</h2>
          <Field label="Name it"><input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="After a hard phone call" /></Field>
          <Field label="Words that should find it" hint="Comma-separated. The front desk and the coach use these."><input className="sh-input" value={words} onChange={(e) => setWords(e.target.value)} maxLength={300} placeholder="phone call, my mother, drained" /></Field>
          <Field label="Steps, in order" hint="Search a tool and tap it to add. Two to five is the sweet spot.">
            <input className="sh-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ground me, come sit, whose is this…" />
          </Field>
          {hits.length > 0 && (
            <div className="sh-chips">{hits.map((x) => <button key={x.key} type="button" className="sh-chip sh-chip-quiet" onClick={() => { setSteps((s) => [...s, x.key]); setQ(""); }}>{x.name} · {x.place}</button>)}</div>
          )}
          {steps.length > 0 && (
            <ol className="sh-list">
              {steps.map((k, i) => (
                <li key={k} className="sh-row sh-wrap">
                  <span>{toolByKey(k)?.name ?? k}</span>
                  <Btn variant="ghost" onClick={() => move(i, -1)} aria-label="Move up">↑</Btn>
                  <Btn variant="ghost" onClick={() => move(i, 1)} aria-label="Move down">↓</Btn>
                  <Btn variant="ghost" onClick={() => setSteps((s) => s.filter((x) => x !== k))}>Remove</Btn>
                </li>
              ))}
            </ol>
          )}
          <Btn big disabled={busy || !name.trim() || steps.length < 2} onClick={() => void save()}>Keep this path</Btn>
        </Card>
      )}
      {mine.length > 0 && (<><h2 className="sh-h2">Mine</h2>{mine.map((x) => <PathCard key={x.key} path={x} own />)}</>)}
      <h2 className="sh-h2">Ready-made</h2>
      {builtIn.map((x) => <PathCard key={x.key} path={x} />)}
      <Note>Paths never count anything. Stopping partway is just stopping. Steps that open Heartwood or the Re-Centered app leave The Shire for a bit; when you come back, the bar is waiting with the next step.</Note>
    </div>
  );
}
