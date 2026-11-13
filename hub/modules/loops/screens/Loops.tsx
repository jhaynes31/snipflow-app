"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { Ring } from "../Ring";
import { THEMES, type LoopTheme } from "../theme";

/** The list: each loop as a small ring, the spouse's shared loops, and the door to a new one. */
export function Loops({ theme }: { theme: LoopTheme }) {
  const t = THEMES[theme];
  const { partner } = useHub();
  const loops = useQuery(api.loops.entries.mine);
  const theirs = useQuery(api.loops.entries.partners);
  const signals = useQuery(api.loops.entries.mySignals);
  const sendSignal = useMutation(api.loops.entries.sendSignal);
  const { busy, error, run } = useAction();
  const [now] = useState(() => Date.now());
  if (!loops) return <Spinner />;
  return (
    <>
      <PageTitle title={t.toolName} subtitle="Success isn't never looping again. It's noticing earlier and getting out faster. Each time around, the catch point moves." action={<Link href={`${t.mount}/new`} className="sh-btn sh-btn-primary">+ New loop</Link>} />
      <ErrorNote error={error} />
      {loops.length === 0 ? (
        <Card>
          <p className="sh-muted">No loops mapped yet. The first one is usually the one you&apos;re most tired of.</p>
          <Link href={`${t.mount}/new`} className="sh-btn sh-btn-primary">Map my first loop</Link>
        </Card>
      ) : (
        <div className="lp-grid">
          {loops.map((l) => (
            <Link key={l._id} href={`${t.mount}/${l._id}`} className="lp-thumb">
              <Ring theme={t} stages={l.stages} hereId={l.lastCheck && !l.lastCheck.outcome && now - l.lastCheck.at < 6 * 3600_000 ? l.lastCheck.stageId : null} compact />
              <strong>{l.name}</strong>
              <span className="sh-hint">{l.lastCheck ? `last marked ${timeAgo(l.lastCheck.at)}` : "nothing marked yet"}{l.level !== "private" ? ` · shared (${l.level === "nameOnly" ? "name" : "with signal"})` : ""}</span>
            </Link>
          ))}
        </div>
      )}
      {loops.some((l) => l.level === "signal") && (
        <Card tone="alt">
          <h2 className="sh-h2">Send a signal</h2>
          <p className="sh-hint">For a loop shared with signal: {partner?.displayName ?? "your spouse"} gets your word, the line &ldquo;I&apos;m in it, I don&apos;t want to explain, please just be kind&rdquo;, and three kind replies to pick from. Nothing else.</p>
          <div className="sh-choices">
            {loops.filter((l) => l.level === "signal").map((l) => <Btn key={l._id} disabled={busy} onClick={() => void run(() => sendSignal({ loopId: l._id }))}>{l.signalToken ?? "🍂"} {l.name}</Btn>)}
          </div>
          {signals && signals.length > 0 && <p className="sh-hint">Last signal {timeAgo(signals[0].at)}{signals[0].response ? `: they said "${signals[0].response}"` : ", no reply yet"}.</p>}
        </Card>
      )}
      {theirs && theirs.length > 0 && (
        <Card>
          <h2 className="sh-h2">{partner?.displayName ?? "Your spouse"}&apos;s loops they chose to share</h2>
          <p className="sh-hint">Names only, and a quiet note when they&apos;ve marked &ldquo;I&apos;m in it&rdquo; on a loop shared with signal. Nothing else ever shows here. An invitation for support, not a window.</p>
          {theirs.map((l) => <p key={l._id} className="lp-entry">{l.name}{l.inIt ? <span className="sh-muted"> · in it, {timeAgo(l.inIt)}. A kind word helps more than a question.</span> : ""}</p>)}
        </Card>
      )}
      <Note>Every loop is private unless you share it, per loop, from its Settings tab. Your spouse can never edit anything here.</Note>
    </>
  );
}
