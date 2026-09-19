"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PLACES, SOURCES, type Place } from "@/core/crossroads/places";
import { FACTOR_LABEL, type Factor, combinedImportance, fitWords, rank } from "@/core/crossroads/pure";
import { Btn, Card, ErrorNote, Field, PageTitle, Spinner, useAction } from "@/core/ui";

const FACTORS = Object.keys(FACTOR_LABEL) as Factor[];

/** Places: every candidate with a fit for what you both said matters, plus your own. */
export function Places() {
  const answers = useQuery(api.crossroads.entries.answers);
  const data = useQuery(api.crossroads.entries.places);
  const addPlace = useMutation(api.crossroads.entries.addPlace);
  const setPlace = useMutation(api.crossroads.entries.setPlace);
  const removePlace = useMutation(api.crossroads.entries.removePlace);
  const setSettings = useMutation(api.crossroads.entries.setSettings);
  const { busy, error, run } = useAction();
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"country" | "state">("country");
  const [showStates, setShowStates] = useState(true);
  if (!answers || !data) return <Spinner />;
  const importance = combinedImportance(answers.mine, answers.theirs);
  const merged: Place[] = [
    ...PLACES.map((p) => {
      const o = data.overrides.find((x) => x.key === p.key);
      return o?.ratings && Object.keys(o.ratings as object).length ? { ...p, ratings: { ...p.ratings, ...(o.ratings as Partial<Record<Factor, number>>) } } : p;
    }),
    ...data.overrides.filter((o) => o.key.startsWith("custom-")).map((o) => ({
      key: o.key,
      name: o.name ?? o.key,
      kind: o.kind ?? "country",
      line: o.line ?? "Your own candidate. Rate it as you learn.",
      ratings: Object.fromEntries(FACTORS.map((f) => [f, ((o.ratings as Partial<Record<Factor, number>>)?.[f] ?? 3)])) as Record<Factor, number>,
      fits: "",
      watch: "",
      path: "",
    })),
  ].filter((p) => showStates || p.kind !== "state");
  const fits = rank(merged, importance);
  const byKey = new Map(merged.map((p) => [p.key, p]));
  const shortlisted = new Set(data.overrides.filter((o) => o.shortlisted).map((o) => o.key));
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Places" subtitle="Each place rated 1 to 5 on what you both said matters. The ratings are Claude's rough starting points, not measurements; change any of them as you learn." />
      <div className="sh-row sh-wrap">
        <label className="sh-label"><input type="checkbox" checked={showStates} onChange={(e) => setShowStates(e.target.checked)} /> Include US states</label>
        {data.settings.chosenPlace && <span className="sh-hint">Chosen: {byKey.get(data.settings.chosenPlace)?.name ?? data.settings.chosenPlace}</span>}
      </div>
      {Object.keys(importance).length === 0 && <Card tone="alt"><p className="sh-muted">Answer the importance questions first and the fits appear here.</p></Card>}
      {fits.map((f) => {
        const p = byKey.get(f.key)!;
        const isOpen = open === f.key;
        return (
          <Card key={f.key}>
            <div className="cr-fit">
              <span className="cr-fit-score" title="Weighted fit, 1 to 5">{f.score ? f.score.toFixed(1) : "–"}</span>
              <div>
                <p><strong>{p.name}</strong> <span className="sh-muted">· {p.kind === "state" ? "US state" : "country"}{shortlisted.has(f.key) ? " · shortlisted" : ""}</span></p>
                <p>{p.line}</p>
                <p className="sh-hint">{fitWords(f.score)}{f.strong.length ? ` Strong on ${f.strong.map((x) => FACTOR_LABEL[x].toLowerCase()).join(", ")}.` : ""}{f.weak.length ? ` Thin on ${f.weak.map((x) => FACTOR_LABEL[x].toLowerCase()).join(", ")}.` : ""}</p>
                <div className="sh-choices">
                  <Btn variant="ghost" onClick={() => setOpen(isOpen ? null : f.key)}>{isOpen ? "Close" : "Details and ratings"}</Btn>
                  <Btn variant="secondary" disabled={busy} onClick={() => void run(() => setPlace({ key: f.key, shortlisted: !shortlisted.has(f.key) }))}>{shortlisted.has(f.key) ? "Take off the shortlist" : "Shortlist"}</Btn>
                  <Btn variant="ghost" disabled={busy} onClick={() => void run(() => setSettings({ chosenPlace: f.key, path: p.kind === "state" ? "domestic" : "abroad" }))}>This is the one</Btn>
                </div>
              </div>
            </div>
            {isOpen && (
              <div className="mt-3">
                {p.fits && <p><strong>Why it fits:</strong> {p.fits}</p>}
                {p.watch && <p><strong>Watch out:</strong> {p.watch}</p>}
                {p.path && <p><strong>The legal path:</strong> {p.path}</p>}
                <div className="cr-bars mt-3">
                  {FACTORS.map((factor) => (
                    <div key={factor} className="cr-bar">
                      <span>{FACTOR_LABEL[factor]}</span>
                      <span className="cr-dots" role="group" aria-label={FACTOR_LABEL[factor]}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" className={`cr-dot ${p.ratings[factor] >= n ? "on" : ""}`} aria-label={`${n}`} disabled={busy} onClick={() => void run(() => setPlace({ key: f.key, ratings: { ...(data.overrides.find((x) => x.key === f.key)?.ratings as object ?? {}), [factor]: n } }))} />
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                <Field label="Our note on this place">
                  <input className="sh-input" defaultValue={data.overrides.find((x) => x.key === f.key)?.note ?? ""} maxLength={600} onBlur={(e) => void run(() => setPlace({ key: f.key, note: e.target.value }))} />
                </Field>
                {f.key.startsWith("custom-") && <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removePlace({ key: f.key }))}>Remove this place</button>}
              </div>
            )}
          </Card>
        );
      })}
      <Card tone="alt">
        <h2 className="sh-h2">Add a place</h2>
        <div className="sh-row sh-wrap">
          <input className="sh-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Country or state" aria-label="Name" />
          <select className="sh-input" value={kind} onChange={(e) => setKind(e.target.value as "country" | "state")} aria-label="Kind"><option value="country">Country</option><option value="state">US state</option></select>
          <Btn disabled={busy || !name.trim()} onClick={() => void run(async () => { await addPlace({ name, kind }); setName(""); })}>Add</Btn>
        </div>
        <ErrorNote error={error} />
      </Card>
      <p className="sh-hint">Check before deciding: {SOURCES.map((s) => s.name).join(", ")}. All on the Sources page.</p>
    </div>
  );
}
