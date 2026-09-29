"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CARD_MAP, editsFor, intensityLabel, mergeDoFirst, NEED_SECTION, NEED_TYPES, SECTION_LABEL, shown, type CardEdits, type Section } from "@/core/tend/needCards/cards";
import { Btn, Card, ErrorNote, PageTitle, Spinner, timeAgo, useAction } from "@/core/ui";
import { Rich } from "@/core/text/RichText";

/**
 * The support view: what was picked, then Do first (big, above the fold),
 * Say this, Avoid, the three expandable sections, and scripture. Several
 * cards merge their Do first and show their details in tabs. The Depression
 * card's safety box always shows and never collapses.
 */
export function Support({ id }: { id: Id<"tnSignals"> }) {
  const s = useQuery(api.tend.signals.get, { id });
  const partnerEdits = useQuery(api.tend.needCards.partners);
  const onIt = useMutation(api.tend.signals.onIt);
  const resolve = useMutation(api.tend.signals.resolve);
  const { run, error, busy } = useAction();
  const [tab, setTab] = useState<string | null>(null);
  if (s === undefined || partnerEdits === undefined) return <Spinner />;
  if (s === null) return <div className="sh-container sh-narrow"><PageTitle title="Not here" subtitle="That signal isn't yours to see, or it's gone." /></div>;
  const savedFor = (cardId: string) => {
    const row = (partnerEdits ?? []).find((e) => e.cardId === cardId);
    return row ? ({ cardId, sections: row.sections as CardEdits["sections"], plan: row.plan } as CardEdits) : null;
  };
  const cards = s.cards.filter((c) => CARD_MAP[c]).map((c) => ({ card: CARD_MAP[c], edits: editsFor(CARD_MAP[c], savedFor(c)) }));
  const active = cards.find((c) => c.card.id === tab) ?? cards[0];
  const doFirst = mergeDoFirst(cards);
  const openSections = new Set<Section>(s.needs.map((n) => NEED_SECTION[n]).filter((x): x is Section => !!x));
  const needLabels = s.needs.map((n) => NEED_TYPES.find((t) => t.id === n)).filter(Boolean).map((t) => `${t!.icon} ${t!.label}`);
  const name = s.senderName;

  return (
    <div className="sh-container sh-narrow tn tn-support">
      <PageTitle title={`${name} could use you 🌿`} subtitle={`${timeAgo(s.createdAt)}. Read the first box, then go.`} />
      <Card tone="alt">
        <p><strong>{cards.map((c) => c.card.title).join(", ") || "Something hard"}</strong>{s.intensity ? ` · ${intensityLabel(s.intensity)}` : ""}</p>
        {needLabels.length > 0 && <p>{needLabels.join(" · ")}</p>}
        {s.note && <p className="sh-quote"><Rich text={s.note} /></p>}
        {s.taps.length > 0 && (
          <ul className="sh-list tn-taps">
            {s.taps.slice(-6).map((t, i) => <li key={i}><strong>{t.label}</strong> <span className="sh-muted">· {timeAgo(t.at)}</span></li>)}
          </ul>
        )}
        <div className="sh-row sh-wrap">
          {!s.onItAt ? <Btn big disabled={busy || s.mine} onClick={() => void run(() => onIt({ id }))}>I&apos;m on it</Btn> : <span className="sh-hint">You said: I&apos;m on it ({timeAgo(s.onItAt)}).</span>}
          {!s.resolvedAt ? <Btn variant="ghost" disabled={busy} onClick={() => void run(() => resolve({ id }))}>Resolved</Btn> : <span className="sh-hint">Resolved {timeAgo(s.resolvedAt)}.</span>}
        </div>
        <ErrorNote error={error} />
      </Card>

      {doFirst.length > 0 && (
        <Card className="tn-dofirst">
          <h2 className="sh-h2">Do first</h2>
          <ul className="tn-checklist">{doFirst.map((d, i) => <li key={i}><label><input type="checkbox" /> <span>{d}</span></label></li>)}</ul>
        </Card>
      )}

      {cards.map((c) => c.card.safety && (
        <Card key={`safety-${c.card.id}`} className="tn-safety" tone="alt">
          <h2 className="sh-h3">If it goes further</h2>
          <p><strong>{c.card.safety.trigger}:</strong> {c.card.safety.action}</p>
          <Link href="/help-now" className="sh-link">Need help now</Link>
        </Card>
      ))}

      {cards.length > 1 && (
        <div className="sh-chips" role="tablist">
          {cards.map((c) => <button key={c.card.id} type="button" role="tab" aria-selected={active?.card.id === c.card.id} className={`sh-chip ${active?.card.id === c.card.id ? "" : "sh-chip-quiet"}`} onClick={() => setTab(c.card.id)}>{c.card.title}</button>)}
        </div>
      )}

      {active && (
        <div className="sh-stack">
          <Card>
            <h2 className="sh-h3">Say this</h2>
            <div className="tn-say">{shown(active.edits, "say_this").map((t, i) => <p key={i}>&ldquo;{t}&rdquo;</p>)}</div>
            {active.edits.plan && <p className="tn-plan"><strong>The plan you two agreed on:</strong> {active.edits.plan}</p>}
          </Card>
          <Card className="tn-avoid">
            <h2 className="sh-h3">Avoid</h2>
            <ul className="sh-list">{shown(active.edits, "avoid").map((t, i) => <li key={i}>{t}</li>)}</ul>
          </Card>
          {(["practical", "emotional", "spiritual"] as Section[]).map((sec) => (
            <details key={sec} className="sh-card hh-card" open={openSections.has(sec)}>
              <summary><span className="hh-card-title">{SECTION_LABEL[sec]}</span></summary>
              <ul className="sh-list">{shown(active.edits, sec).map((t, i) => <li key={i}>{t}</li>)}</ul>
            </details>
          ))}
          <details className="sh-card hh-card">
            <summary><span className="hh-card-title">Signs</span><span className="hh-card-lead">What this tends to look like</span></summary>
            <ul className="sh-list">{shown(active.edits, "signs").map((t, i) => <li key={i}>{t}</li>)}</ul>
          </details>
          <Card tone="alt">
            <p className="sh-eyebrow">{active.card.scripture.ref}</p>
            <p>{active.card.scripture.note}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
