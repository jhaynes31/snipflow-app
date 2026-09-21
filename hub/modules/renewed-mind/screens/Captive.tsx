"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CHECK_LABEL, type Check } from "@/convex/renewedMind/pure";
import { CrisisNotice } from "@/core/safety/CrisisNotice";
import { Btn, Card, ErrorNote, Field, LinkBtn, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";

/**
 * Take It Captive (2 Corinthians 10:5). Two minutes, in the moment: the
 * thought, the feeling it made, the Philippians 4:8 filter, what you'd say
 * to a friend, and the truer line that answers it. Saying the truer line
 * right when the old path fires is the repetition that counts.
 */
export function Captive() {
  const beliefs = useQuery(api.renewedMind.entries.beliefs);
  const recent = useQuery(api.renewedMind.entries.captures);
  const capture = useMutation(api.renewedMind.entries.capture);
  const remove = useMutation(api.renewedMind.entries.removeCapture);
  const { busy, error, run } = useAction();
  const [thought, setThought] = useState("");
  const [feeling, setFeeling] = useState("");
  const [checks, setChecks] = useState<{ isTrue: Check | null; isKind: Check | null; isNecessary: Check | null }>({ isTrue: null, isKind: null, isNecessary: null });
  const [friendSays, setFriendSays] = useState("");
  const [beliefId, setBeliefId] = useState<Id<"rmBeliefs"> | "">("");
  const [done, setDone] = useState<string | null>(null);
  if (!beliefs || !recent) return <Spinner />;
  const active = beliefs.filter((b) => !b.retiredAt);
  const chosen = active.find((b) => b._id === beliefId) ?? null;
  const ready = thought.trim() && checks.isTrue && checks.isKind && checks.isNecessary;

  if (done) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="Captured" />
        <Card>
          <p className="rm-old">{done}</p>
          {chosen ? <p className="rm-new">{chosen.newLine}</p> : <p className="sh-muted">No truer line matched yet. <Link href={`/renewed-mind/beliefs?old=${encodeURIComponent(done)}`} className="sh-link">Write one</Link> when you&apos;re steady.</p>}
          <div className="sh-choices mt-3">
            <Btn onClick={() => { setDone(null); setThought(""); setFeeling(""); setChecks({ isTrue: null, isKind: null, isNecessary: null }); setFriendSays(""); }}>Another</Btn>
            <LinkBtn href="/renewed-mind" variant="secondary">Rehearse</LinkBtn>
            <LinkBtn href="/tend/tools/groundMe" variant="ghost">Ground Me</LinkBtn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Take It Captive" subtitle="Two minutes. The thought that just went through, held up to the light." />
      <Card>
        <Field label="The thought, in its words">
          <input className="sh-input" value={thought} onChange={(e) => setThought(e.target.value)} maxLength={400} />
        </Field>
        <Field label="What it made you feel (optional)">
          <input className="sh-input" value={feeling} onChange={(e) => setFeeling(e.target.value)} maxLength={120} />
        </Field>
        <p className="sh-eyebrow mt-2">Whatever is true, whatever is kind, whatever is necessary</p>
        {(
          [
            ["isTrue", "Is it true?"],
            ["isKind", "Is it kind?"],
            ["isNecessary", "Is it necessary?"],
          ] as const
        ).map(([key, q]) => (
          <div key={key} className="sh-row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ minWidth: "9rem" }}>{q}</span>
            {(["yes", "partly", "no"] as Check[]).map((c) => (
              <Btn key={c} variant={checks[key] === c ? "primary" : "secondary"} onClick={() => setChecks({ ...checks, [key]: c })}>{CHECK_LABEL[c]}</Btn>
            ))}
          </div>
        ))}
        <Field label="What would you say to a friend who thought this? (optional)">
          <textarea className="sh-input sh-textarea" rows={2} value={friendSays} onChange={(e) => setFriendSays(e.target.value)} maxLength={400} />
        </Field>
        {active.length > 0 && (
          <Field label="The truer line that answers it" hint="From your Put Off, Put On list. Say it out loud.">
            <select className="sh-input" value={beliefId} onChange={(e) => setBeliefId(e.target.value as Id<"rmBeliefs"> | "")}>
              <option value="">None of these</option>
              {active.map((b) => <option key={b._id} value={b._id}>{b.newLine}</option>)}
            </select>
          </Field>
        )}
        {chosen && <p className="rm-new">{chosen.newLine}</p>}
        <CrisisNotice texts={[thought, feeling, friendSays]} />
        <ErrorNote error={error} />
        <Btn
          disabled={busy || !ready}
          onClick={() =>
            void run(async () => {
              await capture({ thought, feeling: feeling || undefined, isTrue: checks.isTrue!, isKind: checks.isKind!, isNecessary: checks.isNecessary!, friendSays: friendSays || undefined, beliefId: beliefId || undefined });
              setDone(thought);
            })
          }
        >
          Captured
        </Btn>
      </Card>
      {recent.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Recently captured</h2>
          {recent.slice(0, 10).map((c) => (
            <div key={c._id} className="rm-entry">
              <p className="rm-old">{c.thought}</p>
              <p className="sh-muted">
                True: {CHECK_LABEL[c.isTrue]}. Kind: {CHECK_LABEL[c.isKind]}. Necessary: {CHECK_LABEL[c.isNecessary]}. · {timeAgo(c.createdAt)}
              </p>
              {c.friendSays && <p>{c.friendSays}</p>}
              <Btn variant="ghost" disabled={busy} onClick={() => void run(() => remove({ id: c._id }))}>Delete</Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
