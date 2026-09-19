"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";

/** Tend's Today line: a shared tender-week forecast or a pending repair invite. Heads-ups already sit at the top. */
export function TendToday() {
  const { profile } = useHub();
  const f = useQuery(api.tend.log.partnerForecast);
  const repairs = useQuery(api.tend.repair.list);
  const invite = repairs?.find((r) => r.status === "invited" && r.partnerId === profile._id);
  if (invite) {
    return (
      <Link href="/tend/together" className="sh-card block no-underline">
        <strong>Tend:</strong> a repair invite is waiting for you.
      </Link>
    );
  }
  if (f) {
    const now = f.today >= f.tenderStart && f.today <= f.tenderEnd;
    return (
      <Link href="/tend/together" className="sh-card block no-underline">
        <strong>Tend:</strong> {now ? `${f.name}'s tender week is now.` : `${f.name}'s tender week starts ${f.tenderStart}.`}
      </Link>
    );
  }
  return null;
}
