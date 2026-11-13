"use client";

import { use } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * A signal from your spouse: "I'm in it. I don't want to explain. Please
 * just be kind." Three easy replies, no advice, no "what happened?".
 */
export default function SignalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const s = useQuery(api.loops.entries.signal, { id: id as Id<"lpSignals"> });
  const respond = useMutation(api.loops.entries.respondSignal);
  const { busy, error, run } = useAction();
  if (s === undefined) return <Spinner />;
  if (s === null) return <div className="sh-container sh-narrow"><Card><p>That signal isn&apos;t here.</p><Link href="/" className="sh-link">Home</Link></Card></div>;
  return (
    <div className="sh-container sh-narrow sh-stack">
      <PageTitle title={`${s.token} from ${s.from}`} subtitle={s.isPartner ? "They're in a loop they're working on. They don't want to explain. They asked for kindness." : "What you sent."} />
      <Card>
        <p className="lp-signal" style={{ fontSize: "1.6rem", textAlign: "center" }}>{s.token}</p>
        {s.loopName && <p className="sh-muted" style={{ textAlign: "center" }}>{s.loopName} · {timeAgo(s.at)}</p>}
        {s.response ? (
          <p style={{ textAlign: "center" }}><strong>{s.isPartner ? "You said" : `${s.from === "your partner" ? "They" : "They"} said`}:</strong> {s.response}</p>
        ) : s.isPartner ? (
          <>
            <ErrorNote error={error} />
            <div className="sh-choices" style={{ justifyContent: "center" }}>
              {s.replies.map((r) => <Btn key={r} big disabled={busy} onClick={() => void run(() => respond({ id: s._id, response: r }))}>{r}</Btn>)}
            </div>
            <p className="sh-hint" style={{ textAlign: "center" }}>No advice, no questions. One kind line is the whole job.</p>
          </>
        ) : (
          <p className="sh-muted" style={{ textAlign: "center" }}>No reply yet. That&apos;s okay; you sent it.</p>
        )}
      </Card>
    </div>
  );
}
