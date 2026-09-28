"use client";

import { useState } from "react";
import { Btn } from "@/core/ui";
import { FeltPicker } from "./FeltPicker";
import type { FeltDraft } from "./wheel";

/**
 * "Open the wheel" next to any feeling field. Opens the picker in place;
 * when it's kept, the words land in the field through `onInsert` and the
 * structured pick through `onPicked`, and the entry is logged in Felt.
 */
export function FeltButton({ context, onInsert, onPicked, label = "Open the wheel" }: { context: string; onInsert?: (text: string) => void; onPicked?: (draft: FeltDraft) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [kept, setKept] = useState(false);
  if (kept) return <p className="sh-hint">Kept in Felt.</p>;
  if (!open) return <Btn variant="secondary" className="sh-felt-open" onClick={() => setOpen(true)}>{label}</Btn>;
  return (
    <div className="sh-card sh-felt-card">
      <FeltPicker
        context={context}
        onCancel={() => setOpen(false)}
        onDone={(draft, text) => { onInsert?.(text); onPicked?.(draft); setOpen(false); setKept(true); }}
      />
    </div>
  );
}
