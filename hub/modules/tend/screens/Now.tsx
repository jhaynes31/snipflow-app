"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WEATHER } from "@/convex/tend/pure";
import { COPY } from "@/core/copy/strings";
import { useHub } from "@/core/shell/HubContext";
import { Card, LinkBtn, PageTitle, timeAgo } from "@/core/ui";

/** Tend's front door: check in, reach your partner, and where "Need help now" always is. */
export function Now() {
  const { partner, headsUpsForMe } = useHub();
  const recent = useQuery(api.checkIns.recent, { limit: 5 });
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Now" subtitle="A warm corner for hard days." />
      <div className="sh-stack">
        <LinkBtn href="/check-in" big variant="accent">
          {COPY.checkInButton}
        </LinkBtn>
        <LinkBtn href="/tend/tools" big variant="secondary">
          My tools
        </LinkBtn>
        {partner && (
          <LinkBtn href="/heads-up/new" big variant="secondary">
            Send {partner.displayName} a heads-up
          </LinkBtn>
        )}
        {headsUpsForMe.length > 0 && (
          <LinkBtn href="/tend/for-you" big variant="secondary">
            {headsUpsForMe.length === 1 ? "A heads-up is waiting for you" : `${headsUpsForMe.length} heads-ups are waiting for you`}
          </LinkBtn>
        )}
      </div>
      {recent && recent.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Your recent check-ins</h2>
          <ul className="sh-list">
            {recent.map((c) => (
              <li key={c._id} className="sh-muted">
                {c.weather ? `${WEATHER.find((w) => w.key === c.weather)?.glyph ?? ""} ${WEATHER.find((w) => w.key === c.weather)?.label ?? ""}` : c.answer}
                {c.energy ? ` · energy ${c.energy}/5` : ""}
                {c.justLogging ? " · just logging" : ""} · {timeAgo(c.createdAt)}
              </li>
            ))}
          </ul>
          <p className="sh-hint">Private to you.</p>
        </Card>
      )}
      <p className="sh-muted">
        <Link href="/help-now" className="sh-link">
          {COPY.needHelpNow}
        </Link>
      </p>
    </div>
  );
}
