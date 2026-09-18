"use client";

import type { StageIndex } from "@/convex/everyBox/freshness";
import { stageVisual, type Theme } from "@/convex/everyBox/themes";

interface Props {
  theme: Theme;
  stage: StageIndex;
  className?: string;
}

/**
 * Five soft segments that fill from left to right as a box is tended and
 * empty again as time passes. It shows the stage, never a number; there is
 * nothing to add up.
 */
export function FreshnessMeter({ theme, stage, className }: Props) {
  const label = stageVisual(theme, stage).label;
  return (
    <div className={`eb-meter ${className ?? ""}`} role="img" aria-label={label} title={label}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="eb-meter-seg"
          data-filled={i <= stage ? "true" : "false"}
          style={i <= stage ? { background: `var(--eb-tint-${stage})` } : undefined}
        />
      ))}
    </div>
  );
}
