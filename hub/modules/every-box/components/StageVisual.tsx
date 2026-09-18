"use client";

import type { StageIndex } from "@/convex/everyBox/freshness";
import { stageVisual, type Theme } from "@/convex/everyBox/themes";
import { StageArt } from "./StageArt";

interface Props {
  theme: Theme;
  stage: StageIndex;
  /** Diameter in rem. */
  size?: number;
  justTended?: boolean;
  /** Override the glyph (e.g. the category's own icon) while keeping stage styling. */
  glyph?: string;
  className?: string;
}

/**
 * The single visual that every theme skins: a tinted disc with the stage's
 * glyph. Dormant is small and soft, flourishing is big and glowing. Nothing
 * here is a number.
 */
export function StageVisual({ theme, stage, size = 4, justTended, glyph, className }: Props) {
  const visual = stageVisual(theme, stage);
  return (
    <span
      className={`eb-stage ${className ?? ""}`}
      data-stage={stage}
      data-just-tended={justTended ? "true" : undefined}
      style={{ width: `${size}rem`, height: `${size}rem` }}
      role="img"
      aria-label={visual.label}
      title={`${visual.label} — ${visual.flavor}`}
    >
      <span className="eb-stage-glyph" style={{ fontSize: `${size * 0.5}rem` }} aria-hidden>
        {glyph ?? <StageArt theme={theme.id} stage={stage} size={size * 0.7} />}
      </span>
    </span>
  );
}
