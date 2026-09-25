"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Btn, ErrorNote, useAction } from "@/core/ui";
import { KIND_LABEL, pickKeep, speakerForTask, sourceForTask, type MantelKind } from "./labels";

/**
 * The small Keep button under a coach, Dad, or Mom reply. Highlight one
 * sentence first and it keeps just that; otherwise it offers the whole reply
 * to trim. Saved to The Mantel with who said it and where.
 */
export function KeepLine({ reply, task }: { reply: string; task?: string }) {
  const keep = useMutation(api.mantel.keep);
  const { run, error, busy } = useAction();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [kind, setKind] = useState<MantelKind>("quote");
  const [done, setDone] = useState(false);
  // Strip tool and path tags so what's kept reads clean.
  const clean = (s: string) => s.replace(/\[\[[^\]]*\]\]/g, "").replace(/\s+/g, " ").trim();

  if (done) return <p className="sh-hint">Kept on your mantel.</p>;
  if (!open) {
    return (
      <Btn variant="ghost" className="sh-keep" onClick={() => {
        const sel = typeof window !== "undefined" ? window.getSelection()?.toString() : "";
        setText(clean(pickKeep(clean(reply), sel ? clean(sel) : null)));
        setOpen(true);
      }}>Keep</Btn>
    );
  }
  return (
    <div className="sh-keep-panel sh-stack-sm">
      <textarea className="sh-input sh-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} aria-label="The line to keep" />
      <div className="sh-chips">
        {(Object.keys(KIND_LABEL) as MantelKind[]).map((k) => (
          <button key={k} type="button" className={`sh-chip ${kind === k ? "" : "sh-chip-quiet"}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
        ))}
      </div>
      <ErrorNote error={error} />
      <div className="sh-row sh-wrap">
        <Btn disabled={busy || !text.trim()} onClick={() => void run(async () => { await keep({ text, kind, speaker: speakerForTask(task), source: sourceForTask(task) }); setDone(true); })}>Keep this</Btn>
        <Btn variant="ghost" onClick={() => setOpen(false)}>Not now</Btn>
      </div>
      <p className="sh-hint">Trim it to the sentence you want. Highlight a sentence before you press Keep next time and it&apos;ll start with just that.</p>
    </div>
  );
}
