"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { readTendSettings } from "@/convex/tend/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/**
 * Put Off, Put On (Ephesians 4:22-24). An old line, where it came from, and
 * the truer line in your own words, with a verse to stand it on if faith is
 * on. The words are yours; that is what makes them stick.
 */
export function Beliefs() {
  return (
    <Suspense fallback={<Spinner />}>
      <BeliefsInner />
    </Suspense>
  );
}

function BeliefsInner() {
  const params = useSearchParams();
  const { profile, partner } = useHub();
  const faith = readTendSettings(profile.moduleSettings).faith;
  const rows = useQuery(api.renewedMind.entries.beliefs);
  const shared = useQuery(api.renewedMind.entries.partnersShared);
  const add = useMutation(api.renewedMind.entries.addBelief);
  const retire = useMutation(api.renewedMind.entries.retireBelief);
  const setVisibility = useMutation(api.renewedMind.entries.setBeliefVisibility);
  const remove = useMutation(api.renewedMind.entries.removeBelief);
  const { busy, error, run } = useAction();
  const [oldLine, setOldLine] = useState(() => params.get("old") ?? "");
  const [origin, setOrigin] = useState("");
  const [newLine, setNewLine] = useState("");
  const [verse, setVerse] = useState(() => params.get("ref") ?? "");
  const [verseText, setVerseText] = useState("");
  if (!rows || !shared) return <Spinner />;
  const active = rows.filter((b) => !b.retiredAt);
  const retired = rows.filter((b) => b.retiredAt);

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Put Off, Put On" subtitle="Name the line that runs you. Then write the truer one, in your words. Put off the old; put on the new." />
      <Card>
        <Field label="The old line" hint="Its exact words, the way it sounds in your head. &ldquo;I'm too much.&rdquo; &ldquo;If I stop, everything falls apart.&rdquo;">
          <input className="sh-input" value={oldLine} onChange={(e) => setOldLine(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Where it came from (optional)" hint="A person, a place, a year. Naming the source loosens its grip.">
          <input className="sh-input" value={origin} onChange={(e) => setOrigin(e.target.value)} maxLength={400} />
        </Field>
        <Field label="The truer line" hint="Yours, not a slogan. Say it out loud once before you save it.">
          <textarea className="sh-input sh-textarea" rows={2} value={newLine} onChange={(e) => setNewLine(e.target.value)} maxLength={300} />
        </Field>
        {faith && (
          <>
            <Field label="A verse to stand it on (optional)" hint="A reference, like Romans 8:1. The words are yours to paste below if you want them read back.">
              <input className="sh-input" value={verse} onChange={(e) => setVerse(e.target.value)} maxLength={80} />
            </Field>
            <Field label="The verse's words (optional)">
              <textarea className="sh-input sh-textarea" rows={2} value={verseText} onChange={(e) => setVerseText(e.target.value)} maxLength={600} />
            </Field>
          </>
        )}
        <CrisisNotice texts={[oldLine, origin, newLine]} />
        <ErrorNote error={error} />
        <Btn
          disabled={busy || !oldLine.trim() || !newLine.trim()}
          onClick={() =>
            void run(async () => {
              await add({ oldLine, origin: origin || undefined, newLine, verse: verse || undefined, verseText: verseText || undefined });
              setOldLine("");
              setOrigin("");
              setNewLine("");
              setVerse("");
              setVerseText("");
            })
          }
        >
          Put it on
        </Btn>
      </Card>

      <Card>
        <h2 className="sh-h2">In rotation</h2>
        {active.length === 0 && <p className="sh-muted">Nothing yet. One is enough to start.</p>}
        {active.map((b) => (
          <BeliefRow key={b._id} b={b} busy={busy} partnerName={partner?.displayName ?? "your partner"} onRetire={() => void run(() => retire({ id: b._id, retired: true }))} onShare={(v) => void run(() => setVisibility({ id: b._id, visibility: v ? "shared" : "private" }))} onRemove={() => void run(() => remove({ id: b._id }))} />
        ))}
      </Card>

      {retired.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Set down</h2>
          <p className="sh-muted">Lines that have done their work. Their evidence stays.</p>
          {retired.map((b) => (
            <div key={b._id} className="rm-entry">
              <p className="rm-old">{b.oldLine}</p>
              <p>{b.newLine}</p>
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => retire({ id: b._id, retired: false }))}>Back into rotation</Btn>
            </div>
          ))}
        </Card>
      )}

      {shared.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">{partner?.displayName ?? "Your partner"} chose to share</h2>
          {shared.map((s) => (
            <p key={s._id} className="rm-entry">
              {s.newLine}
              {s.verse ? <span className="sh-muted"> · {s.verse}</span> : null}
            </p>
          ))}
        </Card>
      )}

      <Note>
        Private unless you share a single line on purpose. <Link href="/the-well/lies" className="sh-link">Lies and truth</Link> in The Well has starter cards with a &ldquo;Make this mine&rdquo; button that fills in the old line for you.
      </Note>
    </div>
  );
}

function BeliefRow({ b, busy, partnerName, onRetire, onShare, onRemove }: { b: Doc<"rmBeliefs">; busy: boolean; partnerName: string; onRetire: () => void; onShare: (v: boolean) => void; onRemove: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="rm-entry">
      <p className="rm-old">{b.oldLine}</p>
      <p className="rm-new">{b.newLine}</p>
      {b.origin && <p className="sh-muted">From: {b.origin}</p>}
      {b.verse && <p className="sh-muted">{b.verse}{b.verseText ? `: ${b.verseText}` : ""}</p>}
      <Toggle checked={b.visibility === "shared"} onChange={onShare} label={`Let ${partnerName} see this line`} hint="Only the truer line. Never the old one, its source, or your answers." />
      <div className="sh-choices">
        <Link href={`/renewed-mind/evidence?belief=${b._id}`} className="sh-btn sh-btn-secondary">Evidence</Link>
        <Btn variant="ghost" disabled={busy} onClick={onRetire}>Set it down</Btn>
        {!confirm ? (
          <Btn variant="ghost" disabled={busy} onClick={() => setConfirm(true)}>Delete</Btn>
        ) : (
          <>
            <Btn variant="ghost" disabled={busy} onClick={onRemove}>Yes, delete it and its evidence</Btn>
            <Btn variant="ghost" onClick={() => setConfirm(false)}>Keep it</Btn>
          </>
        )}
      </div>
    </div>
  );
}
