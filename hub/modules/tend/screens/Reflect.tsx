"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { CARD_MAP, cardTitles, editsFor, shown, type CardEdits } from "@/core/tend/needCards/cards";
import { Btn, Card, ErrorNote, useAction } from "@/core/ui";

/** The day after a hard moment: what helped, what didn't, in one-tap options from that card. */
export function ReflectPrompt() {
  const due = useQuery(api.tend.signals.reflectionDue);
  const mine = useQuery(api.tend.needCards.mine);
  const reflect = useMutation(api.tend.signals.reflect);
  const { run, error, busy } = useAction();
  const [helped, setHelped] = useState<string[]>([]);
  const [didnt, setDidnt] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  if (!due || mine === undefined) return null;
  const options = [...new Set(due.cards.filter((c) => CARD_MAP[c]).flatMap((c) => {
    const saved = mine.find((m) => m.cardId === c);
    const e = editsFor(CARD_MAP[c], saved ? ({ cardId: c, sections: saved.sections as CardEdits["sections"], plan: saved.plan } as CardEdits) : null);
    return [...shown(e, "do_first"), ...shown(e, "say_this"), ...shown(e, "practical").slice(0, 3)];
  }))];
  const flip = (set: React.Dispatch<React.SetStateAction<string[]>>, other: React.Dispatch<React.SetStateAction<string[]>>) => (t: string) => { set((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])); other((cur) => cur.filter((x) => x !== t)); };
  return (
    <Card tone="alt" className="tn">
      <p><strong>After the other day</strong> <span className="sh-muted">({cardTitles(due.cards)})</span>. Only if you want to: what helped, what didn&apos;t? It makes the cards better.</p>
      {!open ? (
        <div className="sh-row sh-wrap"><Btn variant="secondary" onClick={() => setOpen(true)}>Two taps</Btn><Btn variant="ghost" onClick={() => void run(() => reflect({ signalId: due._id, helped: [], didnt: [] }))}>Skip</Btn></div>
      ) : (
        <>
          <p className="sh-label">Helped</p>
          <div className="sh-chips">{options.map((t) => <button key={`h-${t}`} type="button" className="sh-chip" aria-pressed={helped.includes(t)} onClick={() => flip(setHelped, setDidnt)(t)}>{t}</button>)}</div>
          <p className="sh-label mt-2">Didn&apos;t</p>
          <div className="sh-chips">{options.map((t) => <button key={`d-${t}`} type="button" className="sh-chip" aria-pressed={didnt.includes(t)} onClick={() => flip(setDidnt, setHelped)(t)}>{t}</button>)}</div>
          <ErrorNote error={error} />
          <Btn disabled={busy} onClick={() => void run(() => reflect({ signalId: due._id, helped, didnt }))}>Keep</Btn>
        </>
      )}
    </Card>
  );
}
