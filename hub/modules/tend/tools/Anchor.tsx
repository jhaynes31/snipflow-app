"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, Spinner } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

/** The person's saved faith anchors, from their own manual. */
export function Anchor() {
  const manual = useQuery(api.manual.mine);
  const remembering = useQuery(api.well.entries.remembering);
  const section = manual?.find((s) => s.key === "faithAnchors");
  const kept = remembering ?? [];
  return (
    <ToolFrame toolKey="anchor">
      {!manual ? (
        <Spinner />
      ) : section?.body || kept.length > 0 ? (
        <>
          {section?.body && (
            <Card className="tend-anchor">
              <p className="sh-quote tend-anchor-text">{section.body}</p>
            </Card>
          )}
          {kept.slice(0, 3).map((r) => (
            <Card key={r._id} className="tend-anchor">
              <p className="sh-eyebrow">From Remembering{r.happenedOn ? `, ${r.happenedOn}` : ""}</p>
              <p className="sh-quote tend-anchor-text">{r.text}</p>
            </Card>
          ))}
          <p className="sh-hint">
            More in <Link href="/the-well/remembering" className="sh-link">The Well, Remembering</Link>.
          </p>
        </>
      ) : (
        <Card>
          <p>
            Your faith anchors live in your manual, and that section is empty for now. Add scriptures, prayers, or songs that ground you{" "}
            <Link href="/profile" className="sh-link">
              in your profile
            </Link>
            , or keep a time he showed up in <Link href="/the-well/remembering" className="sh-link">The Well</Link>, and they show here.
          </p>
        </Card>
      )}
    </ToolFrame>
  );
}
