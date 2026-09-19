"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { preferredTranslation, speak, stopSpeaking, useBook } from "@/core/well/bible";
import { translationByCode } from "@/core/well/translations";
import { refHref, refLabel, sliceVerses, type Ref } from "@/core/well/refs";
import { useHub } from "@/core/shell/HubContext";
import { Btn, ErrorNote, Field, Note, Spinner, useAction } from "@/core/ui";

/** A passage from the built-in Bible, with read-aloud and "mark for my partner". */
export function Passage({ r, actions = true }: { r: Ref; actions?: boolean }) {
  const [code] = useState(() => preferredTranslation());
  const book = useBook(r.book, code);
  if (book === null) return <Spinner label="Opening the book" />;
  if (book === "missing") return <p className="sh-muted">That passage isn&apos;t in the built-in Bible.</p>;
  const chapter = book.chapters[r.chapter - 1];
  if (!chapter) return <p className="sh-muted">That chapter isn&apos;t here.</p>;
  const verses = sliceVerses(chapter, r);
  const label = refLabel(r, book.name);
  const text = verses.map((v) => v.text).join(" ");
  return (
    <div>
      <p className="sh-eyebrow">
        <Link href={refHref(r)} className="sh-link">{label}</Link> · {translationByCode(code)?.short ?? code.toUpperCase()}
      </p>
      <p className="well-passage">
        {verses.map((v) => (
          <span key={v.n}>
            <sup>{v.n}</sup>
            {v.text}{" "}
          </span>
        ))}
      </p>
      {actions && <PassageActions r={r} label={label} text={text} />}
    </div>
  );
}

export function PassageActions({ r, label, text }: { r: Ref; label: string; text: string }) {
  const { partner } = useHub();
  const mark = useMutation(api.well.together.mark);
  const addRemembering = useMutation(api.well.entries.addRemembering);
  const { busy, error, run } = useAction();
  const [marking, setMarking] = useState(false);
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  return (
    <div className="sh-stack-sm mt-3">
      <div className="sh-choices">
        <Btn
          variant="secondary"
          onClick={() => {
            if (speaking) {
              stopSpeaking();
              setSpeaking(false);
            } else {
              setSpeaking(speak(`${label}. ${text}`));
            }
          }}
        >
          {speaking ? "Stop reading" : "Read it to me"}
        </Btn>
        {partner && (
          <Btn variant="secondary" onClick={() => setMarking(!marking)}>
            Mark for {partner.displayName}
          </Btn>
        )}
        <Btn variant="ghost" disabled={busy} onClick={() => void run(async () => { await addRemembering({ text: `${label}: this one met me today.` }); setDone("Kept in Remembering."); })}>
          This met me today
        </Btn>
      </div>
      {marking && partner && (
        <div className="sh-stack-sm">
          <Field label={`A note for ${partner.displayName}`} hint="Optional. Why this one, for them.">
            <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
          <Btn disabled={busy} onClick={() => void run(async () => { await mark({ ...r, note: note || undefined }); setMarking(false); setNote(""); setDone(`Marked for ${partner.displayName}.`); })}>
            Mark it
          </Btn>
        </div>
      )}
      <ErrorNote error={error} />
      {done && <Note>{done}</Note>}
    </div>
  );
}
