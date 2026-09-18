"use client";

import { useState } from "react";
import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { computeFreshness, describeLastTended } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { partnerNames, useEveryBox } from "./context";
import { isTender, tenderIdsOf } from "@/convex/everyBox/tenders";
import { FreshnessMeter } from "./FreshnessMeter";
import { StageVisual } from "./StageVisual";
import { TendButton } from "./TendButton";

interface Props {
  category: Doc<"ebCategories">;
  now: number;
}

export function CategoryCard({ category, now }: Props) {
  const { theme, partner, partners } = useEveryBox();
  const [justTended, setJustTended] = useState(false);
  const fresh = computeFreshness(category.lastTendedAt, category.idealCadenceDays, now);
  const visual = stageVisual(theme, fresh.stage);
  const mine = isTender(category, partner._id);

  return (
    <Link
      href={`/every-box/box/${category._id}`}
      className="eb-card eb-fade-in flex flex-col gap-3 no-underline transition hover:brightness-[0.99]"
    >
      <div className="flex items-start gap-3">
        <StageVisual theme={theme} stage={fresh.stage} size={3.5} justTended={justTended} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-semibold leading-tight">
            <span className="mr-1" aria-hidden>
              {category.icon}
            </span>
            {category.name}
          </div>
          <div className="text-sm eb-accent">{visual.label}</div>
          <div className="text-xs eb-muted">
            {describeLastTended(category.lastTendedAt, now)}
            {!mine && ` · ${partnerNames(partners, tenderIdsOf(category), partner._id)} tends`}
            {category.area && ` · ${category.area}`}
          </div>
        </div>
      </div>
      <FreshnessMeter theme={theme} stage={fresh.stage} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs eb-muted">{visual.flavor}</span>
        {mine && (
          <TendButton
            categoryId={category._id}
            compact
            onTended={() => {
              setJustTended(true);
              setTimeout(() => setJustTended(false), 900);
            }}
          />
        )}
      </div>
    </Link>
  );
}
