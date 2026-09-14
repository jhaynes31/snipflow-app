"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { computeFreshness, describeCadence, describeLastTended } from "@/convex/everybox/freshness";
import { stageVisual } from "@/convex/everybox/themes";
import { partnerName, useEveryBox } from "@/components/everybox/context";
import { NoteForm } from "@/components/everybox/NoteForm";
import { StageVisual } from "@/components/everybox/StageVisual";
import { TendButton } from "@/components/everybox/TendButton";
import { Btn, Spinner } from "@/components/everybox/ui";
import { useNow } from "@/components/everybox/useNow";

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const categoryId = id as Id<"ebCategories">;
  const { theme, partner, partners } = useEveryBox();
  const now = useNow();
  const data = useQuery(api.everybox.categories.get, { categoryId });
  const deleteNote = useMutation(api.everybox.categories.deleteNote);
  const [justTended, setJustTended] = useState(false);

  if (data === undefined) return <Spinner />;
  if (data === null) {
    return (
      <div className="eb-container max-w-2xl">
        <p className="eb-muted">That one isn&apos;t here.</p>
        <Link href="/everybox" className="eb-btn eb-btn-secondary mt-4">
          Back home
        </Link>
      </div>
    );
  }

  const { category, events, notes } = data;
  const fresh = computeFreshness(category.lastTendedAt, category.idealCadenceDays, now);
  const visual = stageVisual(theme, fresh.stage);
  const mine = category.tenderId === partner._id;

  const history = [
    ...events.map((e) => ({ kind: "tend" as const, at: e.tendedAt, by: e.partnerId, text: e.note, id: e._id })),
    ...notes.map((n) => ({ kind: "note" as const, at: n.createdAt, by: n.partnerId, text: n.text, id: n._id })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="eb-container max-w-2xl">
      <Link href="/everybox" className="text-sm underline eb-muted">
        ← Back to {theme.worldName}
      </Link>

      <section className="eb-card mt-3 flex flex-col items-center gap-3 text-center">
        <StageVisual theme={theme} stage={fresh.stage} size={7} justTended={justTended} />
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
          tended by {partnerName(partners, category.tenderId, partner._id)}
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
            {partnerName(partners, category.tenderId, partner._id)} tends this one. You can leave a note whenever something is worth
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
                <span aria-hidden>{h.kind === "tend" ? visual.glyph : "📝"}</span>
                <div className="flex-1">
                  <div>
                    <span className="font-medium">{partnerName(partners, h.by, partner._id)}</span>{" "}
                    {h.kind === "tend" ? theme.tendPast + " this" : "left a note"}
                    <span className="eb-muted"> · {formatWhen(h.at)}</span>
                  </div>
                  {h.text && <div className="mt-0.5 whitespace-pre-wrap">{h.text}</div>}
                </div>
                {h.kind === "note" && h.by === partner._id && (
                  <Btn small variant="ghost" aria-label="Remove note" onClick={() => void deleteNote({ noteId: h.id as Id<"ebCategoryNotes"> })}>
                    ×
                  </Btn>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-8 text-center text-xs eb-muted">
        <Link href="/everybox/categories" className="underline">
          Edit name, rhythm or tender
        </Link>
      </p>
    </div>
  );
}
