/**
 * Call to action helpers shared by every forge. A generator returns two or
 * three call to action options; John picks one or leaves it out. Nothing
 * here touches the AI: it is about what happens after the options arrive.
 */

/** Where a carousel's call to action slide goes. "none" means no slide at all. */
export type CtaPlacement = "none" | "middle" | "end" | "both";

export const CTA_PLACEMENTS: Array<{ id: CtaPlacement; label: string; note: string }> = [
  { id: "end", label: "End", note: "The last slide, after the content." },
  { id: "middle", label: "Middle", note: "One slide halfway through the content." },
  { id: "both", label: "Both", note: "Halfway through and at the end." },
  { id: "none", label: "No slide", note: "Slides only carry the content." },
];

export const DEFAULT_CTA_PLACEMENT: CtaPlacement = "end";

export function isCtaPlacement(v: unknown): v is CtaPlacement {
  return v === "none" || v === "middle" || v === "end" || v === "both";
}

/** The call to action that actually goes out: the chosen line, or nothing when John turned it off. */
export function effectiveCta(on: boolean, selected: string): string {
  return on ? (selected || "").trim() : "";
}

/** Caption plus the call to action on its own line, without doubling it when the caption already carries it. */
export function withCtaLine(caption: string, cta: string): string {
  const c = (caption || "").trim();
  const line = (cta || "").trim();
  if (!line) return c;
  if (!c) return line;
  if (c.toLowerCase().includes(line.toLowerCase())) return c;
  return `${c}\n\n${line}`;
}

/** Keep the chosen option when it is still offered; otherwise fall back to the first option. */
export function reconcileCta(options: string[], selected: string): string {
  if (selected && options.includes(selected)) return selected;
  return options[0] ?? "";
}
