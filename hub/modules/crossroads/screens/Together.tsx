"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { QUESTIONS, agreements, differences } from "@/core/crossroads/pure";
import { Card, PageTitle, Spinner } from "@/core/ui";

/** Where you match, where you differ, and what each of you said in your own words. */
export function Together() {
  const data = useQuery(api.crossroads.entries.answers);
  if (!data) return <Spinner />;
  const name = data.partnerName ?? "your partner";
  const agree = agreements(data.mine, data.theirs);
  const differ = differences(data.mine, data.theirs);
  const q = (key: string) => QUESTIONS.find((x) => x.key === key)!;
  const texts = QUESTIONS.filter((x) => x.kind !== "importance");
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Together" subtitle="Where you match, where you differ, and what each of you actually wrote. Differences aren't problems; they're the conversation." />
      {data.theirs.length === 0 && (
        <Card tone="alt"><p className="sh-muted">{name} hasn&apos;t answered yet. This page fills in when both of you have.</p></Card>
      )}
      {agree.length > 0 && (
        <Card>
          <h2 className="sh-h2">You both said this matters a lot</h2>
          <ul className="sh-list">{agree.map((k) => <li key={k} className="cr-entry">{q(k).text}</li>)}</ul>
        </Card>
      )}
      {differ.length > 0 && (
        <Card>
          <h2 className="sh-h2">Where you differ</h2>
          <p className="sh-hint">Two points apart or more, on something at least one of you cares about.</p>
          {differ.map((d) => (
            <p key={d.key} className="cr-entry"><strong>{q(d.key).text}</strong><br /><span className="sh-muted">{data.myName}: {d.a} of 5 · {name}: {d.b} of 5</span></p>
          ))}
        </Card>
      )}
      <Card>
        <h2 className="sh-h2">In your own words</h2>
        {texts.map((question) => {
          const mine = data.mine.find((a) => a.key === question.key)?.text;
          const theirs = data.theirs.find((a) => a.key === question.key)?.text;
          if (!mine && !theirs) return null;
          return (
            <div key={question.key} className="cr-entry">
              <p><strong>{question.text}</strong></p>
              <div className="cr-two">
                <div><p className="sh-eyebrow">{data.myName}</p><p style={{ whiteSpace: "pre-wrap" }}>{mine ?? <span className="sh-muted">Not yet</span>}</p></div>
                <div><p className="sh-eyebrow">{name}</p><p style={{ whiteSpace: "pre-wrap" }}>{theirs ?? <span className="sh-muted">Not yet</span>}</p></div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
