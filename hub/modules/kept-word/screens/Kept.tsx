"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FOR_WHOM_LABEL } from "@/convex/keptWord/pure";
import { Card, PageTitle, Spinner, timeAgo } from "@/core/ui";

/** Every kept word, in date order. Nothing else on this page. */
export function Kept() {
  const record = useQuery(api.keptWord.words.record);
  if (!record) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Kept" subtitle="Every word that was kept, newest first. This page has nothing else on it." />
      <Card>
        {record.kept.length === 0 && <p className="sh-muted">Nothing kept yet. The first one will sit here.</p>}
        {record.kept.map((w) => (
          <div key={w._id} className="kw-word">
            <span className="kw-word-text">{w.text}</span>
            <span className="kw-meta">
              {record.names[w.giverId] ?? "Someone"} · {FOR_WHOM_LABEL[w.forWhom]} · kept {timeAgo(w.closedAt)}
              {w.dueDay ? ` · said by ${w.dueDay}` : ""}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
