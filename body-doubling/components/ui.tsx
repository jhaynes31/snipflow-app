"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ConvexError } from "convex/values";
import type { Block } from "@/convex/rules";

export function errorText(err: unknown): string {
  if (err instanceof ConvexError) return typeof err.data === "string" ? err.data : "Something went wrong.";
  if (err instanceof Error) {
    // Convex puts the thrown message after "Uncaught Error:" in dev builds.
    const m = err.message.match(/(?:ConvexError|Uncaught Error): (.*?)(?:\n|$)/);
    return m?.[1] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

/** Run an async action with a busy flag and a friendly error. */
export function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(errorText(err));
      return undefined;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="pill pill-bad mt-2" style={{ borderRadius: 12, padding: "8px 12px" }}>
      {error}
    </p>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function formatWhen(ms: number, opts: { withYear?: boolean } = {}): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(opts.withYear ? { year: "numeric" } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatDay(ms: number): { weekday: string; day: string; month: string } {
  const d = new Date(ms);
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    day: d.toLocaleDateString(undefined, { day: "numeric" }),
    month: d.toLocaleDateString(undefined, { month: "short" }),
  };
}

export function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

const CAT_COLORS = ["var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)"];

/** The session's lineup as a strip of colored blocks, sized by time. */
export function BlockStrip({ blocks, highlight }: { blocks: Block[]; highlight?: number[] }) {
  let workIndex = 0;
  return (
    <div className="flex w-full gap-1 overflow-hidden rounded-xl" aria-label="Session lineup">
      {blocks.map((b, i) => {
        const color = b.kind === "bookend" ? "var(--cat-bookend)" : CAT_COLORS[workIndex++ % CAT_COLORS.length];
        const dim = highlight && !highlight.includes(i);
        return (
          <div
            key={i}
            className="px-2 py-2 text-xs"
            style={{ flex: b.hours, background: color, opacity: dim ? 0.35 : 1, minWidth: 0 }}
            title={`${b.category} · ${b.hours} hr`}
          >
            <div className="truncate font-bold">{b.category}</div>
            <div className="muted truncate">{b.hours} hr</div>
          </div>
        );
      })}
    </div>
  );
}

/** Seats as dots: filled are taken, open are free. */
export function Seats({ left, total, label }: { left: number; total: number; label: string }) {
  const taken = Math.max(0, total - left);
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: i < taken ? "var(--muted)" : "transparent", border: "2px solid var(--accent)" }}
          />
        ))}
      </span>
      <span>
        <b>{left}</b> {label} {left === 1 ? "seat" : "seats"} open
      </span>
    </div>
  );
}

/** The current time, refreshed every minute, so screens can say "started" or "past" without impure renders. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}
