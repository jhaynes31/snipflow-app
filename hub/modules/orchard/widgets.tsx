"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** The Orchard's Today line: a story that's due to be re-read beside the facts. */
export function OrchardToday() {
  const data = useQuery(api.orchard.entries.people);
  if (!data) return null;
  const due = data.people.find((p) => p.state === "growing" && p.storyReadDay && p.storyReadDay <= data.today);
  if (!due) return null;
  return (
    <Link href={`/orchard/person/${due._id}`} className="sh-card block no-underline">
      <strong>The Orchard:</strong> a month on, re-read the story you wrote about {due.name} beside what they&apos;ve shown.
    </Link>
  );
}
