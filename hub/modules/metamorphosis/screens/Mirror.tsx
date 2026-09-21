"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BODY, FEELINGS, SURVIVAL_SIGNS, UNDER, WAY_BACK } from "@/core/metamorphosis/mirror";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, Note, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/** "Right now, am I in survival?" If yes, everything else waits. */
export function SurvivalCheck({ compact }: { compact?: boolean }) {
  const mirror = useMutation(api.metamorphosis.entries.mirror);
  const { busy, error, run } = useAction();
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  if (answer === "yes") return <WayBack />;
  if (answer === "no") return compact ? null : <MirrorForm />;
  return (
    <Card>
      <p className="sh-eyebrow">First, quietly</p>
      <p className="mm-line"><strong>Right now, am I in survival?</strong></p>
      <ul className="sh-list sh-muted">
        {SURVIVAL_SIGNS.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <ErrorNote error={error} />
      <div className="sh-choices mt-3">
        <Btn big variant="secondary" disabled={busy} onClick={() => void run(async () => { await mirror({ survival: true }); setAnswer("yes"); })}>Yes, I think so</Btn>
        <Btn big disabled={busy} onClick={() => setAnswer("no")}>No, I&apos;m here</Btn>
      </div>
    </Card>
  );
}

function WayBack() {
  return (
    <Card>
      <p className="sh-eyebrow">The Way Back</p>
      <p className="mm-line">Then nothing else matters right now. Growth can wait until you&apos;re back. This is the way back, one step, then the next.</p>
      <ol className="sh-list mt-3">
        {WAY_BACK.map((w, i) => (
          <li key={i} className="mm-entry">
            <p><strong>{i + 1}. {w.step}</strong></p>
            <p className="sh-muted">{w.why}</p>
          </li>
        ))}
      </ol>
      <div className="sh-choices mt-3">
        <LinkBtn href="/metamorphosis/map" variant="secondary">The Map</LinkBtn>
        <LinkBtn href="/tend/tools/groundMe" variant="secondary">Ground Me, in Tend</LinkBtn>
        <LinkBtn href="/renewed-mind/captive" variant="secondary">Take It Captive</LinkBtn>
        <LinkBtn href="/help-now" variant="ghost">Need help now</LinkBtn>
      </div>
    </Card>
  );
}

function MirrorForm() {
  const mirror = useMutation(api.metamorphosis.entries.mirror);
  const { busy, error, run } = useAction();
  const [feeling, setFeeling] = useState<string | null>(null);
  const [under, setUnder] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [want, setWant] = useState("");
  const [saved, setSaved] = useState(false);
  if (saved) {
    return (
      <Card>
        <Note>Noted. That&apos;s the whole check-in. Naming it is most of the work.</Note>
        {want.trim() && <p className="mt-3">You said you want: <strong>{want}</strong>. That counts. Wanting is allowed in here.</p>}
      </Card>
    );
  }
  return (
    <Card>
      <p className="sh-label">Name it</p>
      {FEELINGS.map((g) => (
        <div key={g.group} className="mb-2">
          <span className="sh-eyebrow">{g.group}</span>
          <div className="mm-feelings">
            {g.words.map((w) => (
              <button key={w} type="button" className="sh-chip" aria-pressed={feeling === w} style={feeling === w ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setFeeling(w)}>{w}</button>
            ))}
          </div>
        </div>
      ))}
      {feeling && (
        <>
          <p className="sh-label mt-3">What&apos;s under it?</p>
          <div className="mm-feelings">
            {UNDER.map((u) => (
              <button key={u} type="button" className="sh-chip" aria-pressed={under === u} style={under === u ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setUnder(u)}>{u}</button>
            ))}
          </div>
          <p className="sh-label mt-3">Body</p>
          <div className="mm-feelings">
            {BODY.map((b) => (
              <button key={b} type="button" className="sh-chip" aria-pressed={body === b} style={body === b ? { background: "var(--tile-accent)", color: "var(--tile-on-accent)" } : undefined} onClick={() => setBody(b)}>{b}</button>
            ))}
          </div>
          <Field label="What do I want right now?" hint="Anything. Small counts. 'Nothing' is an answer too, and worth noticing.">
            <input className="sh-input" value={want} onChange={(e) => setWant(e.target.value)} maxLength={300} />
          </Field>
          <CrisisNotice texts={[want]} />
        </>
      )}
      <ErrorNote error={error} />
      <Btn big disabled={busy || !feeling} onClick={() => void run(async () => { await mirror({ survival: false, feeling: feeling!, under: under ?? undefined, body: body ?? undefined, want: want || undefined }); setSaved(true); })}>
        That&apos;s where I am
      </Btn>
    </Card>
  );
}

export function Mirror() {
  const data = useQuery(api.metamorphosis.entries.mirrorToday);
  const remove = useMutation(api.metamorphosis.entries.removeMirror);
  const { busy, run } = useAction();
  if (!data) return <Spinner />;
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="The Mirror" subtitle="For a man told feelings are weakness. Name it, what's under it, body, what you want. It builds a vocabulary over months. Nothing here is counted." />
      <SurvivalCheck />
      {data.recent.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Lately</h2>
          {data.recent.slice(0, 20).map((r) => (
            <div key={r._id} className="mm-entry">
              <p>
                {r.survival ? <strong>Survival. </strong> : null}
                {r.feeling}{r.under ? <span className="sh-muted"> · under it: {r.under}</span> : null}{r.body ? <span className="sh-muted"> · {r.body}</span> : null}
              </p>
              {r.want && <p>Wanted: {r.want}</p>}
              <p className="sh-hint">
                {r.day} · {timeAgo(r.createdAt)} ·{" "}
                <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => remove({ id: r._id }))}>Delete</button>
              </p>
            </div>
          ))}
          <p className="sh-hint">Patterns here feed only your own season in Seasons, and only if you turn that on. Your check-ins in <Link href="/check-in" className="sh-link">Tend</Link> stay separate.</p>
        </Card>
      )}
    </div>
  );
}
