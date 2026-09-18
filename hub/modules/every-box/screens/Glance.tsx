"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { useEveryBox } from "@/modules/every-box/components/context";
import { StageVisual } from "@/modules/every-box/components/StageVisual";
import { useNow } from "@/modules/every-box/components/useNow";
import { WorldScene } from "@/modules/every-box/components/WorldScene";

/**
 * The glanceable view: no navigation, no buttons, just the state of every
 * box. Meant for a browser homepage / new-tab, a PWA shortcut, or a pinned
 * small window on a desktop. Updates live as the household tends things.
 */
export function Glance() {
  const { theme } = useEveryBox();
  const now = useNow(30_000);
  const categories = useQuery(api.everyBox.categories.list);

  return (
    <div className="eb-container max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold eb-muted">{theme.worldName.charAt(0).toUpperCase() + theme.worldName.slice(1)}</h1>
        <Link href="/every-box" className="text-xs underline eb-muted">
          Open Every Box
        </Link>
      </div>
      {!categories ? null : categories.length === 0 ? (
        <p className="text-sm eb-muted">Nothing planted yet.</p>
      ) : (
        <>
        <div className="mb-4">
          <WorldScene categories={categories} now={now} />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {categories.map((c) => {
            const stage = computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage;
            return (
              <Link
                key={c._id}
                href={`/every-box/box/${c._id}`}
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
        </>
      )}
    </div>
  );
}
