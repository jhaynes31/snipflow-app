"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WEATHER } from "@/convex/tend/pure";
import { COPY } from "@/core/copy/strings";
import { embeddedPersonFor } from "@/core/person";
import { ownsSeedSet, cardTitles } from "@/core/tend/needCards/cards";
import { useHub } from "@/core/shell/HubContext";
import { ReflectPrompt } from "./Reflect";
import { Card, LinkBtn, PageTitle, timeAgo } from "@/core/ui";

/** Tend's front door: check in, reach your partner, and where "Need help now" always is. */
export function Now() {
  const { profile, partner, headsUpsForMe } = useHub();
  const recent = useQuery(api.checkIns.recent, { limit: 5 });
  const openSignals = useQuery(api.tend.signals.openForMe);
  const canSignal = ownsSeedSet(embeddedPersonFor(profile));
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Now" subtitle="A warm corner for hard days." />
      {openSignals && openSignals.length > 0 && (
        <div className="sh-stack tn">
          {openSignals.map((s) => (
            <Link key={s._id} href={`/tend/support/${s._id}`} className="sh-card block no-underline tn-open">
              <strong>{partner?.displayName ?? "Your partner"} could use you 🌿</strong> <span className="sh-muted">· {cardTitles(s.cards) || "something hard"} · {timeAgo(s.createdAt)}{s.onItAt ? " · you're on it" : ""}</span>
            </Link>
          ))}
        </div>
      )}
      {canSignal && <ReflectPrompt />}
      <div className="sh-stack">
        {canSignal && partner && (
          <div className="tn-signal-row">
            <LinkBtn href="/tend/signal" big variant="accent" className="tn-struggling">I&apos;m struggling</LinkBtn>
            <LinkBtn href="/tend/signal/shutdown" big variant="secondary" className="tn-shutdown-btn">Shutdown</LinkBtn>
          </div>
        )}
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
