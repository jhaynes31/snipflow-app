"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, PageTitle, Spinner, timeAgo } from "@/core/ui";

const COLUMN: Record<string, string> = { practical: "Practical", emotional: "Emotional", spiritual: "Spiritual" };
const SECTION: Record<string, string> = { howToLoveMe: "How to love me when I'm low", whatHelps: "What helps" };

/**
 * Ways to show up. Private to the viewer, about their partner, built only
 * from what the partner already shared. Specific and plain, so considering
 * them doesn't depend on being asked.
 */
export function Ways() {
  const ways = useQuery(api.keptWord.ways.forMe);
  if (ways === undefined) return <Spinner />;
  if (ways === null) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Ways to show up" />
        <Card>
          <p className="sh-muted">Your partner hasn&apos;t joined yet.</p>
        </Card>
      </div>
    );
  }
  const name = ways.partnerName;
  const empty = ways.menu.length === 0 && ways.sections.length === 0 && ways.openAsks.length === 0 && ways.notNowAsks.length === 0;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Ways to show up" subtitle={`Only you see this page. It is built from what ${name} has already shared, so you can consider them without being asked.`} />
      {empty && (
        <Card>
          <p className="sh-muted">{name} hasn&apos;t shared a Love Menu, manual sections, or asks yet. When they do, specific ways to show up appear here.</p>
        </Card>
      )}
      {ways.openAsks.length > 0 && (
        <Card>
          <h2 className="sh-h2">{name} asked, and it&apos;s waiting on you</h2>
          {ways.openAsks.map((a) => (
            <div key={a._id} className="kw-word">
              <span className="kw-word-text">{a.text}</span>
              <span className="kw-meta">Asked {timeAgo(a.createdAt)}. <Link href="/kept-word/asks" className="sh-link">Answer it</Link></span>
            </div>
          ))}
        </Card>
      )}
      {ways.menu.length > 0 && (
        <Card>
          <h2 className="sh-h2">{name}&apos;s Love Menu</h2>
          <p className="sh-hint">Small things they said they like. Beside each: the last time you logged doing it in Tend.</p>
          {ways.menu.map((m, i) => (
            <div key={i} className="kw-word">
              <span className="kw-word-text">{m.text}</span>
              <span className="kw-meta">
                {COLUMN[m.column] ?? m.column} · {m.lastDone ? `you last logged this ${timeAgo(m.lastDone)}` : "never logged yet"}
              </span>
            </div>
          ))}
          <p className="sh-hint">Do one, then mark it in <Link href="/tend/for-you" className="sh-link">Tend, For you</Link>, and it counts here.</p>
        </Card>
      )}
      {ways.sections.length > 0 && (
        <Card>
          <h2 className="sh-h2">In {name}&apos;s own words</h2>
          {ways.sections.map((s) => (
            <div key={s.key} className="kw-word">
              <span className="kw-meta">{SECTION[s.key] ?? s.key}</span>
              <span className="kw-word-text" style={{ whiteSpace: "pre-wrap" }}>{s.body}</span>
            </div>
          ))}
        </Card>
      )}
      {ways.notNowAsks.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Asks you answered &ldquo;not now&rdquo;</h2>
          <p className="sh-hint">Not now doesn&apos;t have to mean never. These are still here if a better time comes.</p>
          {ways.notNowAsks.map((a) => (
            <div key={a._id} className="kw-word">
              <span className="kw-word-text">{a.text}</span>
              <span className="kw-meta">Answered {timeAgo(a.answeredAt)}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
