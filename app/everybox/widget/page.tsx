"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness } from "@/convex/everybox/freshness";
import { stageVisual } from "@/convex/everybox/themes";
import { useEveryBox } from "@/components/everybox/context";
import { StageVisual } from "@/components/everybox/StageVisual";
import { useNow } from "@/components/everybox/useNow";

/**
 * The glanceable view: no navigation, no buttons, just the state of every
 * box. Meant for a browser homepage / new-tab, a PWA shortcut, or a pinned
 * small window on a desktop. Updates live as the household tends things.
 */
export default function WidgetPage() {
  const { theme, household } = useEveryBox();
  const now = useNow(30_000);
  const categories = useQuery(api.everybox.categories.list);

  return (
    <div className="eb-container max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold eb-muted">{household.name}</h1>
        <Link href="/everybox" className="text-xs underline eb-muted">
          Open Every Box
        </Link>
      </div>
      {!categories ? null : categories.length === 0 ? (
        <p className="text-sm eb-muted">Nothing planted yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {categories.map((c) => {
            const stage = computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage;
            return (
              <Link
                key={c._id}
                href={`/everybox/category/${c._id}`}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-2 text-center no-underline"
                title={`${c.name}: ${stageVisual(theme, stage).label}`}
              >
                <StageVisual theme={theme} stage={stage} size={3.75} />
                <span className="line-clamp-1 text-xs font-medium">
                  <span aria-hidden>{c.icon}</span> {c.name}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
