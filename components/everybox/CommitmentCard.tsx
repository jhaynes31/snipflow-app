"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { computeFreshness, DEFAULT_COMMITMENT_CADENCE_DAYS, describeLastTended } from "@/convex/everybox/freshness";
import { stageVisual } from "@/convex/everybox/themes";
import { partnerName, useEveryBox } from "./context";
import { StageVisual } from "./StageVisual";
import { Btn, ErrorNote, useAction } from "./ui";

interface Props {
  commitment: Doc<"ebCommitments">;
  now: number;
}

/**
 * One commitment. Proposed items wait for the assignee to agree. Active items
 * wither on the same visual system as categories, and "Done" archives them
 * for good rather than resetting them.
 */
export function CommitmentCard({ commitment: c, now }: Props) {
  const { theme, partner, partners } = useEveryBox();
  const agree = useMutation(api.everybox.commitments.agree);
  const decline = useMutation(api.everybox.commitments.decline);
  const tend = useMutation(api.everybox.commitments.tend);
  const markDone = useMutation(api.everybox.commitments.markDone);
  const { busy, error, run } = useAction();

  const mine = c.assignedTo === partner._id;
  const proposedByMe = c.proposedBy === partner._id;
  const isActive = c.status === "active" || c.status === "agreed";
  const fresh = computeFreshness(
    c.lastTendedAt ?? c.activatedAt ?? c.createdAt,
    c.targetWindowDays ?? DEFAULT_COMMITMENT_CADENCE_DAYS,
    now,
  );
  const visual = stageVisual(theme, fresh.stage);

  return (
    <div className="eb-card eb-fade-in flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {isActive ? (
          <StageVisual theme={theme} stage={fresh.stage} size={3} />
        ) : (
          <span className="eb-stage" data-stage="2" style={{ width: "3rem", height: "3rem" }} aria-hidden>
            <span className="eb-stage-glyph" style={{ fontSize: "1.4rem" }}>
              🤝
            </span>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{c.title}</div>
          {isActive ? (
            <div className="text-xs eb-muted">
              <span className="eb-accent">{visual.label}</span> · {describeLastTended(c.lastTendedAt, now).replace("Tended", "Checked in")} ·{" "}
              {mine ? "yours" : `${partnerName(partners, c.assignedTo, partner._id)}'s`}
              {c.targetWindowDays ? ` · aiming for about ${c.targetWindowDays} days` : ""}
            </div>
          ) : (
            <div className="text-xs eb-muted">
              Proposed by {partnerName(partners, c.proposedBy, partner._id)} for{" "}
              {partnerName(partners, c.assignedTo, partner._id)} · waiting for agreement
            </div>
          )}
        </div>
      </div>

      <ErrorNote error={error} />

      {c.status === "proposed" && mine && (
        <div className="flex flex-wrap gap-2">
          <Btn small disabled={busy} onClick={() => void run(() => agree({ commitmentId: c._id }))}>
            I agree to this
          </Btn>
          <Btn small variant="ghost" disabled={busy} onClick={() => void run(() => decline({ commitmentId: c._id }))}>
            Not this one
          </Btn>
        </div>
      )}
      {c.status === "proposed" && !mine && proposedByMe && (
        <div className="flex flex-wrap gap-2">
          <Btn small variant="ghost" disabled={busy} onClick={() => void run(() => decline({ commitmentId: c._id }))}>
            Withdraw
          </Btn>
        </div>
      )}
      {isActive && mine && (
        <div className="flex flex-wrap gap-2">
          <Btn small variant="secondary" disabled={busy} onClick={() => void run(() => tend({ commitmentId: c._id }))}>
            Still on it
          </Btn>
          <Btn small disabled={busy} onClick={() => void run(() => markDone({ commitmentId: c._id }))}>
            Done
          </Btn>
        </div>
      )}
    </div>
  );
}
