"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PATHS, pathByKey, pathPassages, readWellPath, type PathKey } from "@/core/well/paths";
import { pickForDay } from "@/convex/reCentered/pure";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, PageTitle, useAction } from "@/core/ui";
import { Passage } from "../components/Passage";

/**
 * For me: the path a person chooses for themselves. Chosen, never assumed,
 * and changeable. Passages with plain notes, and a section on how each has
 * been used against people, because both of them have heard that version.
 */
export function ForMe({ section }: { section?: string }) {
  const { profile } = useHub();
  const setModuleSettings = useMutation(api.profiles.setModuleSettings);
  const { busy, error, run } = useAction();
  const chosen = readWellPath(profile.moduleSettings);
  const path = pathByKey(chosen ?? undefined);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));

  async function choose(key: PathKey | null) {
    const well = (profile.moduleSettings?.well as Record<string, unknown> | undefined) ?? {};
    await setModuleSettings({ moduleId: "well", settings: { ...well, path: key } });
  }

  if (!path) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="For me" subtitle="Passages and plain notes for the path you choose. Chosen by you, not assumed, and changeable any time." />
        <ErrorNote error={error} />
        <div className="sh-stack">
          {PATHS.map((p) => (
            <Card key={p.key}>
              <h2 className="sh-h2">{p.title}</h2>
              <p className="sh-muted">{p.tagline}</p>
              <Btn disabled={busy} onClick={() => void run(() => choose(p.key))}>This one is for me</Btn>
            </Card>
          ))}
        </div>
        <p className="sh-hint">Only you see your choice. It shapes this page, a card on Today, and how the coach answers you inside The Well.</p>
      </div>
    );
  }

  const daily = pickForDay(pathPassages(path), day)!;
  const open = section ? path.sections.find((s) => s.title.toLowerCase().replace(/[^a-z]+/g, "-") === section) : undefined;

  if (open) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title={open.title} subtitle={open.line} action={<Link href="/the-well/for-me" className="sh-link">Back</Link>} />
        {open.passages.map((p, i) => (
          <Card key={i}>
            <p className="well-did">{p.note}</p>
            <div className="mt-3">
              <Passage r={p.ref} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={path.title} subtitle={path.tagline} />
      <Card>
        <p className="sh-eyebrow">Today, for you · {daily.section}</p>
        <p className="well-did">{daily.note}</p>
        <div className="mt-3">
          <Passage r={daily.ref} />
        </div>
      </Card>
      <div className="sh-tiles">
        {path.sections.map((s) => (
          <Link key={s.title} href={`/the-well/for-me/${s.title.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="sh-tile">
            <span className="sh-tile-name">{s.title}</span>
            <span className="sh-tile-tagline">{s.line}</span>
          </Link>
        ))}
      </div>
      <ErrorNote error={error} />
      <p className="sh-hint">
        A first draft for you to review line by line.{" "}
        <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => choose(null))}>Change my path</button>
      </p>
    </div>
  );
}
