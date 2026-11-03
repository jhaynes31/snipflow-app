"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Save as you type: a change is saved a moment after typing stops, again
 * when the box loses focus, and before the page closes. Nothing typed here
 * waits on a Save button (2026-10-30: John lost a whole application's
 * answers by leaving the page before saving).
 */
export function useAutosave(save: (value: string) => Promise<unknown>, delay = 1200) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    try {
      await saveRef.current(value);
      setState(pending.current === null ? "saved" : "pending");
      setError(null);
    } catch (err) {
      // Keep the words so the next try saves them.
      if (pending.current === null) pending.current = value;
      setState("error");
      setError(err instanceof Error ? err.message : "Couldn't save just now.");
    }
  }, []);

  const change = useCallback(
    (value: string) => {
      pending.current = value;
      setState("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current !== null) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Leaving the page within the app: save what's waiting.
      void flush();
    };
  }, [flush]);

  return { state, error, change, flush };
}

export function saveLabel(state: SaveState): string {
  return state === "pending" || state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Not saved yet; it will try again" : "";
}
