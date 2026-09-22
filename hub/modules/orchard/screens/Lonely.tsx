"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LONELY_CHOICE_LABEL, LONELY_MOVES, LONELY_TRUTHS, type LonelyChoice } from "@/convex/orchard/pure";
import { pickForDay } from "@/convex/reCentered/pure";
import { CoachChat } from "@/core/coach/CoachChat";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";

/**
 * The lonely hour. Loneliness is the cost of the inner work and a season,
 * not an emergency, and it's exactly when the old pattern reaches for the
 * nearest person. This screen holds the people you released, with why, and
 * the moves that fill instead. What you chose gets logged, so the season
 * can show what loneliness became.
 */
export function Lonely() {
  const { partner } = useHub();
  const data = useQuery(api.orchard.entries.lonely);
  const log = useMutation(api.orchard.entries.logLonely);
  const { busy, error, run } = useAction();
  const [wanted, setWanted] = useState("");
  const [chosen, setChosen] = useState<LonelyChoice | null>(null);
  const [talk, setTalk] = useState(false);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const [now] = useState(() => Date.now());
  if (!data) return <Spinner />;
  const truth = pickForDay(LONELY_TRUTHS, day);
  const thisSeason = data.rows.filter((r) => now - r.createdAt < 90 * 86_400_000);
  const counts = thisSeason.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.choice]: (acc[r.choice] ?? 0) + 1 }), {});

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The lonely hour" subtitle="It's here. That's allowed. This page is for not rebuilding the same friendships out of it." />
      <p className="or-truth">{truth}</p>

      {data.released.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Not these</h2>
          <p className="sh-muted">You released or rested them for reasons. Read the reason before the lonely hour rewrites it.</p>
          {data.released.map((p) => (
            <p key={p._id} className="or-entry">
              <strong>{p.name}</strong> <span className="sh-muted">· {p.state}{p.why ? ` · ${p.why}` : ""}</span>
            </p>
          ))}
        </Card>
      )}

      <Card>
        <h2 className="sh-h2">Instead</h2>
        {LONELY_MOVES.map((m) => (
          <div key={m.key} className="or-entry">
            <p>{m.text}</p>
            {m.key === "smallAsk" && data.reachable.length > 0 && (
              <p className="sh-muted">People in the right layers: {data.reachable.map((p) => p.name).join(", ")}.</p>
            )}
            {m.key === "partner" && partner && <p className="sh-muted">{partner.displayName} is one <Link href="/heads-up/new" className="sh-link">heads-up</Link> away.</p>}
            {m.key === "god" && <p className="sh-muted"><Link href="/the-well/talking" className="sh-link">Talking with him</Link>, in The Well.</p>}
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="sh-h2">What I did with it</h2>
        <Field label="Who or what I wanted to reach for (optional)" hint="Naming it takes the charge out.">
          <input className="sh-input" value={wanted} onChange={(e) => setWanted(e.target.value)} maxLength={200} />
        </Field>
        <div className="sh-chips">
          {(Object.keys(LONELY_CHOICE_LABEL) as LonelyChoice[]).map((c) => (
            <button key={c} type="button" className="sh-chip" aria-pressed={chosen === c} onClick={() => setChosen(c)}>{LONELY_CHOICE_LABEL[c]}</button>
          ))}
        </div>
        <CrisisNotice texts={[wanted]} />
        <ErrorNote error={error} />
        <div className="sh-choices mt-2">
          <Btn disabled={busy || !chosen} onClick={() => void run(async () => { await log({ choice: chosen!, wanted: wanted || undefined }); setChosen(null); setWanted(""); })}>Log it</Btn>
          <Btn variant="secondary" onClick={() => setTalk((v) => !v)}>{talk ? "Close the coach" : "Talk it through"}</Btn>
        </div>
        {chosen === "reachedBack" && <p className="sh-muted mt-2">Logged honestly is still a win. Tomorrow, re-read why you released them.</p>}
      </Card>

      {talk && <CoachChat module="orchard" task="orchard.lonely" opening={`It's a lonely hour. ${wanted ? `I want to reach for: ${wanted}.` : ""} People I've released, with why: ${data.released.map((p) => `${p.name}${p.why ? ` (${p.why})` : ""}`).join("; ") || "none"}. People in the right layers to make a small ask: ${data.reachable.map((p) => p.name).join(", ") || "none yet"}.`} placeholder="Say what tonight feels like." />}

      {thisSeason.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">This season</h2>
          <p className="sh-muted">
            {thisSeason.length} lonely {thisSeason.length === 1 ? "hour" : "hours"} logged. {Object.entries(counts).map(([k, n]) => `${LONELY_CHOICE_LABEL[k as LonelyChoice].toLowerCase()} ${n}`).join(", ")}.
          </p>
        </Card>
      )}

      <Note>
        A quiet orchard is still an orchard. If the loneliness starts to feel like more than a season, <Link href="/renewed-mind/captive" className="sh-link">Take It Captive</Link> is for the line it&apos;s saying about you, and <Link href="/help-now" className="sh-link">Need help now</Link> is always there.
      </Note>
    </div>
  );
}
