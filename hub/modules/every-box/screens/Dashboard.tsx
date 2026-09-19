"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness, DAY_MS, type StageIndex } from "@/convex/everyBox/freshness";
import { isAssignee, isTender } from "@/convex/everyBox/tenders";
import { applyBoxFilters, BoxFilterBar, useBoxFilters } from "@/modules/every-box/components/BoxFilters";
import { CategoryCard } from "@/modules/every-box/components/CategoryCard";
import { CommitmentCard } from "@/modules/every-box/components/CommitmentCard";
import { useEveryBox } from "@/modules/every-box/components/context";
import { StageVisual } from "@/modules/every-box/components/StageVisual";
import { Spinner } from "@/modules/every-box/components/ui";
import { useNow } from "@/modules/every-box/components/useNow";
import { StageArt } from "@/modules/every-box/components/StageArt";

const REVIEW_NUDGE_AFTER_DAYS = 5;

export function Dashboard() {
  const { partner, other, theme } = useEveryBox();
  const now = useNow();
  const categories = useQuery(api.everyBox.categories.list);
  const commitments = useQuery(api.everyBox.commitments.list);
  const pending = useQuery(api.everyBox.reviews.pending);
  const [filters] = useBoxFilters();
  const noteDormant = useMutation(api.everyBox.categories.noteDormant);

  // Cross-module hook: tell The Shire once when one of my boxes goes dormant.
  useEffect(() => {
    if (!categories) return;
    for (const c of categories) {
      if (!isTender(c, partner._id)) continue;
      const stage = computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage;
      const already = c.stuckNotifiedAt !== undefined && c.stuckNotifiedAt >= (c.lastTendedAt ?? 0);
      if (stage === 1 && !already) void noteDormant({ categoryId: c._id });
    }
    // `now` ticks every minute; that is fine, the mutation is a no-op once noted.
  }, [categories, partner._id, now, noteDormant]);

  if (!categories || !commitments) return <Spinner label={`Growing ${theme.worldName}`} />;

  const shown = applyBoxFilters(categories, filters, partner._id, other?._id ?? null);

  const active = commitments.open.filter((c) => c.status === "active" || c.status === "agreed");
  const waitingOnMe = commitments.open.filter(
    (c) => c.status === "proposed" && isAssignee(c, partner._id) && c.proposedBy !== partner._id,
  );
  const reviewDue =
    pending &&
    pending.surfaced.length > 0 &&
    (pending.lastReviewAt === null || now - pending.lastReviewAt > REVIEW_NUDGE_AFTER_DAYS * DAY_MS);

  const stageCounts = [0, 0, 0, 0, 0];
  for (const c of shown) {
    stageCounts[computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage - 1]++;
  }

  return (
    <div className="eb-container">
      <header className="mb-6">
        <p className="text-sm eb-muted">
          {other ? `${partner.displayName} & ${other.displayName}` : partner.displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {theme.worldName.charAt(0).toUpperCase() + theme.worldName.slice(1)}
        </h1>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="How things are right now">
            {theme.stages.map((s, i) =>
              stageCounts[i] > 0 ? (
                <span key={s.label} className="eb-chip">
                  <StageArt theme={theme.id} stage={(i + 1) as StageIndex} size={1.1} /> {stageCounts[i]} {s.label.toLowerCase()}
                </span>
              ) : null,
            )}
          </div>
        )}
      </header>

      {!other && (
        <div className="eb-card-alt mb-5">
          <div className="font-semibold">It&apos;s just you here so far.</div>
          <div className="text-sm eb-muted">Once your partner opens Every Box, you both see the same {theme.worldName}.</div>
        </div>
      )}

      {reviewDue && (
        <Link href="/every-box/review" className="eb-card mb-5 flex items-center gap-3 no-underline hover:brightness-[0.99]">
          <span className="text-2xl" aria-hidden>
            ✨
          </span>
          <div className="flex-1">
            <div className="font-semibold">Weekly review is ready</div>
            <div className="text-sm eb-muted">
              {pending.surfaced.length} {pending.surfaced.length === 1 ? "thing" : "things"} changed. Takes about a minute.
            </div>
          </div>
        </Link>
      )}

      {waitingOnMe.length > 0 && (
        <Link href="/every-box/commitments" className="eb-card mb-5 flex items-center gap-3 no-underline hover:brightness-[0.99]">
          <span className="text-2xl" aria-hidden>
            🤝
          </span>
          <div className="flex-1">
            <div className="font-semibold">
              {waitingOnMe.length === 1 ? "A proposal is waiting for you" : `${waitingOnMe.length} proposals are waiting for you`}
            </div>
            <div className="text-sm eb-muted">Nothing starts until you agree to it.</div>
          </div>
        </Link>
      )}

      {categories.length === 0 ? (
        <div className="eb-card text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <StageVisual theme={theme} stage={2} size={5} />
          </div>
          <h2 className="text-lg font-semibold">Nothing planted yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm eb-muted">
            Add the parts of life you want to keep an eye on together: date nights, chores, check-ins, family,
            health, whatever matters. Each one gets its own ideal rhythm.
          </p>
          <Link href="/every-box/boxes" className="eb-btn eb-btn-primary mt-4">
            Add your first {theme.noun}
          </Link>
        </div>
      ) : (
        <>
          <BoxFilterBar items={categories} />
          {shown.length === 0 ? (
            <p className="eb-card-alt text-sm eb-muted">Nothing matches those filters. Try “Everyone” or “All”.</p>
          ) : (
            <section className="eb-grid">
              {shown.map((c) => (
                <CategoryCard key={c._id} category={c} now={now} />
              ))}
            </section>
          )}
        </>
      )}

      {active.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Commitments in progress</h2>
            <Link href="/every-box/commitments" className="text-sm underline eb-muted">
              All commitments
            </Link>
          </div>
          <div className="grid gap-3">
            {active.slice(0, 4).map((c) => (
              <CommitmentCard key={c._id} commitment={c} now={now} />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-xs eb-muted">
        <Link href="/every-box/glance" className="underline">
          Open the glanceable view
        </Link>
      </footer>
    </div>
  );
}
