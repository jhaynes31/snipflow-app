"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SessionCard } from "@/components/SessionCard";
import { Pricing } from "@/components/Pricing";
import { COMMUNITY_NAME, TAGLINE } from "@/lib/config";

/** The public, shareable schedule. */
export default function SchedulePage() {
  const sessions = useQuery(api.sessions.upcoming);
  return (
    <div className="space-y-8">
      <section className="space-y-2 pt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{COMMUNITY_NAME}</h1>
        <p className="muted max-w-2xl text-lg">{TAGLINE}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Upcoming sessions</h2>
        {sessions === undefined ? (
          <p className="muted">Loading the schedule…</p>
        ) : sessions.length === 0 ? (
          <div className="card muted">New sessions are coming soon. Check back shortly!</div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s) => (
              <SessionCard key={s._id} s={s} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">How it works</h2>
        <Pricing />
      </section>
    </div>
  );
}
