"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CONDITIONS } from "@/convex/apothecary/pure";
import { Card, ErrorNote, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/** The conditions the person shows signs of: what each looks like, how they overlap, and home checks that make real data. */
export function Conditions() {
  const settings = useQuery(api.apothecary.entries.settings);
  const set = useMutation(api.apothecary.entries.setSettings);
  const { busy, error, run } = useAction();
  if (!settings) return <Spinner />;
  const on = new Set(settings.conditions);
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Conditions" subtitle="Turn on the ones you show signs of. Every answer gets read through them, and the home checks produce numbers you can bring anywhere." />
      <ErrorNote error={error} />
      {CONDITIONS.map((c) => (
        <Card key={c.key}>
          <h2 className="sh-h2">{c.name}</h2>
          <Toggle checked={on.has(c.key)} onChange={(v) => void run(() => set({ conditions: v ? [...on, c.key] : [...on].filter((k) => k !== c.key) }))} label="I track this" />
          <p><strong>Looks like.</strong> {c.looksLike}</p>
          <p><strong>Travels with.</strong> {c.overlaps}</p>
          <p className="sh-eyebrow mt-2">Home checks</p>
          <ul className="sh-list">{c.homeChecks.map((h) => <li key={h}>{h}</li>)}</ul>
          <p className="sh-muted">{busy ? "Saving…" : ""}</p>
        </Card>
      ))}
      <Note>None of this is a diagnosis, and it isn&apos;t trying to be. It&apos;s the map the answers are read against, and the data that makes a real diagnosis possible when you choose to pursue one.</Note>
    </div>
  );
}
