"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Renewed Mind's Today line: today's line, only when the person turned it on and hasn't answered yet. */
export function RenewedMindToday() {
  const t = useQuery(api.renewedMind.entries.today);
  if (!t || !t.rehearseDaily || !t.pick || t.doneToday) return null;
  return (
    <Link href="/renewed-mind" className="sh-card block no-underline">
      <strong>Renewed Mind:</strong> today&apos;s line is waiting. Thirty seconds.
    </Link>
  );
}
