"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { describeLine, STATUS_LABEL } from "@/convex/keptWord/pure";
import { Card, PageTitle, Spinner } from "@/core/ui";

/**
 * The app-written weeks. Every closed word with its outcome, in date order,
 * in the same type. No counts, no percentages, no colors. The same page
 * for both people.
 */
export function Weeks() {
  const record = useQuery(api.keptWord.words.record);
  if (!record) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Weeks" subtitle="Written by the app from the record, never by either of you. What was kept sits beside what wasn't." />
      {record.weeks.length === 0 && (
        <Card>
          <p className="sh-muted">Nothing closed yet. Once a word is kept, or not, its week appears here.</p>
        </Card>
      )}
      {record.weeks.map((week) => (
        <Card key={week.weekStart}>
          <h2 className="sh-h2">Week of {week.weekStart}</h2>
          <p className="sh-hint">{week.weekStart} to {week.weekEnd}</p>
          {week.lines.map((l, i) => (
            <p key={i} className="kw-week-line">
              <span className="kw-status">{STATUS_LABEL[l.status]}</span> {describeLine(l, record.names[l.giverId] ?? "Someone")}
            </p>
          ))}
        </Card>
      ))}
    </div>
  );
}
