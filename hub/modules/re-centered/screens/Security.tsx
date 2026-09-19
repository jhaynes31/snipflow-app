"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WHERE_LABEL, type SecurityWhere } from "@/convex/reCentered/pure";
import { Btn, Card, ErrorNote, PageTitle, Spinner, useAction } from "@/core/ui";

/** One tap a day, optional. Dots for the month so drift is visible over time. No target line. */
export function Security() {
  const [ym, setYm] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const month = useQuery(api.reCentered.entries.tapsForMonth, ym);
  const tap = useMutation(api.reCentered.entries.tapToday);
  const { busy, error, run } = useAction();
  const byDay = new Map((month?.taps ?? []).map((t) => [t.day, t.where]));
  const todayWhere = month ? byDay.get(month.today) : undefined;
  const label = new Date(ym.year, ym.month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = new Date(ym.year, ym.month - 1, 1).getDay();

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Where I stand today" subtitle="Where is my security sitting right now? One tap. No score, no goal, just noticing over months." />
      <Card>
        <ErrorNote error={error} />
        <div className="sh-stack">
          {(Object.keys(WHERE_LABEL) as SecurityWhere[]).map((k) => (
            <Btn key={k} big variant={todayWhere === k ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => tap({ where: k }))}>
              {WHERE_LABEL[k]}
            </Btn>
          ))}
        </div>
        {todayWhere && <p className="sh-muted mt-3">Marked for today. Tap another to change it.</p>}
      </Card>
      <Card tone="alt">
        <div className="sh-row sh-wrap">
          <h2 className="sh-h2">{label}</h2>
          <Btn variant="ghost" onClick={() => setYm(ym.month === 1 ? { year: ym.year - 1, month: 12 } : { year: ym.year, month: ym.month - 1 })}>Earlier</Btn>
          <Btn variant="ghost" onClick={() => setYm(ym.month === 12 ? { year: ym.year + 1, month: 1 } : { year: ym.year, month: ym.month + 1 })}>Later</Btn>
        </div>
        {!month ? (
          <Spinner />
        ) : (
          <div className="rc-dots" aria-label={`Days of ${label}`}>
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <span key={`pad${i}`} />
            ))}
            {month.days.map((d) => {
              const w = byDay.get(d);
              return (
                <span key={d} className={`rc-dot${d === month.today ? " is-today" : ""}`} data-where={w} title={w ? `${d}: ${WHERE_LABEL[w]}` : d}>
                  {Number(d.slice(-2))}
                </span>
              );
            })}
          </div>
        )}
        <div className="rc-legend mt-3">
          {(Object.keys(WHERE_LABEL) as SecurityWhere[]).map((k) => (
            <span key={k}>
              <span className="rc-dot" data-where={k} aria-hidden /> {WHERE_LABEL[k]}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
