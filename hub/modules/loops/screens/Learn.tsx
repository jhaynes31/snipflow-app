"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LEARN_CARDS, LENS_QUESTION, pairedSets, type LearnCard, type Lens } from "@/core/loops/learn";
import { LEARN_FOOTER } from "@/core/loops/content";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, Note, PageTitle } from "@/core/ui";
import { readLoopSettings } from "../settings";
import { THEMES, type LoopTheme } from "../theme";

export function LearnCardView({ card, theme, saved, onSave, loopId }: { card: LearnCard; theme: LoopTheme; saved?: boolean; onSave?: () => void; loopId?: string | null }) {
  const t = THEMES[theme];
  const tryHref = card.tryIt ? (card.tryIt.page === "ground" ? "/tend/tools/groundMe" : card.tryIt.page === "deck" ? `${t.mount}/deck` : loopId ? `${t.mount}/${loopId}/${card.tryIt.page}` : t.mount) : null;
  return (
    <div className="lp-card" data-lens={card.lens}>
      <p className="sh-eyebrow">{t.lensNames[card.lens]} · {card.n}{card.from ? ` · From: ${card.from}` : ""}</p>
      <h3 className="sh-h3">{card.title}</h3>
      {card.ref && <p className="sh-muted"><strong>{card.ref}.</strong> &ldquo;{card.passage}&rdquo; <span className="lp-from">(close rendering; <Link href={`/the-well/bible/${card.slug}/${card.chapter}`} className="sh-link">read it in The Well</Link>)</span></p>}
      <p>{card.body}</p>
      <p className="lp-sowhat">So what does this mean for me? {card.soWhat}</p>
      {card.pray && <p className="sh-muted"><em>Pray it:</em> {card.pray}</p>}
      <div className="sh-row sh-wrap" style={{ gap: "0.5rem" }}>
        {tryHref && card.tryIt && <Link href={tryHref} className="sh-btn sh-btn-secondary sh-btn-inline">Try it: {card.tryIt.label}</Link>}
        {onSave && <Btn variant="ghost" onClick={onSave}>{saved ? "★ Saved" : "☆ Save to Truths I Need"}</Btn>}
      </div>
    </div>
  );
}

/** Three lenses, three tabs; the paired topics side by side; starred cards. */
export function Learn({ theme, lens }: { theme: LoopTheme; lens: string | null }) {
  const t = THEMES[theme];
  const { profile } = useHub();
  const faithOn = readLoopSettings(profile.moduleSettings, theme).faith;
  const cards = useQuery(api.loops.entries.cards);
  const addCard = useMutation(api.loops.entries.addCard);
  const savedSet = new Set((cards ?? []).filter((c) => c.kind === "saved").map((c) => c.text));
  const current: Lens | "pairs" | "saved" = lens === "mind" || lens === "faith" || lens === "pairs" || lens === "saved" ? lens : "brain";
  const show = (c: LearnCard) => c.lens !== "faith" || faithOn;
  return (
    <>
      <PageTitle title="Why loops happen" subtitle="Three lenses on the same thing. You're responsible, you're not condemned, and you're not alone in the work." />
      <div className="sh-chips">
        {(["brain", "mind", "faith"] as Lens[]).filter((l) => l !== "faith" || faithOn).map((l) => <Link key={l} href={`${t.mount}/learn/${l}`} className="sh-chip" aria-pressed={current === l}>{t.lensNames[l]}</Link>)}
        <Link href={`${t.mount}/learn/pairs`} className="sh-chip" aria-pressed={current === "pairs"}>Read all three</Link>
        <Link href={`${t.mount}/learn/saved`} className="sh-chip" aria-pressed={current === "saved"}>Truths I need</Link>
      </div>
      {!faithOn && <p className="sh-hint">The faith lens is off. Turn it on under any loop&apos;s Settings tab if you want it.</p>}
      {(current === "brain" || current === "mind" || current === "faith") && (
        <>
          <p className="sh-muted"><em>{LENS_QUESTION[current]}</em></p>
          <div className="sh-stack">{LEARN_CARDS.filter((c) => c.lens === current && show(c)).map((c) => <LearnCardView key={c.key} card={c} theme={theme} saved={savedSet.has(c.key)} onSave={() => void addCard({ kind: "saved", text: c.key })} />)}</div>
        </>
      )}
      {current === "pairs" && (
        <div className="sh-stack">
          {pairedSets().map((set) => (
            <div key={set[0].key}>
              <h2 className="sh-h2">Science, psychology, and scripture, pointing the same way</h2>
              <div className="lp-three">{set.filter(show).map((c) => <LearnCardView key={c.key} card={c} theme={theme} saved={savedSet.has(c.key)} onSave={() => void addCard({ kind: "saved", text: c.key })} />)}</div>
            </div>
          ))}
        </div>
      )}
      {current === "saved" && (
        <div className="sh-stack">
          {savedSet.size === 0 ? <Note>Nothing starred yet. Tap &ldquo;Save to Truths I Need&rdquo; on any card.</Note> : LEARN_CARDS.filter((c) => savedSet.has(c.key)).map((c) => <LearnCardView key={c.key} card={c} theme={theme} saved onSave={() => void addCard({ kind: "saved", text: c.key })} />)}
        </div>
      )}
      <Card tone="alt"><p className="sh-hint" style={{ margin: 0 }}>{LEARN_FOOTER}</p></Card>
    </>
  );
}
