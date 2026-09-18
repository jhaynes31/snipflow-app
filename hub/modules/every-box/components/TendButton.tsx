"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEveryBox } from "./context";
import { Btn, ErrorNote, useAction } from "./ui";

/** How long the Undo stays offered after a tap. */
const UNDO_WINDOW_MS = 10_000;

interface Props {
  categoryId: Id<"ebCategories">;
  /** Compact single button (dashboard) vs full form with note (detail page). */
  compact?: boolean;
  onTended?: () => void;
}

/**
 * The one action that changes freshness. Rendered only for the tender.
 * Compact mode is a single tap; full mode lets them add a note or back-date.
 */
export function TendButton({ categoryId, compact, onTended }: Props) {
  const { theme } = useEveryBox();
  const tend = useMutation(api.everyBox.categories.tend);
  const undoTend = useMutation(api.everyBox.categories.undoTend);
  const [open, setOpen] = useState(false);
  const [lastEventId, setLastEventId] = useState<Id<"ebTendingEvents"> | null>(null);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState<"now" | "yesterday" | "custom">("now");
  const [customDate, setCustomDate] = useState("");
  const { busy, error, run } = useAction();

  useEffect(() => {
    if (!lastEventId) return;
    const t = window.setTimeout(() => setLastEventId(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [lastEventId]);

  async function undo() {
    if (!lastEventId) return;
    const id = lastEventId;
    setLastEventId(null);
    await run(() => undoTend({ eventId: id }));
  }

  async function submit() {
    let tendedAt: number | undefined;
    if (when === "yesterday") tendedAt = Date.now() - 24 * 60 * 60 * 1000;
    if (when === "custom" && customDate) tendedAt = new Date(`${customDate}T12:00:00`).getTime();
    const ok = await run(async () => {
      const eventId = await tend({ categoryId, note: note.trim() || undefined, tendedAt });
      setLastEventId(eventId);
      return true;
    });
    if (ok) {
      setNote("");
      setWhen("now");
      setOpen(false);
      onTended?.();
    }
  }

  if (compact) {
    if (lastEventId) {
      return (
        <Btn
          small
          variant="secondary"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void undo();
          }}
          aria-label="Undo that"
        >
          Undo
        </Btn>
      );
    }
    return (
      <Btn
        small
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void submit();
        }}
        aria-label={`${theme.tendVerb} this ${theme.noun}`}
      >
        {theme.tendVerb}
      </Btn>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Btn disabled={busy} onClick={() => void submit()}>
          {theme.tendVerb} now
        </Btn>
        <Btn variant="secondary" onClick={() => setOpen(true)}>
          {theme.tendVerb} with a note…
        </Btn>
        {lastEventId && (
          <span className="text-sm eb-muted">
            Logged.{" "}
            <button type="button" className="underline eb-accent" disabled={busy} onClick={() => void undo()}>
              Undo
            </button>
          </span>
        )}
        <ErrorNote error={error} />
      </div>
    );
  }

  return (
    <form
      className="eb-card-alt grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <textarea
        className="eb-textarea"
        placeholder="Optional: what did you do? (only the two of you see this)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="eb-muted">When?</span>
        {(["now", "yesterday", "custom"] as const).map((w) => (
          <button
            key={w}
            type="button"
            className={`eb-chip ${when === w ? "eb-accent" : ""}`}
            style={when === w ? { outline: "2px solid var(--eb-accent)" } : undefined}
            onClick={() => setWhen(w)}
          >
            {w === "now" ? "Just now" : w === "yesterday" ? "Yesterday" : "Pick a day"}
          </button>
        ))}
        {when === "custom" && (
          <input
            type="date"
            className="eb-input w-auto"
            value={customDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setCustomDate(e.target.value)}
            required
          />
        )}
      </div>
      <ErrorNote error={error} />
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Btn>
        <Btn type="submit" disabled={busy}>
          {theme.tendVerb}
        </Btn>
      </div>
    </form>
  );
}
