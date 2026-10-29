"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** The Lookout's Today line: an interview today or tomorrow, or new strong matches. Silent otherwise, and for anyone it isn't open to. */
export function LookoutToday() {
  const [now] = useState(() => Date.now());
  const status = useQuery(api.lookout.data.status);
  const open = status?.state === "mine" || status?.state === "helping";
  const data = useQuery(api.lookout.data.jobs, open ? {} : "skip");
  if (!open || !data) return null;
  const soon = data.events.filter((e) => e.kind === "interview" && e.at && e.at - now < 36 * 3600000 && e.at > now - 3600000);
  if (soon.length) {
    return (
      <Link href={`/lookout/jobs/${soon[0].jobId}`} className="sh-card block no-underline">
        <strong>The Lookout:</strong> interview with {soon[0].employer} {new Date(soon[0].at!).toLocaleString(undefined, { weekday: "long", hour: "numeric", minute: "2-digit" })}.
      </Link>
    );
  }
  const fresh = data.jobs.filter((j) => j.status === "new" && !j.seen && j.verdict !== "rejected" && (j.score ?? 0) >= 60);
  if (fresh.length) {
    return (
      <Link href="/lookout/jobs" className="sh-card block no-underline">
        <strong>The Lookout:</strong> {fresh.length === 1 ? "one new job looks" : `${fresh.length} new jobs look`} like a strong fit.
      </Link>
    );
  }
  return null;
}
