"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { computeFreshness, DAY_MS, type StageIndex } from "@/convex/everyBox/freshness";
import { isAssignee } from "@/convex/everyBox/tenders";
import { EveryBoxShell } from "./EveryBoxShell";
import { useEveryBox } from "./components/context";
import { StageArt } from "./components/StageArt";
import { useNow } from "./components/useNow";
import { WorldScene } from "./components/WorldScene";

const REVIEW_NUDGE_AFTER_DAYS = 5;

/**
 * The one small line for The Shire's Today row. Only the two neutral
 * nudges Every Box already shows on its own dashboard; never a count of
 * boxes needing attention, which stays inside Every Box (contract).
 */
export function EveryBoxToday() {
  return (
    <EveryBoxShell bare>
      <TodayLine />
    </EveryBoxShell>
  );
}

function TodayLine() {
  const { partner } = useEveryBox();
  const now = useNow(60_000);
  const pending = useQuery(api.everyBox.reviews.pending);
  const commitments = useQuery(api.everyBox.commitments.list);
  if (!pending || !commitments) return null;
  const reviewDue =
    pending.surfaced.length > 0 && (pending.lastReviewAt === null || now - pending.lastReviewAt > REVIEW_NUDGE_AFTER_DAYS * DAY_MS);
  const waiting = commitments.open.filter((c) => c.status === "proposed" && isAssignee(c, partner._id) && c.proposedBy !== partner._id);
  if (reviewDue) {
    return (
      <Link href="/every-box/review" className="eb-card block no-underline">
        <strong>Every Box:</strong> weekly review is ready. {pending.surfaced.length} {pending.surfaced.length === 1 ? "thing" : "things"} changed.
      </Link>
    );
  }
  if (waiting.length > 0) {
    return (
      <Link href="/every-box/commitments" className="eb-card block no-underline">
        <strong>Every Box:</strong> {waiting.length === 1 ? "a proposal is waiting for you." : `${waiting.length} proposals are waiting for you.`}
      </Link>
    );
  }
  return null;
}

/** The pinned home-screen card: the living picture of every box, at a glance. */
export function EveryBoxHome() {
  return (
    <EveryBoxShell bare>
      <HomeCard />
    </EveryBoxShell>
  );
}

function HomeCard() {
  const { theme } = useEveryBox();
  const now = useNow();
  const categories = useQuery(api.everyBox.categories.list);
  if (!categories) return null;
  if (categories.length === 0) {
    return (
      <p className="eb-muted">
        Nothing planted yet.{" "}
        <Link href="/every-box/boxes" className="underline">
          Add your first {theme.noun}
        </Link>
      </p>
    );
  }
  const counts = [0, 0, 0, 0, 0];
  for (const c of categories) counts[computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage - 1]++;
  return (
    <div className="grid gap-3">
      <WorldScene categories={categories} now={now} />
      <div className="flex flex-wrap gap-1.5">
        {theme.stages.map((s, i) =>
          counts[i] > 0 ? (
            <span key={s.label} className="eb-chip">
              <StageArt theme={theme.id} stage={(i + 1) as StageIndex} size={1.1} /> {counts[i]} {s.label.toLowerCase()}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
