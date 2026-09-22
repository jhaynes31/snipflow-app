"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHub } from "@/core/shell/HubContext";
import { Card, Note, PageTitle, Spinner } from "@/core/ui";

/** Mutual friends: what each of you chose to share about the same people. */
export function Together() {
  const { partner } = useHub();
  const mine = useQuery(api.orchard.entries.people);
  const theirs = useQuery(api.orchard.entries.partnersShared);
  if (!mine || !theirs) return <Spinner />;
  const shared = mine.people.filter((p) => p.visibility === "shared");
  const partnerName = partner?.displayName ?? "your partner";
  return (
    <div className="sh-container sh-narrow">
      <PageTitle title="Together" subtitle={`People you've each chosen to share. Two sets of eyes see more than one, especially when one set has a halo on.`} />
      <Card>
        <h2 className="sh-h2">{partnerName} shared</h2>
        {theirs.length === 0 && <p className="sh-muted">Nothing yet. That&apos;s fine; sharing is a choice, one person at a time.</p>}
        {theirs.map((p) => (
          <Link key={p._id} href={`/orchard/person/${p._id}`} className="or-person">
            <span>{p.name}</span>
            <span className="sh-muted">{p.layerName}{p.state !== "growing" ? ` · ${p.state}` : ""}</span>
          </Link>
        ))}
      </Card>
      <Card>
        <h2 className="sh-h2">You shared</h2>
        {shared.length === 0 && <p className="sh-muted">No one yet. On a person&apos;s page, &ldquo;Share with {partnerName}&rdquo; shows them the name, the layer, and the notes you mark shared.</p>}
        {shared.map((p) => (
          <Link key={p._id} href={`/orchard/person/${p._id}`} className="or-person">
            <span>{p.name}</span>
            <span className="sh-muted">{p.layerName}</span>
          </Link>
        ))}
      </Card>
      <Note>
        A good use: when one of you is excited about someone new, the other reads the facts list, not the story. &ldquo;What have they actually shown?&rdquo; asked by the person without the halo on is worth a month of wondering.
      </Note>
    </div>
  );
}
