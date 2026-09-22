"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** The Orchard's Today line: a story that's due to be re-read beside the facts. */
export function OrchardToday() {
  const data = useQuery(api.orchard.entries.people);
  const stays = useQuery(api.orchard.entries.stays);
  if (!data || !stays) return null;
  const stayDue = stays.stays.find((s) => s.checkDue);
  if (stayDue) {
    const months = Math.floor(stayDue.daysSinceKnew / 30);
    return (
      <Link href="/orchard/too-long" className="sh-card block no-underline">
        <strong>The Orchard:</strong> {months >= 1 ? `${months} ${months === 1 ? "month" : "months"}` : `${stayDue.daysSinceKnew} days`} since you first knew about {stayDue.label}. Still there?
      </Link>
    );
  }
  const due = data.people.find((p) => p.state === "growing" && p.storyReadDay && p.storyReadDay <= data.today);
  if (!due) return null;
  return (
    <Link href={`/orchard/person/${due._id}`} className="sh-card block no-underline">
      <strong>The Orchard:</strong> a month on, re-read the story you wrote about {due.name} beside what they&apos;ve shown.
    </Link>
  );
}
