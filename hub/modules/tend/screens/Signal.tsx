"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CARD_MAP, CARDS, INTENSITIES, NEED_TYPES, NONVERBAL_TAPS } from "@/core/tend/needCards/cards";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Note, PageTitle, Spinner, useAction } from "@/core/ui";
import { RichTextarea } from "@/core/text/RichTextarea";

/**
 * "I'm struggling": the sender's flow. Pick what's going on (several is
 * fine), then anything else is optional. Two taps is enough: a card, then
 * Send. Shutdown sends at once and opens the non-verbal panel.
 */
export function Signal({ shutdown = false }: { shutdown?: boolean }) {
  const { partner } = useHub();
  const send = useMutation(api.tend.signals.send);
  const { run, error, busy } = useAction();
  const [cards, setCards] = useState<string[]>(shutdown ? ["shutdown"] : []);
  const [needs, setNeeds] = useState<string[]>([]);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<Id<"tnSignals"> | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const flip = (set: React.Dispatch<React.SetStateAction<string[]>>) => (k: string) => set((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  const partnerName = partner?.displayName ?? "your partner";
  const nonverbal = cards.some((c) => CARD_MAP[c]?.nonverbal_mode);

  async function go() {
    const id = await run(() => send({ cards, needs, intensity: intensity ?? undefined, note: note.trim() || undefined, nonverbal }));
    if (id) setSent(id);
  }

  if (sent) return <Sent id={sent} nonverbal={nonverbal} partnerName={partnerName} />;

  if (!partner) {
    return (
      <div className="sh-container sh-narrow">
        <PageTitle title="I'm struggling" />
        <Note>This sends a signal to your partner, and they haven&apos;t signed in yet. Until then, <Link href="/tend/tools" className="sh-link">My tools</Link> is here.</Note>
      </div>
    );
  }

  return (
    <div className="sh-container sh-narrow tn">
      <PageTitle title="I'm struggling" subtitle={`Tell ${partnerName} what's going on. One tap is enough; everything after is optional.`} />
      {shutdown && !busy && cards.length === 1 && step === 1 && (
        <Card tone="alt" className="tn-shutdown">
          <p><strong>Shutdown.</strong> Send now, no more steps.</p>
          <ErrorNote error={error} />
          <Btn big disabled={busy} onClick={() => void go()}>Send</Btn>
        </Card>
      )}
      <Card>
        <p className="sh-label">What&apos;s going on? <span className="sh-muted">Pick every one that fits.</span></p>
        <div className="tn-grid">
          {CARDS.map((c) => (
            <button key={c.id} type="button" className={`tn-card ${cards.includes(c.id) ? "is-on" : ""}`} aria-pressed={cards.includes(c.id)} onClick={() => flip(setCards)(c.id)}>
              <span className="tn-card-title">{c.title}</span>
              <span className="tn-card-sub">{c.subtitle}</span>
            </button>
          ))}
        </div>
        <ErrorNote error={error} />
        <div className="sh-row sh-wrap mt-2">
          <Btn big disabled={busy || cards.length === 0} onClick={() => void go()}>{busy ? "Sending…" : `Send to ${partnerName}`}</Btn>
          {cards.length > 0 && step === 1 && <Btn variant="ghost" onClick={() => setStep(2)}>Add what would help</Btn>}
        </div>
      </Card>
      {step === 2 && (
        <>
          <Card>
            <p className="sh-label">What would help? <span className="sh-muted">Optional. Pick any.</span></p>
            <div className="tn-grid tn-grid-needs">
              {NEED_TYPES.map((n) => (
                <button key={n.id} type="button" className={`tn-card ${needs.includes(n.id) ? "is-on" : ""}`} aria-pressed={needs.includes(n.id)} onClick={() => flip(setNeeds)(n.id)}>
                  <span className="tn-card-icon" aria-hidden>{n.icon}</span>
                  <span className="tn-card-title">{n.label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <p className="sh-label">How hard is it? <span className="sh-muted">Optional.</span></p>
            <div className="sh-chips">
              {INTENSITIES.map((i) => <button key={i.id} type="button" className="sh-chip" aria-pressed={intensity === i.id} onClick={() => setIntensity(intensity === i.id ? null : i.id)}>{i.label}</button>)}
            </div>
          </Card>
          <Card>
            <label className="block">
              <span className="sh-label">A note, if you want <span className="sh-muted">Optional.</span></span>
              <RichTextarea className="sh-input sh-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Or nothing. That's fine." />
            </label>
            <ErrorNote error={error} />
            <Btn big disabled={busy || cards.length === 0} onClick={() => void go()}>{busy ? "Sending…" : `Send to ${partnerName}`}</Btn>
          </Card>
        </>
      )}
    </div>
  );
}

/** The gentle confirmation, and the non-verbal panel when it fits. */
function Sent({ id, nonverbal, partnerName }: { id: Id<"tnSignals">; nonverbal: boolean; partnerName: string }) {
  const s = useQuery(api.tend.signals.get, { id });
  const tap = useMutation(api.tend.signals.tap);
  const resolve = useMutation(api.tend.signals.resolve);
  const { run, error, busy } = useAction();
  const [last, setLast] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(nonverbal);
  if (!s) return <Spinner />;
  return (
    <div className="sh-container sh-narrow tn">
      <Card tone="alt" className="tn-sent">
        <p className="tn-sent-line">{partnerName}&apos;s been told. You don&apos;t have to do anything else.</p>
        {s.onItAt && <p className="sh-muted">{partnerName} said: I&apos;m on it.</p>}
      </Card>
      {showPanel ? (
        <Card>
          <p className="sh-label">One tap tells {partnerName}. No words needed.</p>
          <div className="tn-grid tn-grid-taps">
            {NONVERBAL_TAPS.map((t) => (
              <button key={t.key} type="button" className={`tn-card tn-tap ${last === t.key ? "is-on" : ""}`} disabled={busy} onClick={() => void run(async () => { await tap({ id, key: t.key, label: t.tell }); setLast(t.key); })}>
                {t.label}
              </button>
            ))}
          </div>
          {last && <p className="sh-hint">Sent: {NONVERBAL_TAPS.find((t) => t.key === last)?.tell}.</p>}
          <ErrorNote error={error} />
        </Card>
      ) : (
        <Btn variant="secondary" onClick={() => setShowPanel(true)}>One-tap messages instead of words</Btn>
      )}
      <div className="sh-row sh-wrap">
        {!s.resolvedAt && <Btn variant="ghost" disabled={busy} onClick={() => void run(() => resolve({ id }))}>It&apos;s passed</Btn>}
        <Link href="/tend" className="sh-btn sh-btn-ghost">Back to Tend</Link>
      </div>
    </div>
  );
}
