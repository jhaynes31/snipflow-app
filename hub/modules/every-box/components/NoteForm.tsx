"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Btn, ErrorNote, useAction } from "./ui";

/**
 * Either partner can leave a context note. It's visible to both and never
 * touches freshness: shared visibility, not shared control.
 */
export function NoteForm({ categoryId }: { categoryId: Id<"ebCategories"> }) {
  const addNote = useMutation(api.everyBox.categories.addNote);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const { busy, error, run } = useAction();

  if (!open) {
    return (
      <Btn variant="secondary" onClick={() => setOpen(true)}>
        Add a context note
      </Btn>
    );
  }
  return (
    <form
      className="eb-card-alt grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await addNote({ categoryId, text });
          setText("");
          setOpen(false);
        });
      }}
    >
      <textarea
        className="eb-textarea"
        placeholder="e.g. “We actually talked Tuesday, might not be logged.”"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        autoFocus
        required
      />
      <p className="text-xs eb-muted">Notes are just context. They don&apos;t change the freshness of anything.</p>
      <ErrorNote error={error} />
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Btn>
        <Btn type="submit" disabled={busy}>
          Leave note
        </Btn>
      </div>
    </form>
  );
}
