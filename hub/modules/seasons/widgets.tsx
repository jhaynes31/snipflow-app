"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { periodRange } from "@/convex/seasons/pure";

/** Seasons' Today line: a season written in the last three days. */
export function SeasonsToday() {
  const mine = useQuery(api.seasons.reports.mine);
  const ours = useQuery(api.seasons.reports.ours);
  const [recent] = useState(() => Date.now() - 3 * 24 * 3600_000);
  const m = mine?.find((r) => r.createdAt > recent);
  const o = ours?.find((r) => r.createdAt > recent);
  if (!m && !o) return null;
  const r = m ?? o!;
  const which = r.kind === "ours" ? "Your season together" : "Your season";
  return (
    <Link href={`/seasons/read/${r._id}`} className="sh-card block no-underline">
      <strong>Seasons:</strong> {which} for {periodRange({ interval: r.interval, start: r.periodStart, end: r.periodEnd })} is ready to read.
    </Link>
  );
}
