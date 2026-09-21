"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FELT_LABEL, FOUNDATIONS, type FeltTrue } from "@/convex/renewedMind/pure";
import { speak } from "@/core/well/bible";
import { Btn, Card, ErrorNote, LinkBtn, Note, PageTitle, Spinner, Toggle, useAction } from "@/core/ui";

/**
 * Rehearse: one line a day. The old line shows first; the truer one stays
 * hidden until you've said it, because remembering it is what wears the new
 * path, not reading it. Then one answer: felt true today? Never a score.
 */
export function Rehearse() {
  const t = useQuery(api.renewedMind.entries.today);
  const rehearse = useMutation(api.renewedMind.entries.rehearse);
  const setSettings = useMutation(api.renewedMind.entries.setSettings);
  const { busy, error, run } = useAction();
  const [revealed, setRevealed] = useState<string | null>(null);
  if (!t) return <Spinner />;

  if (!t.pick) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Renewed Mind" subtitle="As a man thinks in his heart, so is he. This is where the thinking gets rewritten, one line at a time, in your own words." />
        <Card>
          <p>Nothing to rehearse yet. Start with one belief that runs you, and the truer line you&apos;d rather stand on.</p>
          <div className="sh-choices mt-3">
            <LinkBtn href="/renewed-mind/beliefs">Put Off, Put On</LinkBtn>
            <LinkBtn href="/the-well/lies" variant="secondary">Start from a lie in The Well</LinkBtn>
          </div>
        </Card>
        <Foundations />
      </div>
    );
  }

  const b = t.pick;
  const shown = revealed === b._id || Boolean(t.doneToday);
  const answered = t.doneToday?.feltTrue ?? null;

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Today's line" subtitle="Read the old one. Say the new one out loud before you look. Then one honest answer." />
      <Card>
        <p className="sh-eyebrow">The old line</p>
        <p className="rm-old">{b.oldLine}</p>
        <p className="sh-eyebrow mt-3">The truer line</p>
        <p className={`rm-new ${shown ? "" : "rm-hidden"}`} aria-hidden={!shown}>{b.newLine}</p>
        {!shown ? (
          <div className="sh-choices mt-3">
            <Btn onClick={() => setRevealed(b._id)}>I&apos;ve said it. Show me.</Btn>
          </div>
        ) : (
          <>
            {b.verse && (
              <p className="sh-muted mt-2">
                {b.verse}
                {b.verseText ? `: ${b.verseText}` : ""}
              </p>
            )}
            <div className="sh-choices mt-2">
              <Btn variant="ghost" onClick={() => speak(b.newLine)}>Read it to me</Btn>
            </div>
            <p className="mt-3"><strong>Felt true today?</strong></p>
            <div className="sh-choices">
              {(["notYet", "aLittle", "mostly"] as FeltTrue[]).map((k) => (
                <Btn key={k} variant={answered === k ? "primary" : "secondary"} disabled={busy} onClick={() => void run(() => rehearse({ beliefId: b._id, feltTrue: k }))}>
                  {FELT_LABEL[k]}
                </Btn>
              ))}
            </div>
            {answered && <p className="sh-muted mt-2">Noted. Not yet is a fine answer; the path is being worn either way.</p>}
          </>
        )}
        <ErrorNote error={error} />
      </Card>
      <Card tone="alt">
        <Toggle checked={t.rehearseDaily} onChange={(v) => void run(() => setSettings({ rehearseDaily: v }))} label="Show today's line on my home screen" hint="One quiet line in the Today row until you've answered. No reminder, no count." />
        <p className="sh-muted mt-2">
          {t.active} {t.active === 1 ? "line" : "lines"} in rotation. <Link href="/renewed-mind/beliefs" className="sh-link">Add or change them</Link>.
        </p>
      </Card>
      <Foundations />
    </div>
  );
}

function Foundations() {
  return (
    <Note>
      <p className="sh-eyebrow">What this stands on</p>
      {FOUNDATIONS.map((f) => (
        <p key={f.ref} className="sh-muted">
          <strong>{f.ref}.</strong> {f.line}
        </p>
      ))}
      <p className="sh-muted mt-2">
        A belief is a worn path. Catching the old thought, saying the truer one at that moment, and gathering evidence that it holds: that is how a path gets rewritten. Repetition is the work; shame is never part of it.
      </p>
    </Note>
  );
}
