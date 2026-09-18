"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { computeFreshness, describeCadence, describeLastTended } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { partnerName, partnerNames, useEveryBox } from "@/modules/every-box/components/context";
import { isTender, tenderIdsOf } from "@/convex/everyBox/tenders";
import { FreshnessMeter } from "@/modules/every-box/components/FreshnessMeter";
import { StageArt } from "@/modules/every-box/components/StageArt";
import { NoteForm } from "@/modules/every-box/components/NoteForm";
import { StageVisual } from "@/modules/every-box/components/StageVisual";
import { TendButton } from "@/modules/every-box/components/TendButton";
import { Btn, Spinner } from "@/modules/every-box/components/ui";
import { useNow } from "@/modules/every-box/components/useNow";

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function BoxDetail({ id }: { id: string }) {
  const categoryId = id as Id<"ebCategories">;
  const { theme, partner, partners } = useEveryBox();
  const now = useNow();
  const data = useQuery(api.everyBox.categories.get, { categoryId });
  const deleteNote = useMutation(api.everyBox.categories.deleteNote);
  const undoTend = useMutation(api.everyBox.categories.undoTend);
  const [justTended, setJustTended] = useState(false);

  if (data === undefined) return <Spinner />;
  if (data === null) {
    return (
      <div className="eb-container max-w-2xl">
        <p className="eb-muted">That one isn&apos;t here.</p>
        <Link href="/every-box" className="eb-btn eb-btn-secondary mt-4">
          Back home
        </Link>
      </div>
    );
  }

  const { category, events, notes } = data;
  const fresh = computeFreshness(category.lastTendedAt, category.idealCadenceDays, now);
  const visual = stageVisual(theme, fresh.stage);
  const mine = isTender(category, partner._id);
  const tenderText = partnerNames(partners, tenderIdsOf(category), partner._id);

  const history = [
    ...events.map((e) => ({ kind: "tend" as const, at: e.tendedAt, by: e.partnerId, text: e.note, id: e._id })),
    ...notes.map((n) => ({ kind: "note" as const, at: n.createdAt, by: n.partnerId, text: n.text, id: n._id })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="eb-container max-w-2xl">
      <Link href="/every-box" className="text-sm underline eb-muted">
        ← Back to {theme.worldName}
      </Link>

      <section className="eb-card mt-3 flex flex-col items-center gap-3 text-center">
        <StageVisual theme={theme} stage={fresh.stage} size={7} justTended={justTended} />
        <FreshnessMeter theme={theme} stage={fresh.stage} className="max-w-xs" />
        <div>
          <h1 className="text-2xl font-bold">
            <span className="mr-1" aria-hidden>
              {category.icon}
            </span>
            {category.name}
          </h1>
          <p className="eb-accent font-semibold">{visual.label}</p>
          <p className="text-sm eb-muted">{visual.flavor}</p>
        </div>
        <p className="text-sm eb-muted">
          {describeLastTended(category.lastTendedAt, now)} · {describeCadence(category.idealCadenceDays).toLowerCase()} ·
          tended by {tenderText}
        </p>
        {category.archivedAt && <span className="eb-chip">Resting</span>}
      </section>

      <section className="mt-4 grid gap-3">
        {mine && !category.archivedAt && (
          <TendButton
            categoryId={category._id}
            onTended={() => {
              setJustTended(true);
              setTimeout(() => setJustTended(false), 900);
            }}
          />
        )}
        {!mine && (
          <p className="text-sm eb-muted">
            {tenderText.charAt(0).toUpperCase() + tenderText.slice(1)} tends this one. You can leave a note whenever something is worth
            knowing.
          </p>
        )}
        <NoteForm categoryId={category._id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="text-sm eb-muted">Nothing logged yet. That&apos;s fine; it starts whenever you do.</p>
        ) : (
          <ol className="grid gap-2">
            {history.map((h) => (
              <li key={h.id} className="eb-card-alt flex items-start gap-3 text-sm">
                <span aria-hidden className="mt-0.5">
                  {h.kind === "tend" ? (
                    <StageArt theme={theme.id} stage={5} size={1.4} />
                  ) : (
                    <svg viewBox="0 0 24 24" width="1.3rem" height="1.3rem" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 4h10l4 4v12H5z" /><path d="M15 4v4h4" /><path d="M8 13h8M8 17h6" />
                    </svg>
                  )}
                </span>
                <div className="flex-1">
                  <div>
                    <span className="font-medium">{partnerName(partners, h.by, partner._id)}</span>{" "}
                    {h.kind === "tend" ? theme.tendPast + " this" : "left a note"}
                    <span className="eb-muted"> · {formatWhen(h.at)}</span>
                  </div>
                  {h.text && <div className="mt-0.5 whitespace-pre-wrap">{h.text}</div>}
                </div>
                {h.by === partner._id && (
                  <Btn
                    small
                    variant="ghost"
                    aria-label={h.kind === "tend" ? "Remove this entry" : "Remove note"}
                    title={h.kind === "tend" ? "Logged by mistake? Remove it and the box goes back to how it was." : "Remove note"}
                    onClick={() => {
                      if (h.kind === "tend") {
                        if (window.confirm("Remove this entry? The box goes back to how it was before it.")) {
                          void undoTend({ eventId: h.id as Id<"ebTendingEvents"> });
                        }
                      } else {
                        void deleteNote({ noteId: h.id as Id<"ebCategoryNotes"> });
                      }
                    }}
                  >
                    ×
                  </Btn>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-8 text-center text-xs eb-muted">
        <Link href="/every-box/boxes" className="underline">
          Edit name, rhythm or tender
        </Link>
      </p>
    </div>
  );
}
