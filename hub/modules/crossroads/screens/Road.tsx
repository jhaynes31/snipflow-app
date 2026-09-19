"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLACES } from "@/core/crossroads/places";
import { STAGES, STEPS, type Path } from "@/core/crossroads/steps";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";

const STATUS = [["todo", "To do"], ["doing", "Doing"], ["done", "Done"], ["skip", "Skip"]] as const;

/** The Road: the steps in order, as a road, for the path you chose. */
export function Road() {
  const data = useQuery(api.crossroads.entries.steps);
  const places = useQuery(api.crossroads.entries.places);
  const setStep = useMutation(api.crossroads.entries.setStep);
  const setSettings = useMutation(api.crossroads.entries.setSettings);
  const { busy, error, run } = useAction();
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  if (!data || !places) return <Spinner />;
  const path: Path | "undecided" = data.path;
  const chosen = places.settings.chosenPlace ? PLACES.find((p) => p.key === places.settings.chosenPlace) : undefined;
  const byKey = new Map(data.rows.map((r) => [r.key, r]));
  const visible = path === "undecided" ? STEPS.filter((s) => s.stage === "Decide") : STEPS.filter((s) => s.paths.includes(path));
  const done = visible.filter((s) => byKey.get(s.key)?.status === "done").length;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Road" subtitle="Every step, in order, with what it costs and where to do it. Check them off, and say who's carrying each one." />
      <Card tone="alt">
        <p className="sh-label">Which road?</p>
        <div className="sh-choices">
          {([["undecided", "Still deciding"], ["domestic", "Another state"], ["abroad", "Another country"]] as const).map(([k, l]) => (
            <Btn key={k} variant={path === k ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => setSettings({ path: k }))}>{l}</Btn>
          ))}
        </div>
        {chosen && <p className="sh-hint mt-3">Chosen place: {chosen.name}. The legal path: {chosen.path}</p>}
        {path !== "undecided" && <p className="sh-hint">{done} of {visible.length} steps done. Costs and processing times are 2026 US figures; confirm each where it says.</p>}
        <ErrorNote error={error} />
      </Card>
      <div className="cr-road">
        {STAGES.map((stage) => {
          const steps = visible.filter((s) => s.stage === stage);
          if (steps.length === 0) return null;
          return (
            <section key={stage} className="cr-stage">
              <h2 className="cr-stage-title">{stage}</h2>
              {steps.map((s) => {
                const row = byKey.get(s.key);
                const status = row?.status ?? "todo";
                return (
                  <div key={s.key} className="cr-step" data-status={status}>
                    <p><strong>{s.title}</strong></p>
                    <p>{s.details}</p>
                    <p className="cr-step-meta">
                      {s.cost ? `Cost: ${s.cost}. ` : ""}{s.time ? `Time: ${s.time}. ` : ""}{s.where ? `Where: ${s.where}.` : ""}
                    </p>
                    {row?.note && <p className="sh-muted">Note: {row.note}</p>}
                    <div className="sh-choices">
                      {STATUS.map(([k, l]) => (
                        <button key={k} type="button" className="sh-chip" aria-pressed={status === k} style={status === k ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} disabled={busy} onClick={() => void run(() => setStep({ key: s.key, status: k }))}>{l}</button>
                      ))}
                      <span className="sh-hint">Who:</span>
                      {Object.entries(data.names).map(([id, n]) => (
                        <button key={id} type="button" className="sh-chip" aria-pressed={row?.who === id} style={row?.who === id ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} disabled={busy} onClick={() => void run(() => (row?.who === id ? setStep({ key: s.key, clearWho: true }) : setStep({ key: s.key, who: id as typeof data.me })))}>{n}</button>
                      ))}
                      <button type="button" className="sh-link" onClick={() => { setNoteFor(noteFor === s.key ? null : s.key); setNote(row?.note ?? ""); }}>Note</button>
                    </div>
                    {noteFor === s.key && (
                      <div className="sh-row sh-wrap mt-3">
                        <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} aria-label="Note" placeholder="Appointment date, what they said, the fee you paid" />
                        <Btn disabled={busy} onClick={() => void run(async () => { await setStep({ key: s.key, note }); setNoteFor(null); })}>Save</Btn>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
      <p className="sh-hint mt-6">A step someone takes on can be a word in <Link href="/kept-word" className="sh-link">Kept Word</Link>, and the money for the move belongs in <Link href="/storehouse/barns" className="sh-link">The Barns</Link>.</p>
    </div>
  );
}
