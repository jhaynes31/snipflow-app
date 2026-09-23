"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { dropInQuote, extraHoursPrice, formatMoney, PRICES } from "@/convex/rules";
import { BlockStrip, Card, ErrorNote, formatTime, formatWhen, Seats, useNow, useRun } from "@/components/ui";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id as Id<"sessions">;
  const s = useQuery(api.sessions.get, { sessionId });
  const { isAuthenticated } = useConvexAuth();
  const now = useNow();

  if (s === undefined) return <p className="muted">Loading…</p>;
  if (s === null) return <p>We couldn&apos;t find that session. <Link className="link" href="/">See the schedule</Link></p>;

  const end = s.startsAt + s.hours * 3_600_000;
  const open = s.status === "scheduled" && s.startsAt > now;

  return (
    <div className="space-y-6">
      <Link href="/" className="link text-sm">
        ← All sessions
      </Link>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{s.title}</h1>
        <p className="muted">
          {formatWhen(s.startsAt)} – {formatTime(end)} · {s.hours} hours
        </p>
        {s.gameTitle && <p className="pill">🎮 Playing: {s.gameTitle}</p>}
      </div>
      <Card className="space-y-4">
        <h2 className="font-bold">The lineup</h2>
        <BlockStrip blocks={s.blocks} />
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Seats left={s.memberSeatsLeft} total={s.memberSeats} label="member" />
          <Seats left={s.dropInSeatsLeft} total={s.dropInSeats} label="drop-in" />
        </div>
      </Card>

      {!open ? (
        <Card className="muted">This session isn&apos;t taking bookings anymore.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {isAuthenticated ? <MemberBooking sessionId={sessionId} seatsLeft={s.memberSeatsLeft} /> : <MemberSignInPrompt />}
          <DropIn sessionId={sessionId} blocks={s.blocks} seatsLeft={s.dropInSeatsLeft} />
        </div>
      )}
    </div>
  );
}

function MemberSignInPrompt() {
  const path = usePathname();
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Members</h2>
      <p className="muted">Sign in to book with your included hours.</p>
      <Link className="btn" href={`/login?next=${encodeURIComponent(path)}`}>
        Sign in to book
      </Link>
      <p className="muted text-sm">
        Not a member yet? <Link className="link" href="/login?flow=signUp">Join for {formatMoney(PRICES.membershipMonthly)}/month</Link>
      </p>
    </Card>
  );
}

function MemberBooking({ sessionId, seatsLeft }: { sessionId: Id<"sessions">; seatsLeft: number }) {
  const me = useQuery(api.members.me);
  const mine = useQuery(api.bookings.mineForSession, { sessionId });
  const book = useMutation(api.bookings.bookAsMember);
  const waitlist = useMutation(api.bookings.joinWaitlist);
  const buy = useAction(api.stripe.buyExtraHours);
  const join = useAction(api.stripe.startMembership);
  const { busy, error, run } = useRun();
  const [shortBy, setShortBy] = useState<number | null>(null);

  if (me === undefined || mine === undefined) return <Card className="muted">Loading…</Card>;
  if (!me || me.needsProfile) {
    return (
      <Card>
        <Link className="link" href="/portal">Finish setting up your account</Link> to book.
      </Card>
    );
  }

  if (mine) {
    return (
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">You&apos;re in! 🎉</h2>
        {mine.status === "waitlisted" ? (
          <p>You&apos;re on the waitlist. If a seat opens, we&apos;ll seat you automatically and use your hours then.</p>
        ) : (
          <p>Your seat is saved. We&apos;ll ask for your goals for each block about two days before.</p>
        )}
        <Link className="link" href="/portal">See my sessions</Link>
      </Card>
    );
  }

  if (me.membership !== "active") {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-bold">Members</h2>
        <p>
          Membership is {formatMoney(PRICES.membershipMonthly)}/month and includes 8 hours — two full sessions.
        </p>
        <button className="btn" disabled={busy} onClick={() => run(async () => (window.location.href = await join({})))}>
          Start my membership
        </button>
        <ErrorNote error={error} />
      </Card>
    );
  }

  const topUp = shortBy ? extraHoursPrice(shortBy) : null;

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Book with my hours</h2>
      <p className="text-sm">
        <b>{me.includedLeft}</b> included hours left this month
        {me.extraHours > 0 && (
          <>
            {" "}
            + <b>{me.extraHours}</b> extra
          </>
        )}
      </p>
      {seatsLeft > 0 ? (
        <button
          className="btn"
          disabled={busy}
          onClick={() =>
            run(async () => {
              const r = await book({ sessionId });
              setShortBy(r.booked ? null : r.shortBy);
            })
          }
        >
          Save my seat
        </button>
      ) : (
        <>
          <p className="muted text-sm">Member seats are full right now. Join the waitlist and you&apos;ll be seated automatically if one opens.</p>
          <button className="btn" disabled={busy} onClick={() => run(() => waitlist({ sessionId }))}>
            Join the waitlist
          </button>
        </>
      )}
      {topUp && shortBy && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "var(--warn-soft)" }}>
          <p>
            You need <b>{shortBy}</b> more {shortBy === 1 ? "hour" : "hours"} for this one.
          </p>
          <button
            className="btn btn-small mt-2"
            disabled={busy}
            onClick={() => run(async () => (window.location.href = await buy({ hours: shortBy })))}
          >
            Add {shortBy} {shortBy === 1 ? "hour" : "hours"} for {formatMoney(topUp.cents)}
          </button>
        </div>
      )}
      <ErrorNote error={error} />
    </Card>
  );
}

function DropIn({
  sessionId,
  blocks,
  seatsLeft,
}: {
  sessionId: Id<"sessions">;
  blocks: { kind: "bookend" | "work"; category: string; hours: number }[];
  seatsLeft: number;
}) {
  const start = useAction(api.stripe.startDropIn);
  const { busy, error, run } = useRun();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<"full" | "hourly">("full");
  const [picked, setPicked] = useState<number[]>([]);

  const choice = mode === "full" ? ({ kind: "full" } as const) : ({ kind: "hourly", blockIndexes: picked } as const);
  const quote = dropInQuote(blocks, choice);

  if (seatsLeft <= 0) {
    return (
      <Card className="space-y-2">
        <h2 className="text-lg font-bold">Drop in</h2>
        <p className="muted">Drop-in seats for this one are taken. Check the schedule for the next session!</p>
      </Card>
    );
  }

  return (
    <Card>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => (window.location.href = await start({ sessionId, name, email, choice })));
        }}
      >
        <h2 className="text-lg font-bold">Drop in</h2>
        <div className="grid grid-cols-2 gap-2">
          {(["full", "hourly"] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className="rounded-xl p-3 text-left text-sm"
              style={{ border: `2px solid ${mode === m ? "var(--accent)" : "var(--line)"}` }}
            >
              <b>{m === "full" ? "Whole session" : "By the hour"}</b>
              <div className="muted">
                {m === "full" ? `${formatMoney(PRICES.dropInSession)}, opening to closing` : `${formatMoney(PRICES.dropInHour)}/hr, work blocks`}
              </div>
            </button>
          ))}
        </div>
        {mode === "hourly" && (
          <fieldset className="space-y-1">
            <legend className="label">Which blocks?</legend>
            {blocks.map((b, i) =>
              b.kind !== "work" ? null : (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.includes(i)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, i] : picked.filter((x) => x !== i))}
                  />
                  {b.category} · {b.hours} hr
                </label>
              ),
            )}
          </fieldset>
        )}
        <div>
          <label className="label" htmlFor="dn">Your name</label>
          <input id="dn" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="de">Email</label>
          <input id="de" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <button className="btn w-full" disabled={busy || "error" in quote}>
          {"error" in quote ? quote.error : `Pay ${formatMoney(quote.cents)} and save my seat`}
        </button>
        <ErrorNote error={error} />
      </form>
    </Card>
  );
}
