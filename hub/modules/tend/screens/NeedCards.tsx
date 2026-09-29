"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { CARD_MAP, CARDS, editsFor, SECTION_LABEL, SECTIONS, type Card as NeedCard, type CardEdits, type EditItem, type Section } from "@/core/tend/needCards/cards";
import { Btn, Card, ErrorNote, Field, Note, PageTitle, Spinner, useAction } from "@/core/ui";
import { RichTextarea } from "@/core/text/RichTextarea";

/** The owner's list of cards, with what's been personalized. */
export function NeedCardsList() {
  const mine = useQuery(api.tend.needCards.mine);
  if (!mine) return <Spinner />;
  return (
    <div className="sh-container sh-narrow tn">
      <PageTitle title="My cards" subtitle="What your partner sees when you send a signal. Edit anything, add your own words, star what really helps." />
      <div className="sh-stack">
        {CARDS.map((c) => {
          const saved = mine.find((m) => m.cardId === c.id);
          const needsPlan = c.personalize_prompt && !saved?.plan;
          return (
            <Link key={c.id} href={`/tend/need-cards/${c.id}`} className="sh-card block no-underline">
              <strong>{c.title}</strong> <span className="sh-muted">· {c.subtitle}</span>
              {saved && <span className="sh-hint"> · personalized</span>}
              {needsPlan && <p className="sh-hint">{c.personalize_prompt}</p>}
            </Link>
          );
        })}
      </div>
      <Note>Changes are kept with an undo history. Your partner&apos;s view uses your version the moment you save.</Note>
    </div>
  );
}

/** Edit one card: reorder, hide, star, edit text, add your own, the plan. */
export function NeedCardEdit({ cardId }: { cardId: string }) {
  const card = CARD_MAP[cardId];
  const mine = useQuery(api.tend.needCards.mine);
  if (!card) return <div className="sh-container sh-narrow"><PageTitle title="No such card" /></div>;
  if (mine === undefined) return <Spinner />;
  const savedRow = mine.find((m) => m.cardId === cardId);
  const saved = savedRow ? ({ cardId, sections: savedRow.sections as CardEdits["sections"], plan: savedRow.plan } as CardEdits) : null;
  // A fresh editor whenever the saved version changes (a save or an undo), so its state starts from what's kept.
  return <Editor key={savedRow ? `${savedRow._id}:${savedRow.updatedAt}` : "fresh"} card={card} initial={editsFor(card, saved)} />;
}

function Editor({ card, initial }: { card: NeedCard; initial: CardEdits }) {
  const cardId = card.id;
  const history = useQuery(api.tend.needCards.historyCount, { cardId });
  const save = useMutation(api.tend.needCards.save);
  const undo = useMutation(api.tend.needCards.undo);
  const { run, error, busy } = useAction();
  const [edits, setEdits] = useState<CardEdits>(initial);
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState<Record<string, string>>({});

  const update = (section: Section, fn: (items: EditItem[]) => EditItem[]) => {
    setEdits((e) => ({ ...e, sections: e.sections.map((s) => (s.key === section ? { ...s, items: fn(s.items) } : s)) }));
    setDirty(true);
  };
  const move = (section: Section, i: number, d: -1 | 1) => update(section, (items) => { const n = [...items]; const j = i + d; if (j < 0 || j >= n.length) return items; [n[i], n[j]] = [n[j], n[i]]; return n; });

  return (
    <div className="sh-container sh-narrow tn">
      <PageTitle title={card.title} subtitle={card.subtitle} action={<Link href="/tend/need-cards" className="sh-btn sh-btn-ghost">All cards</Link>} />
      {card.personalize_prompt && !edits.plan && <Note>{card.personalize_prompt}</Note>}
      {card.personalize_prompt && (
        <Card>
          <Field label="Your agreed plan" hint="Shown to your partner under Say this.">
            <RichTextarea className="sh-input sh-textarea" rows={4} value={edits.plan ?? ""} onChange={(e) => { setEdits({ ...edits, plan: e.target.value }); setDirty(true); }} maxLength={2000} />
          </Field>
        </Card>
      )}
      {SECTIONS.map((sec) => {
        const items = edits.sections.find((s) => s.key === sec)?.items ?? [];
        return (
          <Card key={sec}>
            <h2 className="sh-h3">{SECTION_LABEL[sec]}</h2>
            <ul className="tn-edit-list">
              {items.map((it, i) => (
                <li key={`${sec}-${i}`} className={it.hidden ? "is-hidden" : ""}>
                  <button type="button" className={`tn-star ${it.starred ? "is-on" : ""}`} aria-pressed={it.starred} aria-label="This really helps" title="This really helps" onClick={() => update(sec, (l) => l.map((x, k) => (k === i ? { ...x, starred: !x.starred } : x)))}>★</button>
                  <input className="sh-input sh-input-sm" value={it.text} onChange={(e) => update(sec, (l) => l.map((x, k) => (k === i ? { ...x, text: e.target.value } : x)))} maxLength={300} aria-label={`${SECTION_LABEL[sec]} item ${i + 1}`} />
                  <span className="tn-edit-actions">
                    <Btn variant="ghost" onClick={() => move(sec, i, -1)} aria-label="Move up">↑</Btn>
                    <Btn variant="ghost" onClick={() => move(sec, i, 1)} aria-label="Move down">↓</Btn>
                    <Btn variant="ghost" onClick={() => update(sec, (l) => l.map((x, k) => (k === i ? { ...x, hidden: !x.hidden } : x)))}>{it.hidden ? "Show" : "Hide"}</Btn>
                    {it.custom && <Btn variant="ghost" onClick={() => update(sec, (l) => l.filter((_, k) => k !== i))}>Delete</Btn>}
                  </span>
                </li>
              ))}
            </ul>
            <div className="sh-row sh-wrap">
              <input className="sh-input sh-input-sm" style={{ flex: 1, minWidth: "12rem" }} value={adding[sec] ?? ""} onChange={(e) => setAdding({ ...adding, [sec]: e.target.value })} maxLength={300} placeholder={sec === "say_this" ? "Add a phrase in your words" : "Add your own"} aria-label={`Add to ${SECTION_LABEL[sec]}`} />
              <Btn variant="secondary" disabled={!(adding[sec] ?? "").trim()} onClick={() => { update(sec, (l) => [...l, { text: (adding[sec] ?? "").trim(), hidden: false, starred: false, custom: true }]); setAdding({ ...adding, [sec]: "" }); }}>Add</Btn>
            </div>
          </Card>
        );
      })}
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap">
        <Btn big disabled={busy || !dirty} onClick={() => void run(async () => { await save({ cardId, sections: edits.sections, plan: edits.plan?.trim() || undefined }); setDirty(false); })}>Save</Btn>
        {(history ?? 0) > 0 && <Btn variant="ghost" disabled={busy} onClick={() => void run(() => undo({ cardId }))}>Undo last save ({history})</Btn>}
      </div>
      <p className="sh-hint">Starred items float to the top for your partner. Hidden items stay here in case you want them back.</p>
    </div>
  );
}
