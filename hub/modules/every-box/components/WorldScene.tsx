"use client";

import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";
import { computeFreshness } from "@/convex/everyBox/freshness";
import { stageVisual } from "@/convex/everyBox/themes";
import { useEveryBox } from "./context";
import { SceneDecor, StageArt } from "./StageArt";

interface Props {
  categories: Doc<"ebCategories">[];
  now: number;
}

/**
 * The living picture at the top of the home screen. Every box appears in
 * the scene at its current stage, so a glance says how the whole world is
 * doing without reading a single word. Purely a skin over the same data.
 */
export function WorldScene({ categories, now }: Props) {
  const { theme } = useEveryBox();
  const { scene } = theme;

  return (
    <div
      className="eb-scene"
      style={{ ["--eb-scene-sky" as string]: scene.sky, ["--eb-scene-ground" as string]: scene.ground }}
    >
      <div className="eb-scene-sky" aria-hidden />
      <div className="eb-scene-ground" aria-hidden />
      <SceneDecor theme={theme.id} />
      <ul className="eb-scene-plots" aria-label={`Every ${theme.noun} in ${theme.worldName}`}>
        {categories.map((c) => {
          const stage = computeFreshness(c.lastTendedAt, c.idealCadenceDays, now).stage;
          const visual = stageVisual(theme, stage);
          return (
            <li key={c._id}>
              <Link href={`/every-box/box/${c._id}`} className="eb-plot" data-stage={stage} title={`${c.name}: ${visual.label}`}>
                <span className="eb-plot-glyph" aria-hidden>
                  <StageArt theme={theme.id} stage={stage} size={3.2} />
                </span>
                <span className="eb-plot-name">
                  <span aria-hidden>{c.icon}</span> {c.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
