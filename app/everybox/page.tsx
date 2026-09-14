"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness, DAY_MS } from "@/convex/everybox/freshness";
import { CategoryCard } from "@/components/everybox/CategoryCard";
import { CommitmentCard } from "@/components/everybox/CommitmentCard";
import { useEveryBox } from "@/components/everybox/context";
import { StageVisual } from "@/components/everybox/StageVisual";
import { Spinner } from "@/components/everybox/ui";
import { useNow } from "@/components/everybox/useNow";

const REVIEW_NUDGE_AFTER_DAYS = 5;

export default function DashboardPage() {
  const { household, partner, other, theme } = useEveryBox();
  const now = useNow();
  const categories = useQuery(api.everybox.categories.list);
  const commitments = useQuery(api.everybox.commitments.list);
  const pending = useQuery(api.everybox.reviews.pending);

  if (!categories || !commitments) return <Spinner label={`Growing ${theme.worldName}`} />;

  const active = commitments.open.filter((c) => c.status === "active" || c.status === "agreed");
  const waitingOnMe = commitments.open.filter((c) => c.status === "proposed" && c.assignedTo === partner._id);
  const reviewDue =
    pending &&
    pending.surfaced.length > 0 &&
    (pending.lastReviewAt === null || now - pending.lastReviewAt > REVIEW_NUDGE_AFTER_DAYS * DAY_MS);

  const stageCounts = [0, 0, 0, 0, 0];
  for (const c of categories) {
    stageCounts[computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage - 1]++;
  }

  return (
    <div className="eb-container">
      <header className="mb-6">
        <p className="text-sm eb-muted">
          {household.name} · {other ? `${partner.displayName} & ${other.displayName}` : partner.displayName}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {theme.worldName.charAt(0).toUpperCase() + theme.worldName.slice(1)}
        </h1>
        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="How things are right now">
            {theme.stages.map((s, i) =>
              stageCounts[i] > 0 ? (
                <span key={s.label} className="eb-chip">
                  <span aria-hidden>{s.glyph}</span> {stageCounts[i]} {s.label.toLowerCase()}
                </span>
              ) : null,
            )}
          </div>
        )}
      </header>

      {!other && (
        <div className="eb-card-alt mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">It&apos;s just you here so far.</div>
            <div className="text-sm eb-muted">Invite your partner so you can both see the same {theme.worldName}.</div>
          </div>
          <Link href="/everybox/settings#invite" className="eb-btn eb-btn-primary eb-btn-sm">
            Invite partner
          </Link>
        </div>
      )}

      {reviewDue && (
        <Link href="/everybox/review" className="eb-card mb-5 flex items-center gap-3 no-underline hover:brightness-[0.99]">
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
        <Link href="/everybox/commitments" className="eb-card mb-5 flex items-center gap-3 no-underline hover:brightness-[0.99]">
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
          <Link href="/everybox/categories" className="eb-btn eb-btn-primary mt-4">
            Add your first {theme.noun}
          </Link>
        </div>
      ) : (
        <section className="eb-grid">
          {categories.map((c) => (
            <CategoryCard key={c._id} category={c} now={now} />
          ))}
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-semibold">Commitments in progress</h2>
            <Link href="/everybox/commitments" className="text-sm underline eb-muted">
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
        <Link href="/everybox/widget" className="underline">
          Open the glanceable view
        </Link>
      </footer>
    </div>
  );
}
