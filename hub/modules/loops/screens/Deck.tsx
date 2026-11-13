"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ENCOURAGEMENT, ENCOURAGEMENT_FAITH } from "@/core/loops/content";
import { useHub } from "@/core/shell/HubContext";
import { Btn, Card, ErrorNote, Field, PageTitle, useAction } from "@/core/ui";
import { readLoopSettings } from "../settings";
import { THEMES, type LoopTheme } from "../theme";

/** The encouragement deck: browse any time; also what shows after a pass. */
export function Deck({ theme }: { theme: LoopTheme }) {
  const t = THEMES[theme];
  const { profile } = useHub();
  const faith = readLoopSettings(profile.moduleSettings, theme).faith;
  const cards = useQuery(api.loops.entries.cards);
  const addCard = useMutation(api.loops.entries.addCard);
  const removeCard = useMutation(api.loops.entries.removeCard);
  const { busy, error, run } = useAction();
  const [text, setText] = useState("");
  const [i, setI] = useState(0);
  const mine = (cards ?? []).filter((c) => c.kind === "encouragement");
  const all = [...ENCOURAGEMENT, ...(faith ? ENCOURAGEMENT_FAITH : []), ...mine.map((c) => c.text)];
  const card = all[i % all.length];
  return (
    <>
      <PageTitle title="For falling back in" subtitle="Warm, honest, grounded. Responsibility and grace in the same breath." />
      <Card>
        <p className="lp-deck">&ldquo;{card}&rdquo;</p>
        <div className="sh-choices" style={{ justifyContent: "center" }}>
          <Btn variant="secondary" onClick={() => setI((i + 1) % all.length)}>Another</Btn>
        </div>
      </Card>
      <Card tone="alt">
        <Field label="Add one of your own" hint="A line that has actually helped you. It joins the deck.">
          <div className="sh-row sh-wrap" style={{ gap: "0.4rem" }}><input className="sh-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={400} style={{ flex: 1 }} /><Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await addCard({ kind: "encouragement", text }); setText(""); })}>Add</Btn></div>
        </Field>
        <ErrorNote error={error} />
        {mine.map((c) => <p key={c._id} className="lp-entry">{c.text} <button type="button" className="sh-link" disabled={busy} onClick={() => void run(() => removeCard({ id: c._id }))}>remove</button></p>)}
      </Card>
      <p className="sh-hint">{t.toolName}&apos;s deck. The same cards show after you log a pass around a loop.</p>
    </>
  );
}
