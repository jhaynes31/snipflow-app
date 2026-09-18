"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { COPY } from "@/core/copy/strings";
import { useHub } from "@/core/shell/HubContext";
import { Card, LinkBtn, PageTitle, Spinner, timeAgo } from "@/core/ui";

export default function HeadsUpHistoryPage() {
  const { partner } = useHub();
  const sent = useQuery(api.headsUps.sentByMe, { limit: 30 });
  const forMe = useHub().headsUpsForMe;
  if (!sent) return <Spinner />;
  const partnerName = partner?.displayName ?? "your partner";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Heads-ups" action={<LinkBtn href="/heads-up/new">{COPY.sendHeadsUp}</LinkBtn>} />
      <Card>
        <h2 className="sh-h2">For you</h2>
        {forMe.length === 0 ? (
          <p className="sh-muted">{COPY.noOpenHeadsUps}</p>
        ) : (
          <ul className="sh-list">
            {forMe.map((c) => (
              <li key={c._id}>
                <Link href={`/heads-up/${c._id}`} className="sh-link">
                  &ldquo;{c.statusLine}&rdquo;
                </Link>{" "}
                <span className="sh-muted">
                  from {partnerName}, {timeAgo(c.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card>
        <h2 className="sh-h2">Sent by you</h2>
        {sent.length === 0 ? (
          <p className="sh-muted">Nothing sent yet.</p>
        ) : (
          <ul className="sh-list">
            {sent.map((c) => (
              <li key={c._id}>
                <Link href={`/heads-up/${c._id}`} className="sh-link">
                  &ldquo;{c.statusLine}&rdquo;
                </Link>{" "}
                <span className="sh-muted">
                  {timeAgo(c.createdAt)} · {c.status === "closed" ? "closed" : c.status === "responded" ? "answered" : "open"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
