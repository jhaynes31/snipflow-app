"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { StageIndex } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { partnerName, partnerNames, useEveryBox } from "@/modules/every-box/components/context";
import { tenderIdsOf } from "@/convex/everyBox/tenders";
import { StageVisual } from "@/modules/every-box/components/StageVisual";
import { Btn, ErrorNote, PageTitle, Spinner, useAction } from "@/modules/every-box/components/ui";

type Answer = "yes" | "partial" | "no";

/**
 * The weekly review ritual. Only categories that changed since the last
 * review are surfaced, one at a time, with a single light question each.
 * Answers are a shared record, not a score, and never alter freshness.
 */
export function Review() {
  const { theme, partners, partner } = useEveryBox();
  const pending = useQuery(api.everyBox.reviews.pending);
  const history = useQuery(api.everyBox.reviews.history);
  const complete = useMutation(api.everyBox.reviews.complete);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [finished, setFinished] = useState(false);
  const { busy, error, run } = useAction();

  if (!pending) return <Spinner />;

  const items = pending.surfaced;
  const current = items[index];

  async function finish(finalAnswers: Record<string, Answer>) {
    const ok = await run(async () => {
      await complete({
        answers: Object.entries(finalAnswers).map(([categoryId, answer]) => ({
          categoryId: categoryId as Id<"ebCategories">,
          answer,
        })),
      });
      return true;
    });
    if (ok) setFinished(true);
  }

  function answer(a: Answer) {
    if (!current) return;
    const next = { ...answers, [current.category._id]: a };
    setAnswers(next);
    if (index + 1 < items.length) setIndex(index + 1);
    else void finish(next);
  }

  const lastReviewText =
    pending.lastReviewAt === null
      ? "No reviews yet."
      : `Last review ${new Date(pending.lastReviewAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.`;

  return (
    <div className="eb-container max-w-xl">
      <PageTitle title="Weekly review" subtitle={`${lastReviewText} Best done together, right after something you already do.`} />

      {finished ? (
        <div className="eb-card eb-fade-in text-center">
          <div className="mb-3 flex justify-center">
            <StageVisual theme={theme} stage={5} size={5} />
          </div>
          <h2 className="text-lg font-semibold">That&apos;s the review.</h2>
          <p className="mt-1 text-sm eb-muted">Nothing else to do here until next week. Go enjoy the evening.</p>
          <Link href="/every-box" className="eb-btn eb-btn-primary mt-4">
            Back to {theme.worldName}
          </Link>
        </div>
      ) : items.length === 0 ? (
        <div className="eb-card text-center">
          <h2 className="text-lg font-semibold">Nothing changed since last time.</h2>
          <p className="mt-1 text-sm eb-muted">
            {pending.totalCategories === 0
              ? `Add a few ${theme.nounPlural} first and the review will have something to look at.`
              : "No new tending, notes or stage changes to look over. You're done."}
          </p>
          <Link href={pending.totalCategories === 0 ? "/every-box/boxes" : "/every-box"} className="eb-btn eb-btn-secondary mt-4">
            {pending.totalCategories === 0 ? `Add ${theme.nounPlural}` : "Back home"}
          </Link>
        </div>
      ) : current ? (
        <div className="eb-card eb-fade-in" key={current.category._id}>
          <div className="mb-4 flex items-center justify-between text-xs eb-muted">
            <span>
              {index + 1} of {items.length}
            </span>
            <span>
              {current.reasons.includes("new")
                ? "New this week"
                : current.reasons.includes("activity")
                  ? "Had activity"
                  : "Changed stage"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <StageVisual theme={theme} stage={current.stage as StageIndex} size={5.5} />
            <div>
              <div className="text-xl font-bold">
                <span className="mr-1" aria-hidden>
                  {current.category.icon}
                </span>
                {current.category.name}
              </div>
              <div className="text-sm eb-accent">
                {stageVisual(theme, current.stage as StageIndex).label}
                {current.previousStage !== null && current.previousStage !== current.stage && (
                  <span className="eb-muted"> · was {stageVisual(theme, current.previousStage as StageIndex).label.toLowerCase()}</span>
                )}
              </div>
              <div className="text-xs eb-muted">tended by {partnerNames(partners, tenderIdsOf(current.category), partner._id)}</div>
            </div>
            <p className="mt-2 font-medium">Did this get real attention this week?</p>
            <ErrorNote error={error} />
            <div className="flex flex-wrap justify-center gap-2">
              <Btn disabled={busy} onClick={() => answer("yes")}>
                Yes
              </Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => answer("partial")}>
                Partly
              </Btn>
              <Btn variant="secondary" disabled={busy} onClick={() => answer("no")}>
                Not this week
              </Btn>
            </div>
            <p className="text-xs eb-muted">Any answer is fine. This is a shared note, not a mark.</p>
          </div>
        </div>
      ) : null}

      {history && history.length > 0 && !finished && (
        <details className="eb-archive mt-8">
          <summary>Past reviews ({history.length})</summary>
          <ul className="mt-3 grid gap-2 text-sm">
            {history.map((r) => (
              <li key={r._id} className="eb-card-alt flex items-center justify-between">
                <span>{new Date(r.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                <span className="eb-muted">
                  {r.acknowledgements.filter((a) => a.answer !== "skipped").length} looked at · by {partnerName(partners, r.completedBy, partner._id)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
