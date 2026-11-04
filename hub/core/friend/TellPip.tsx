"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Btn } from "@/core/ui";

/**
 * "Tell Pip": one line from any single item, on purpose. Shows only for the
 * person who owns Pip's room. The line is a headline, never the item's text
 * unless they pass it.
 */
export function TellPip({ sourceTab, headline }: { sourceTab: string; headline: string }) {
  const mine = useQuery(api.friend.entries.isMine);
  const tell = useMutation(api.friend.entries.tellPip);
  const [done, setDone] = useState(false);
  if (!mine) return null;
  if (done) return <span className="sh-hint">Pip knows.</span>;
  return (
    <Btn variant="ghost" onClick={() => void tell({ sourceTab, headline: headline.slice(0, 240) }).then(() => setDone(true))}>
      Tell Pip
    </Btn>
  );
}
