import type { ReactElement } from "react";
import type { Glyph } from "@/core/hearth/care";

/**
 * Simple line drawings for the hair cards, so each step can be followed by
 * eye. One head, drawn the same way every time, with the thing that changes.
 */
const Head = ({ hair = "wavy" }: { hair?: "wavy" | "up" | "down" | "braid" | "wrapped" }) => (
  <>
    <circle cx="24" cy="18" r="9" />
    {hair === "wavy" && <path d="M15 18 q-3 10 1 20 M33 18 q3 10 -1 20 M17 30 q3 -3 5 0 t5 0 t5 0" />}
    {hair === "down" && <path d="M15 18 q-4 12 0 22 M33 18 q4 12 0 22" />}
    {hair === "up" && <path d="M18 10 q6 -8 12 0 M20 8 q4 -6 8 0" />}
    {hair === "braid" && <path d="M33 18 q4 6 2 12 q-3 4 0 8 q3 4 0 8 M31 22 l4 4 M31 30 l4 4" />}
    {hair === "wrapped" && <path d="M13 16 q11 -14 22 0 q2 8 -3 12 h-16 q-5 -4 -3 -12" />}
  </>
);

const DRAW: Record<Glyph, ReactElement> = {
  wash: <><Head hair="down" /><path d="M6 8 q6 -4 12 0 M8 10 v3 M11 11 v3 M14 10 v3" /><path d="M20 36 q4 3 8 0" /></>,
  comb: <><Head hair="down" /><path d="M36 26 v12 M36 30 h6 M36 34 h6 M36 38 h6" /></>,
  wet: <><Head hair="down" /><path d="M16 38 l-1 3 M24 40 l-1 3 M32 38 l-1 3" /><path d="M10 30 l-1 3 M38 30 l-1 3" /></>,
  pray: <><Head hair="down" /><path d="M12 24 q-4 6 -2 14 M36 24 q4 6 2 14" /><path d="M9 28 h4 M35 28 h4" /></>,
  scrunch: <><Head hair="wavy" /><path d="M8 34 q4 -4 8 0 M32 34 q4 -4 8 0" /><path d="M12 30 l0 -4 M36 30 l0 -4" /></>,
  plop: <><Head hair="wrapped" /><path d="M13 28 l-5 4 M35 28 l5 4" /><path d="M12 40 h24" /></>,
  handsoff: <><Head hair="wavy" /><path d="M4 10 l8 8 M12 10 l-8 8" /><path d="M36 10 l8 8 M44 10 l-8 18" strokeWidth="0" /><circle cx="40" cy="14" r="5" /><path d="M36 18 l8 -8" /></>,
  diffuse: <><Head hair="wavy" /><path d="M36 30 h8 v8 h-8 z M36 34 h-4 l-4 -6" /><circle cx="40" cy="34" r="1" /><circle cx="42" cy="36" r="1" /><circle cx="38" cy="36" r="1" /></>,
  pineapple: <><Head hair="up" /><path d="M24 30 v10" /></>,
  bonnet: <><Head hair="wrapped" /><path d="M10 32 h28 q2 4 0 8 h-28 q-2 -4 0 -8 z" /></>,
  spray: <><Head hair="wavy" /><path d="M38 20 v8 h4 v-8 z M40 20 v-4 h3" /><path d="M34 22 l-3 -1 M34 26 l-3 1 M34 24 h-4" /></>,
  clip: <><Head hair="wavy" /><path d="M18 8 l4 -4 M24 7 l3 -5 M30 8 l4 -4" /><path d="M17 9 h3 M23 8 h3 M29 9 h3" /></>,
  braid: <><Head hair="braid" /></>,
  claw: <><Head hair="up" /><path d="M20 12 q4 -4 8 0 M19 9 l2 4 M29 9 l-2 4 M24 8 v4" /></>,
  bowl: <><path d="M10 24 h28 q0 12 -14 12 q-14 0 -14 -12 z" /><path d="M16 20 q4 -4 8 0 t8 0" /><path d="M20 36 v4 M28 36 v4" /></>,
  flat: <><Head hair="down" /><path d="M10 14 h6 M32 14 h6" /><path d="M12 12 l-2 2 l2 2 M36 12 l2 2 l-2 2" /></>,
};

export function HairGlyph({ g }: { g: Glyph }) {
  return (
    <span className="hh-glyph" aria-hidden>
      <svg viewBox="0 0 48 48">{DRAW[g]}</svg>
    </span>
  );
}
