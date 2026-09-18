"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { computeFreshness, DEFAULT_COMMITMENT_CADENCE_DAYS, describeLastTended } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { partnerName, partnerNames, useEveryBox } from "./context";
import { assigneeIdsOf, isAssignee } from "@/convex/everyBox/tenders";
import { FreshnessMeter } from "./FreshnessMeter";
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
  const agree = useMutation(api.everyBox.commitments.agree);
  const decline = useMutation(api.everyBox.commitments.decline);
  const tend = useMutation(api.everyBox.commitments.tend);
  const markDone = useMutation(api.everyBox.commitments.markDone);
  const { busy, error, run } = useAction();
  // "Still on it" often changes nothing visible (already checked in today), so
  // the button confirms itself for a moment and the visual gives a little pulse.
  const [justChecked, setJustChecked] = useState(false);
  useEffect(() => {
    if (!justChecked) return;
    const t = window.setTimeout(() => setJustChecked(false), 2000);
    return () => window.clearTimeout(t);
  }, [justChecked]);

  const assignees = assigneeIdsOf(c);
  const mine = isAssignee(c, partner._id);
  const proposedByMe = c.proposedBy === partner._id;
  const needsMyAgreement = c.status === "proposed" && mine && !proposedByMe;
  const forText =
    assignees.length > 1 ? "both of you" : mine ? "you" : partnerNames(partners, assignees, partner._id);
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
          <StageVisual theme={theme} stage={fresh.stage} size={3} justTended={justChecked} />
        ) : (
          <span className="eb-stage" data-stage="2" style={{ width: "3rem", height: "3rem" }} aria-hidden>
            <svg viewBox="0 0 24 24" width="1.5rem" height="1.5rem" fill="none" stroke="var(--eb-text)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <circle cx={9} cy={12} r={5.5} fill="var(--eb-tint-3)" />
              <circle cx={15} cy={12} r={5.5} fill="var(--eb-tint-4)" fillOpacity={0.8} />
            </svg>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{c.title}</div>
          {isActive ? (
            <div className="text-xs eb-muted">
              <span className="eb-accent">{visual.label}</span> · {describeLastTended(c.lastTendedAt, now).replace("Tended", "Checked in")} ·{" "}
              for {forText}
              {c.targetWindowDays ? ` · aiming for about ${c.targetWindowDays} days` : ""}
            </div>
          ) : (
            <div className="text-xs eb-muted">
              Proposed by {partnerName(partners, c.proposedBy, partner._id)} for {forText} ·{" "}
              {needsMyAgreement ? "waiting for you to agree" : "waiting for agreement"}
            </div>
          )}
        </div>
      </div>

      {isActive && <FreshnessMeter theme={theme} stage={fresh.stage} />}

      <ErrorNote error={error} />

      {needsMyAgreement && (
        <div className="flex flex-wrap gap-2">
          <Btn small disabled={busy} onClick={() => void run(() => agree({ commitmentId: c._id }))}>
            I agree to this
          </Btn>
          <Btn small variant="ghost" disabled={busy} onClick={() => void run(() => decline({ commitmentId: c._id }))}>
            Not this one
          </Btn>
        </div>
      )}
      {c.status === "proposed" && proposedByMe && (
        <div className="flex flex-wrap gap-2">
          <Btn small variant="ghost" disabled={busy} onClick={() => void run(() => decline({ commitmentId: c._id }))}>
            Withdraw
          </Btn>
        </div>
      )}
      {isActive && mine && (
        <div className="flex flex-wrap gap-2">
          <Btn
            small
            variant="secondary"
            disabled={busy || justChecked}
            onClick={() =>
              void run(async () => {
                await tend({ commitmentId: c._id });
                setJustChecked(true);
              })
            }
          >
            {justChecked ? "Checked in ✓" : "Still on it"}
          </Btn>
          <Btn small disabled={busy} onClick={() => void run(() => markDone({ commitmentId: c._id }))}>
            Done
          </Btn>
        </div>
      )}
    </div>
  );
}
