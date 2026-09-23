"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { extraHoursPrice, formatMoney, FULL_SESSION_HOURS, PRICES } from "@/convex/rules";
import { BookingItem } from "@/components/BookingItem";
import { Card, ErrorNote, formatWhen, useNow, useRun } from "@/components/ui";
import { NO_SHOW_POLICY, noticeCopy } from "@/lib/copy";

function Portal() {
  const router = useRouter();
  const params = useSearchParams();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const me = useQuery(api.members.me, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?next=/portal");
  }, [isLoading, isAuthenticated, router]);

  if (!isAuthenticated || me === undefined) return <p className="muted">Loading…</p>;
  if (me === null) return null;
  if (me.needsProfile) return <FinishProfile />;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Hi, {me.name} 👋</h1>
      {params.get("welcome") && (
        <Card className="pill-good">Welcome to the community! Your membership can take a few seconds to show up here.</Card>
      )}
      {params.get("hours") && <Card className="pill-good">Thank you! Your extra hours will appear here in a moment.</Card>}
      <Notices />
      <Membership me={me} />
      <MyBookings />
      <details className="card text-sm">
        <summary className="cursor-pointer font-bold">How seats and cancellations work</summary>
        <p className="muted mt-2">{NO_SHOW_POLICY}</p>
      </details>
    </div>
  );
}

function FinishProfile() {
  const ensure = useMutation(api.members.ensure);
  const [name, setName] = useState("");
  const { busy, error, run } = useRun();
  return (
    <Card className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-bold">One more thing</h1>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => ensure({ name }));
        }}
      >
        <label className="label" htmlFor="nm">What should we call you?</label>
        <input id="nm" className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn" disabled={busy}>Continue</button>
        <ErrorNote error={error} />
      </form>
    </Card>
  );
}

function Notices() {
  const notices = useQuery(api.members.notices);
  const dismiss = useMutation(api.members.dismissNotice);
  if (!notices?.length) return null;
  return (
    <div className="space-y-2">
      {notices.map((n) => {
        const copy = noticeCopy(n.kind, n.sessionTitle ? `“${n.sessionTitle}”` : "your session");
        const bg = copy.tone === "good" ? "var(--good-soft)" : copy.tone === "warn" ? "var(--warn-soft)" : "var(--accent-soft)";
        return (
          <div key={n._id} className="flex items-start gap-3 rounded-2xl p-4" style={{ background: bg }}>
            <div className="flex-1">
              <p className="font-bold">{copy.title}</p>
              <p className="text-sm">{copy.body}</p>
            </div>
            <button className="btn btn-quiet btn-small" onClick={() => void dismiss({ noticeId: n._id })} aria-label="Dismiss">
              Got it
            </button>
          </div>
        );
      })}
    </div>
  );
}

type Me = Extract<NonNullable<FunctionReturnType<typeof api.members.me>>, { needsProfile: false }>;

function Membership({ me }: { me: Me }) {
  const join = useAction(api.stripe.startMembership);
  const buy = useAction(api.stripe.buyExtraHours);
  const billing = useAction(api.stripe.billingPortal);
  const { busy, error, run } = useRun();
  const [hours, setHours] = useState(FULL_SESSION_HOURS);
  const go = (fn: () => Promise<string>) => run(async () => (window.location.href = await fn()));
  const used = me.includedHours - me.includedLeft;

  if (me.membership === "none" || me.membership === "canceled") {
    return (
      <Card className="space-y-3">
        <h2 className="text-xl font-bold">{me.membership === "canceled" ? "Come back anytime" : "Become a member"}</h2>
        <p>
          {formatMoney(PRICES.membershipMonthly)}/month for {me.includedHours} hours — two full 4-hour sessions — plus the member
          waitlist and member pricing on extra time.
        </p>
        {me.extraHours > 0 && <p className="text-sm">You still have {me.extraHours} extra hours saved for when you&apos;re back.</p>}
        <button className="btn" disabled={busy} onClick={() => go(() => join({}))}>
          Start my membership
        </button>
        <p className="muted text-sm">
          Just want to try one? <Link className="link" href="/">Drop in to a session</Link>.
        </p>
        <ErrorNote error={error} />
      </Card>
    );
  }

  const price = extraHoursPrice(hours);
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">My hours</h2>
        {me.membership === "active" ? (
          <span className="pill pill-good">Member</span>
        ) : (
          <span className="pill pill-warn">Payment needs attention</span>
        )}
      </div>
      <div>
        <div className="flex gap-1" aria-label={`${me.includedLeft} of ${me.includedHours} included hours left`}>
          {Array.from({ length: me.includedHours }, (_, i) => (
            <div
              key={i}
              className="h-8 flex-1 rounded-lg"
              style={{ background: i < used ? "var(--line)" : "var(--accent)", marginRight: i === 3 ? 8 : 0 }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm">
          <b>{me.includedLeft}</b> of {me.includedHours} included hours left
          {me.cycleEnd && <span className="muted"> · refills {formatWhen(me.cycleEnd).split(",").slice(0, 2).join(",")}</span>}
        </p>
        {me.extraHours > 0 && (
          <p className="text-sm">
            + <b>{me.extraHours}</b> extra {me.extraHours === 1 ? "hour" : "hours"} (these don&apos;t expire)
          </p>
        )}
      </div>
      {me.membership === "active" && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl p-3" style={{ background: "var(--accent-soft)" }}>
          <div>
            <label className="label" htmlFor="hrs">Add extra hours</label>
            <select id="hrs" className="input" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {[1, 2, 3, 4, 8].map((h) => (
                <option key={h} value={h}>
                  {h === 4 ? "4 hours (a full session)" : h === 8 ? "8 hours (two sessions)" : `${h} ${h === 1 ? "hour" : "hours"}`}
                </option>
              ))}
            </select>
          </div>
          <button className="btn" disabled={busy} onClick={() => go(() => buy({ hours }))}>
            Buy for {formatMoney(price.cents)}
          </button>
        </div>
      )}
      <button className="link text-sm" disabled={busy} onClick={() => go(() => billing({}))}>
        Update card or membership
      </button>
      <ErrorNote error={error} />
    </Card>
  );
}

function MyBookings() {
  const bookings = useQuery(api.bookings.mine);
  const now = useNow();
  if (bookings === undefined) return null;
  const upcoming = bookings.filter((b) => b.session.startsAt + b.session.hours * 3_600_000 >= now);
  const past = bookings.filter((b) => b.session.startsAt + b.session.hours * 3_600_000 < now).reverse();
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">My sessions</h2>
        <Link className="btn btn-quiet btn-small" href="/">
          Find a session
        </Link>
      </div>
      {upcoming.length === 0 ? (
        <Card className="muted">
          Nothing booked yet. <Link className="link" href="/">Pick a session</Link> — your seat is one tap away.
        </Card>
      ) : (
        upcoming.map((b) => <BookingItem key={b._id} b={b} />)
      )}
      {past.length > 0 && (
        <details>
          <summary className="muted cursor-pointer text-sm">Past sessions ({past.length})</summary>
          <div className="mt-2 space-y-2">
            {past.map((b) => (
              <BookingItem key={b._id} b={b} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  );
}
