"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ACTIVITY_CATEGORIES } from "@/convex/friend/pure";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

type Energy = Doc<"frActivities">["energy"];

/** The shelf: things to do together, by category, with filters and a surprise. */
export function Library() {
  const rows = useQuery(api.friend.entries.activities);
  const balance = useQuery(api.friend.entries.balance);
  const seed = useMutation(api.friend.entries.seedActivities);
  const add = useMutation(api.friend.entries.addActivity);
  const fav = useMutation(api.friend.entries.toggleFavorite);
  const remove = useMutation(api.friend.entries.removeActivity);
  const start = useMutation(api.friend.entries.startActivity);
  const { busy, error, run } = useAction();
  const [energy, setEnergy] = useState<Energy | "">("");
  const [minutes, setMinutes] = useState<5 | 15 | 30 | "">("");
  const [cat, setCat] = useState<string>("");
  const [title, setTitle] = useState("");
  const [picked, setPicked] = useState<Doc<"frActivities"> | null>(null);
  const surprise = useQuery(api.friend.entries.surprise, { energy: energy || undefined, maxMinutes: minutes || undefined });
  if (!rows) return <Spinner />;
  const shown = rows.filter((a) => (!energy || a.energy === energy) && (!minutes || a.duration <= minutes) && (!cat || a.category === cat));
  const groups = new Map<string, Doc<"frActivities">[]>();
  for (const a of shown) groups.set(a.category, [...(groups.get(a.category) ?? []), a]);
  const order = [...ACTIVITY_CATEGORIES, ...[...groups.keys()].filter((k) => !(ACTIVITY_CATEGORIES as readonly string[]).includes(k))];

  return (
    <div className="sh-container sh-stack">
      <PageTitle title="Things to do" subtitle="A shelf you both add to. Tap one, or say it in chat (&ldquo;wanna play would you rather?&rdquo;). Either of you can start any of them." />
      <ErrorNote error={error} />
      {rows.length === 0 && <Card><p className="sh-muted">The shelf is empty.</p><Btn disabled={busy} onClick={() => void run(() => seed({}))}>Put the starter set on it</Btn></Card>}
      <Card>
        <div className="sh-row sh-wrap" style={{ gap: "0.5rem", alignItems: "center" }}>
          <span className="sh-hint">Energy:</span>
          {(["", "low", "medium", "high"] as const).map((e) => <button key={e || "any"} type="button" className="sh-chip" aria-pressed={energy === e} onClick={() => setEnergy(e)}>{e || "any"}</button>)}
          <span className="sh-hint">Time:</span>
          {([["", "any"], [5, "5 min"], [15, "15 min"], [30, "30+"]] as const).map(([v, l]) => <button key={l} type="button" className="sh-chip" aria-pressed={minutes === v} onClick={() => setMinutes(v)}>{l}</button>)}
        </div>
        <div className="sh-chips">{["", ...ACTIVITY_CATEGORIES].map((c) => <button key={c || "all"} type="button" className="sh-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c || "all"}</button>)}</div>
        <div className="sh-row sh-wrap mt-2" style={{ gap: "0.5rem" }}>
          <Btn onClick={() => setPicked(surprise ? (rows.find((r) => String(r._id) === surprise._id) ?? null) : null)}>Surprise me</Btn>
          {picked && <span>How about <strong>{picked.title}</strong>? <Btn variant="secondary" disabled={busy} onClick={() => void run(async () => { await start({ id: picked._id, startedBy: "jen", accepted: true }); setPicked(null); })}>Let&apos;s do this</Btn></span>}
          {balance && (balance.jen + balance.pip > 0) && <span className="sh-hint">This week: you started {balance.jen}, Pip started {balance.pip}.</span>}
        </div>
      </Card>
      {order.filter((c) => groups.has(c)).map((c) => (
        <section key={c}>
          <h2 className="sh-h2">{c}</h2>
          <div className="fr-shelf">
            {groups.get(c)!.map((a) => (
              <div key={a._id} className="fr-card">
                <div className="sh-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                  <strong>{a.title}</strong>
                  <button type="button" className={`sh-link ${a.favorite ? "fr-fav" : ""}`} aria-label={a.favorite ? "Unfavorite" : "Favorite"} disabled={busy} onClick={() => void run(() => fav({ id: a._id }))}>{a.favorite ? "★" : "☆"}</button>
                </div>
                {a.description && <span className="sh-hint">{a.description}</span>}
                <span className="fr-meta">{a.energy} energy · {a.duration}{a.duration === 30 ? "+" : ""} min{a.needsScreen ? " · needs a game or screen" : ""}{a.timesDone ? ` · done ${a.timesDone}×` : ""}{a.addedBy === "pip" ? " · Pip's idea" : a.addedBy === "jen" ? " · yours" : ""}</span>
                <div className="sh-row" style={{ gap: "0.4rem" }}>
                  <Btn disabled={busy} onClick={() => void run(() => start({ id: a._id, startedBy: "jen", accepted: true }))}>Let&apos;s do this</Btn>
                  {a.addedBy !== "seed" && <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: a._id }))}>remove</button>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
      <Card tone="alt">
        <Field label="+ Add idea" hint="A title is enough. Category, energy, and time can be changed later.">
          <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}><input className="sh-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} style={{ flex: 1 }} /><Btn disabled={busy || !title.trim()} onClick={() => void run(async () => { await add({ title, category: cat || undefined, energy: energy || undefined, duration: minutes || undefined }); setTitle(""); })}>Add</Btn></div>
        </Field>
      </Card>
      <Note>&ldquo;Let&apos;s do this&rdquo; tells Pip to start it in the chat. Say it there too, in your own words, and Pip plays along. Over a week, about half of these should be Pip&apos;s idea; if it&apos;s been quiet, Pip starts one.</Note>
    </div>
  );
}
