"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BookingItem } from "@/components/BookingItem";
import { Card } from "@/components/ui";

/** A drop-in's private page: their seat, goals form and check-in. The link is the key. */
function DropInPage() {
  const { token } = useParams<{ token: string }>();
  const paid = useSearchParams().get("paid");
  const b = useQuery(api.bookings.byToken, { token });

  if (b === undefined) return <p className="muted">Loading…</p>;
  if (b === null) return <p>We couldn&apos;t find that booking. <Link className="link" href="/">See the schedule</Link></p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold">
        {b.status === "confirmed" ? `You're in, ${b.guestName ?? "friend"}! 🎉` : "Almost there…"}
      </h1>
      {b.status === "pendingPayment" && paid && (
        <Card>We&apos;re confirming your payment with Stripe — this page updates on its own in a few seconds.</Card>
      )}
      {b.status === "canceled" && <Card>This booking was canceled. <Link className="link" href="/">Find another session</Link></Card>}
      {b.status !== "canceled" && <BookingItem b={b} token={token} />}
      <Card className="text-sm">
        <b>Save this page.</b> It&apos;s your private link for this session: add your goals, and check in when you arrive. Can&apos;t make it?
        Let Jen or John know and they&apos;ll sort it out with you.
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DropInPage />
    </Suspense>
  );
}
