"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { BlockStrip, Card, ErrorNote, formatTime, formatWhen, useNow, useRun } from "./ui";

export type BookingView = NonNullable<FunctionReturnType<typeof api.bookings.byToken>>;

const PAID_WITH: Record<string, string> = {
  included: "Included hours",
  extra: "Extra hours",
  mixed: "Included + extra hours",
  dropIn: "Drop-in",
  scholarship: "Community seat",
};

/**
 * One booked session: status, goals form, check-in and cancel. Members pass
 * nothing; drop-ins pass the private token from their link.
 */
export function BookingItem({ b, token }: { b: BookingView; token?: string }) {
  const ref = token ? { token } : { bookingId: b._id };
  const cancel = useMutation(api.bookings.cancel);
  const checkIn = useMutation(api.bookings.checkIn);
  const { busy, error, run } = useRun();
  const [goalsOpen, setGoalsOpen] = useState(b.goalsNudge);
  const now = useNow();
  const end = b.session.startsAt + b.session.hours * 3_600_000;
  const past = end < now;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/sessions/${b.session._id}`} className="text-lg font-bold hover:underline">
            {b.session.title}
          </Link>
          <p className="muted text-sm">
            {formatWhen(b.session.startsAt)} – {formatTime(end)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {b.status === "waitlisted" && <span className="pill pill-warn">On the waitlist</span>}
          {b.status === "pendingPayment" && <span className="pill pill-warn">Waiting for payment</span>}
          {b.status === "confirmed" && b.attendance === "unmarked" && <span className="pill pill-good">Seat saved</span>}
          {b.attendance === "attended" && <span className="pill pill-good">Checked in ✓</span>}
          {b.attendance === "noShow" && <span className="pill">Missed</span>}
          {b.paymentType && b.status === "confirmed" && <span className="pill">{PAID_WITH[b.paymentType]}</span>}
        </div>
      </div>

      <BlockStrip blocks={b.session.blocks} highlight={b.kind === "dropIn" && b.goalBlocks.length ? b.goalBlocks.map((g) => g.index) : undefined} />

      {b.status === "confirmed" && !past && (
        <div className="rounded-xl p-3" style={{ background: b.goals.length ? "var(--good-soft)" : "var(--accent-soft)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>{b.goals.length ? "Your goals ✓" : "Your goals for this session"}</b>
            <button className="btn btn-quiet btn-small" onClick={() => setGoalsOpen(!goalsOpen)}>
              {goalsOpen ? "Close" : b.goals.length ? "Edit" : "Add goals"}
            </button>
          </div>
          {!goalsOpen && b.goals.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {b.goals.filter((g) => g.goal).map((g) => (
                <li key={g.blockIndex}>
                  <b>{g.category}:</b> {g.goal}
                </li>
              ))}
            </ul>
          )}
          {goalsOpen && b.goalsOpen && <GoalsForm b={b} tokenRef={ref} onDone={() => setGoalsOpen(false)} />}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {b.canCheckIn && (
          <button className="btn" disabled={busy} onClick={() => run(() => checkIn(ref))}>
            I&apos;m here — check me in
          </button>
        )}
        {b.canCancel && !token && (
          <button
            className="btn btn-quiet btn-small"
            disabled={busy}
            onClick={() => {
              const msg =
                b.status === "waitlisted"
                  ? "Leave the waitlist for this session?"
                  : "Cancel this seat? Your hours come right back, and the seat goes to the next person on the waitlist.";
              if (window.confirm(msg)) void run(() => cancel({ bookingId: b._id }));
            }}
          >
            {b.status === "waitlisted" ? "Leave waitlist" : "I can't make it"}
          </button>
        )}
      </div>
      <ErrorNote error={error} />
    </Card>
  );
}

function GoalsForm({
  b,
  tokenRef,
  onDone,
}: {
  b: BookingView;
  tokenRef: { token: string } | { bookingId: BookingView["_id"] };
  onDone: () => void;
}) {
  const save = useMutation(api.bookings.saveGoals);
  const { busy, error, run } = useRun();
  const [answers, setAnswers] = useState<Record<number, string>>(() =>
    Object.fromEntries(b.goals.map((g) => [g.blockIndex, g.goal])),
  );

  return (
    <form
      className="mt-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await save({ ...tokenRef, answers: b.goalBlocks.map((g) => ({ blockIndex: g.index, goal: answers[g.index] ?? "" })) });
          onDone();
        });
      }}
    >
      {b.goalBlocks.map((g) => (
        <div key={g.index}>
          <label className="label" htmlFor={`g-${b._id}-${g.index}`}>
            {g.category} — what&apos;s your goal for this block?
          </label>
          <input
            id={`g-${b._id}-${g.index}`}
            className="input"
            maxLength={500}
            placeholder={placeholderFor(g.category)}
            value={answers[g.index] ?? ""}
            onChange={(e) => setAnswers({ ...answers, [g.index]: e.target.value })}
          />
        </div>
      ))}
      <button className="btn btn-small" disabled={busy}>
        Save my goals
      </button>
      <ErrorNote error={error} />
    </form>
  );
}

function placeholderFor(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("clean")) return "e.g. Clear the kitchen counter";
  if (c.includes("play") || c.includes("game")) return "e.g. Actually relax — no multitasking";
  if (c.includes("business") || c.includes("work")) return "e.g. Send the three invoices";
  return "One small, doable thing";
}
