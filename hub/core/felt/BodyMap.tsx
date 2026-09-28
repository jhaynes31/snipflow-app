"use client";

import { useState } from "react";
import { AREA_LABEL, BODY_AREAS, WHOLE_BODY, type View } from "./wheel";

/** A front and a back outline. Tap every area you notice it; tapped areas glow. */
export function BodyMap({ picked, onToggle }: { picked: Set<string>; onToggle: (area: string) => void }) {
  const [view, setView] = useState<View>("front");
  const [hover, setHover] = useState<string | null>(null);
  const areas = BODY_AREAS.filter((a) => a.view === view);
  const hovered = hover ? AREA_LABEL[hover] : null;
  const chosen = [...picked].map((k) => AREA_LABEL[k] ?? k);
  return (
    <div className="sh-bodymap">
      <div className="sh-chips">
        <button type="button" className={`sh-chip ${view === "front" ? "" : "sh-chip-quiet"}`} onClick={() => setView("front")}>Front</button>
        <button type="button" className={`sh-chip ${view === "back" ? "" : "sh-chip-quiet"}`} onClick={() => setView("back")}>Back</button>
        <button type="button" className={`sh-chip ${picked.has(WHOLE_BODY) ? "" : "sh-chip-quiet"}`} aria-pressed={picked.has(WHOLE_BODY)} onClick={() => onToggle(WHOLE_BODY)}>All over</button>
      </div>
      <svg viewBox="0 0 200 440" role="group" aria-label={`Body, ${view}`}>
        <path className="sh-body-outline" d="M100 12 a28 30 0 1 1 -0.1 0 M88 74 h24 v20 M50 104 q50 -22 100 0 l18 16 v120 l-22 0 v-90 l6 130 l-6 34 v0 l-4 126 h-38 l-2 -126 h-12 l-2 126 h-38 l-4 -126 l-6 -34 l6 -130 v90 l-22 0 v-120 z" />
        {areas.map((a) => {
          const on = picked.has(a.key);
          const common = { className: `sh-body-area ${on ? "is-on" : ""}`, onClick: () => onToggle(a.key), onMouseEnter: () => setHover(a.key), onMouseLeave: () => setHover(null), onFocus: () => setHover(a.key), onBlur: () => setHover(null), role: "button" as const, tabIndex: 0, "aria-pressed": on, "aria-label": a.label, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(a.key); } } };
          const s = a.shape;
          if (s.kind === "ellipse") return <ellipse key={a.key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common}><title>{a.label}</title></ellipse>;
          if (s.kind === "rect") return <rect key={a.key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.r ?? 0} {...common}><title>{a.label}</title></rect>;
          return <path key={a.key} d={s.d} {...common}><title>{a.label}</title></path>;
        })}
      </svg>
      <p className="sh-body-name" aria-live="polite">{hovered ?? (chosen.length ? `Tapped: ${chosen.join(", ")}` : "Hover or tap a part to see its name")}</p>
      <p className="sh-hint">{view === "front" ? "Tap where you notice it. Flip to Back for the neck, back and hips." : "Tap where you notice it. Flip to Front for the chest, belly and face."}</p>
    </div>
  );
}
