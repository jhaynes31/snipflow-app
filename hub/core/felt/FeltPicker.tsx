"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, ErrorNote, useAction } from "@/core/ui";
import { BodyMap } from "./BodyMap";
import { Wheel } from "./Wheel";
import { AREA_LABEL, feltText, SENSATIONS, type BodyNote, type FeltDraft } from "./wheel";

/**
 * The whole flow in one card: the wheel, then where in the body, then what
 * it's like there, then keep it. `onDone` gets the words for whatever field
 * opened it. Every step is optional; Keep works with just one feeling.
 */
export function FeltPicker({ context, onDone, onCancel }: { context: string; onDone?: (draft: FeltDraft, text: string) => void; onCancel?: () => void }) {
  const add = useMutation(api.felt.add);
  const { run, error, busy } = useAction();
  const [step, setStep] = useState<"feel" | "body" | "words">("feel");
  const [feelings, setFeelings] = useState<Set<string>>(new Set());
  const [wheelBody, setWheelBody] = useState<Set<string>>(new Set());
  const [areas, setAreas] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, BodyNote>>({});
  const [note, setNote] = useState("");
  const toggle = (set: React.Dispatch<React.SetStateAction<Set<string>>>) => (w: string) => set((cur) => { const n = new Set(cur); if (n.has(w)) n.delete(w); else n.add(w); return n; });
  const wordFor = (area: string, w: string) => setNotes((cur) => { const b = cur[area] ?? { area, words: [] }; const words = b.words.includes(w) ? b.words.filter((x) => x !== w) : [...b.words, w]; return { ...cur, [area]: { ...b, words } }; });
  const noteFor = (area: string, text: string) => setNotes((cur) => ({ ...cur, [area]: { ...(cur[area] ?? { area, words: [] }), note: text } }));

  // Sensations picked on the wheel's outer ring ride along with every tapped area, or as "all over" when no area was tapped.
  const draft = (): FeltDraft => ({
    feelings: [...feelings],
    body: areas.size
      ? [...areas].map((a) => ({ area: a, words: [...new Set([...(notes[a]?.words ?? []), ...wheelBody])], note: notes[a]?.note?.trim() || undefined }))
      : wheelBody.size ? [{ area: "whole", words: [...wheelBody] }] : [],
    note: note.trim() || undefined,
  });

  async function keep() {
    const d = draft();
    await run(async () => { await add({ ...d, context }); });
    onDone?.(d, feltText(d));
  }

  return (
    <div className="sh-felt">
      <div className="sh-felt-steps" role="tablist">
        {(["feel", "body", "words"] as const).map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={step === s} className={`sh-chip ${step === s ? "" : "sh-chip-quiet"}`} onClick={() => setStep(s)}>
            {i + 1}. {s === "feel" ? "What I feel" : s === "body" ? "Where in my body" : "What it's like there"}
          </button>
        ))}
      </div>
      {step === "feel" && (
        <>
          <Wheel picked={feelings} onToggle={toggle(setFeelings)} pickedBody={wheelBody} onToggleBody={toggle(setWheelBody)} />
          <div className="sh-row sh-wrap">
            <Btn onClick={() => setStep("body")}>Where in my body →</Btn>
            <Btn variant="ghost" onClick={() => setStep("words")}>Skip the body</Btn>
          </div>
        </>
      )}
      {step === "body" && (
        <>
          <BodyMap picked={areas} onToggle={toggle(setAreas)} />
          <div className="sh-row sh-wrap">
            <Btn onClick={() => setStep("words")}>{areas.size ? "What it's like there →" : "Nothing in particular →"}</Btn>
            <Btn variant="ghost" onClick={() => setStep("feel")}>← Back</Btn>
          </div>
        </>
      )}
      {step === "words" && (
        <>
          {[...areas].length === 0 && <p className="sh-muted">No areas tapped. You can still keep the feelings, or go back and tap where you notice it.</p>}
          {wheelBody.size > 0 && <p className="sh-muted">From the wheel: {[...wheelBody].join(", ")}. These go with every area you tapped.</p>}
          {[...areas].map((a) => (
            <div key={a} className="sh-felt-area">
              <p className="sh-label">{AREA_LABEL[a] ?? a}</p>
              <div className="sh-chips">
                {SENSATIONS.map((w) => {
                  const on = notes[a]?.words.includes(w) ?? false;
                  return <button key={w} type="button" className={`sh-chip ${on ? "" : "sh-chip-quiet"}`} aria-pressed={on} onClick={() => wordFor(a, w)}>{w}</button>;
                })}
              </div>
              <input className="sh-input sh-input-sm mt-2" value={notes[a]?.note ?? ""} onChange={(e) => noteFor(a, e.target.value)} maxLength={300} placeholder="In your own words, if there's more" aria-label={`More about ${AREA_LABEL[a] ?? a}`} />
            </div>
          ))}
          <label className="block mt-2">
            <span className="sh-label">Anything else</span>
            <input className="sh-input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="What was happening, or nothing" />
          </label>
          <ErrorNote error={error} />
          <div className="sh-row sh-wrap mt-2">
            <Btn big disabled={busy || (feelings.size === 0 && areas.size === 0 && wheelBody.size === 0)} onClick={() => void keep()}>{onDone ? "Keep it and use the words" : "Keep it"}</Btn>
            <Btn variant="ghost" onClick={() => setStep("body")}>← Back</Btn>
            {onCancel && <Btn variant="ghost" onClick={onCancel}>Not now</Btn>}
          </div>
          <p className="sh-hint">Kept in Felt, private to you. Nothing here is a score.</p>
        </>
      )}
    </div>
  );
}
