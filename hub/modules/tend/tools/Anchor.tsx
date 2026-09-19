"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, Spinner } from "@/core/ui";
import { ToolFrame } from "./ToolFrame";

/** The person's saved faith anchors, from their own manual. */
export function Anchor() {
  const manual = useQuery(api.manual.mine);
  const section = manual?.find((s) => s.key === "faithAnchors");
  return (
    <ToolFrame toolKey="anchor">
      {!manual ? (
        <Spinner />
      ) : section?.body ? (
        <Card className="tend-anchor">
          <p className="sh-quote tend-anchor-text">{section.body}</p>
        </Card>
      ) : (
        <Card>
          <p>
            Your faith anchors live in your manual, and that section is empty for now. Add scriptures, prayers, or songs that ground you{" "}
            <Link href="/profile" className="sh-link">
              in your profile
            </Link>
            , and they show here.
          </p>
        </Card>
      )}
    </ToolFrame>
  );
}
