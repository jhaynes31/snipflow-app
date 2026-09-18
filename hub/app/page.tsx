"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { HeadsUpCard } from "@/core/shell/HeadsUpCard";
import { useHub } from "@/core/shell/HubContext";
import type { ModuleManifest } from "@/core/modules/types";
import { Btn, Card, LinkBtn, timeAgo } from "@/core/ui";

function tileStyle(m: ModuleManifest): React.CSSProperties {
  return {
    "--module-accent": m.theme.accent,
    "--module-on-accent": m.theme.onAccent,
    "--module-tint": m.theme.tint ?? "transparent",
    "--module-accent-dark": m.theme.dark?.accent ?? m.theme.accent,
    "--module-on-accent-dark": m.theme.dark?.onAccent ?? m.theme.onAccent,
    "--module-tint-dark": m.theme.dark?.tint ?? m.theme.tint ?? "transparent",
  } as React.CSSProperties;
}

export default function HomePage() {
  const { profile, partner, gentle, partnerGentle, modules, pinned, headsUpsForMe } = useHub();
  const sent = useQuery(api.headsUps.sentByMe, { limit: 5 });
  const update = useMutation(api.profiles.update);
  const closeCard = useMutation(api.headsUps.close);
  const partnerName = partner?.displayName ?? "your partner";
  const openSent = (sent ?? []).filter((c) => c.status !== "closed");
  const widgets = modules.filter((m) => m.todayWidget);

  return (
    <div className="sh-container sh-home">
      <h1 className="sh-h1">{COPY.welcomeHome(profile.displayName)}</h1>

      {/* 1. Heads-up cards from the partner that are still open, newest first. */}
      {headsUpsForMe.length > 0 && (
        <section className="sh-stack" aria-label="Heads-ups for you">
          {headsUpsForMe.map((card) => (
            <HeadsUpCard key={card._id} card={card} senderName={partnerName} />
          ))}
        </section>
      )}

      {/* 2. Gentle day banner. */}
      {(partnerGentle || gentle) && (
        <div className="sh-banner" role="status">
          {gentle ? COPY.gentleDayOn : COPY.partnerGentle(partnerName)}
          {partnerGentle && headsUpsForMe.length > 0 && !gentle && (
            <>
              {" "}
              <Link href={`/heads-up/${headsUpsForMe[0]._id}`} className="sh-link">
                See the heads-up
              </Link>
            </>
          )}
        </div>
      )}

      {openSent.length > 0 && (
        <Card tone="alt" className="sh-sent">
          <h2 className="sh-h2">Your heads-ups</h2>
          <ul className="sh-list">
            {openSent.map((c) => (
              <li key={c._id} className="sh-row">
                <span>
                  &ldquo;{c.statusLine}&rdquo; · {timeAgo(c.createdAt)}.{" "}
                  {c.status === "responded" && c.response ? `${partnerName} ${COPY.responseSeen[c.response]}` : `${partnerName} hasn't seen it yet.`}
                </span>
                <Btn variant="ghost" onClick={() => void closeCard({ id: c._id })}>
                  Close
                </Btn>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!profile.setupDone && (
        <Card tone="alt">
          <h2 className="sh-h2">Your user manual</h2>
          <p>
            A few plain-language notes about what helps you and what doesn&apos;t. It starts empty and you can fill it in
            whenever you like, a line at a time.
          </p>
          <div className="sh-choices">
            <LinkBtn href="/profile">Open my manual</LinkBtn>
            <Btn variant="ghost" onClick={() => void update({ setupDone: true })}>
              Skip for now
            </Btn>
          </div>
        </Card>
      )}

      {/* 3. Pinned places: the widgets this person chose in Settings. */}
      {pinned.length > 0 && (
        <section aria-label="Your places" className="sh-pinned">
          {pinned.map((m) => {
            const Widget = m.homeWidget;
            const Icon = m.icon;
            return (
              <article key={m.id} className="sh-card sh-widget" style={tileStyle(m)}>
                <header className="sh-widget-head">
                  <span className="sh-tile-icon">
                    <Icon size={22} aria-hidden />
                  </span>
                  <Link href={m.route} className="sh-widget-title">
                    {m.name}
                  </Link>
                </header>
                {Widget ? (
                  <Widget />
                ) : (
                  <p className="sh-muted">
                    {m.tagline} <Link href={m.route} className="sh-link">Open {m.name}</Link>
                  </p>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* 4. Today across modules: one small item from each module with something to show. */}
      {widgets.length > 0 && (
        <section aria-label="Today" className="sh-today">
          {widgets.map((m) => {
            const Widget = m.todayWidget!;
            return <Widget key={m.id} />;
          })}
        </section>
      )}

      {/* 5. Module tiles: little places in the village. */}
      <section aria-label="Places" className="sh-tiles">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.id} href={m.route} className="sh-tile" style={tileStyle(m)}>
              <span className="sh-tile-icon">
                <Icon size={26} aria-hidden />
              </span>
              <span className="sh-tile-name">{m.name}</span>
              <span className="sh-tile-tagline">{m.tagline}</span>
            </Link>
          );
        })}
        <Link href="/heads-up/new" className="sh-tile sh-tile-plain">
          <span className="sh-tile-name">{COPY.sendHeadsUp}</span>
          <span className="sh-tile-tagline">Tell {partnerName} how today is and what would help.</span>
        </Link>
      </section>
    </div>
  );
}
