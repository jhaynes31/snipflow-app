"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { pickForDay } from "@/convex/reCentered/pure";
import { useHub } from "@/core/shell/HubContext";
import { SPEAKER_LABEL } from "./labels";

/** One quiet line from the mantel on the home page, chosen by the date. Off when the mantel is empty or the setting says so. */
export function MantelToday() {
  const { profile } = useHub();
  const rows = useQuery(api.mantel.mine);
  const [day] = useState(() => new Date().toISOString().slice(0, 10));
  const hub = (profile.moduleSettings?.hub ?? {}) as { mantelOnHome?: unknown };
  if (hub.mantelOnHome === false) return null;
  if (!rows || rows.length === 0) return null;
  const line = pickForDay(rows, day)!;
  return (
    <Link href="/mantel" className="sh-mantel-line" aria-label="From your mantel">
      <span className="sh-eyebrow">From your mantel · {SPEAKER_LABEL[line.speaker]}{line.source ? `, ${line.source}` : ""}</span>
      <span className="sh-mantel-text">{line.text.length > 220 ? `${line.text.slice(0, 218)}…` : line.text}</span>
    </Link>
  );
}
