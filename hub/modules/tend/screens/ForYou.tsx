"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeadsUpCard } from "@/core/shell/HeadsUpCard";
import { useHub } from "@/core/shell/HubContext";
import { Card, PageTitle, timeAgo } from "@/core/ui";
import { GuidanceCard } from "../components/GuidanceCard";

/** The partner's open heads-ups, each with its guidance card and Love Menu. */
export function ForYou() {
  const { partner, headsUpsForMe } = useHub();
  const recent = useQuery(api.tend.loveMenu.recent, { limit: 10 });
  const name = partner?.displayName ?? "your partner";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title={`For ${name}`} subtitle="What they've sent, and how to love them well right now." />
      {headsUpsForMe.length === 0 ? (
        <Card>
          <p className="sh-muted">No open heads-ups from {name}.</p>
          {partner && (
            <p>
              You can still{" "}
              <Link href="/tend/my-manual" className="sh-link">
                read your own guidance
              </Link>{" "}
              or pick from their Love Menu below on any ordinary day.
            </p>
          )}
        </Card>
      ) : (
        headsUpsForMe.map((card) => (
          <div key={card._id} className="sh-stack">
            <HeadsUpCard card={card} senderName={name} />
            <GuidanceCard headsUpId={card._id} senderName={name} />
          </div>
        ))
      )}
      {partner && headsUpsForMe.length === 0 && <PartnerMenu name={name} />}
      {recent && recent.length > 0 && (
        <Card tone="alt">
          <h2 className="sh-h2">Love actions, lately</h2>
          <ul className="sh-list">
            {recent.map((a) => (
              <li key={a._id} className="sh-muted">
                {a.itemText} · {timeAgo(a.createdAt)}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PartnerMenu({ name }: { name: string }) {
  const menu = useQuery(api.tend.loveMenu.partners);
  if (!menu || menu.length === 0) return null;
  const columns = [
    ["practical", "Practical"],
    ["emotional", "Emotional"],
    ["spiritual", "Spiritual"],
  ] as const;
  return (
    <Card>
      <h2 className="sh-h2">{name}&apos;s Love Menu</h2>
      <div className="tend-menu-columns">
        {columns.map(([key, label]) => {
          const items = menu.filter((m) => m.column === key);
          return items.length ? (
            <div key={key}>
              <h3 className="sh-h3">{label}</h3>
              <ul className="sh-list">
                {items.map((m) => (
                  <li key={m._id}>{m.text}</li>
                ))}
              </ul>
            </div>
          ) : null;
        })}
      </div>
    </Card>
  );
}
