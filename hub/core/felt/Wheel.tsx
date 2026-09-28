"use client";

import { useState } from "react";
import { WHEEL, type Core } from "./wheel";

/**
 * The wheel itself: seven cores in the middle ring. Tap one and that slice
 * grows: its ring of finer words fills the outer ring, readable on a phone,
 * and the finest words appear as chips below. Tap as many as fit.
 */
const CX = 160;
const CY = 160;

function wedge(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

export function Wheel({ picked, onToggle }: { picked: Set<string>; onToggle: (word: string) => void }) {
  const [focus, setFocus] = useState<Core | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const n = WHEEL.length;
  const step = (2 * Math.PI) / n;
  const start = -Math.PI / 2;
  const fill = (hue: number, on: boolean, soft = false) => (on ? `hsl(${hue} 45% 42%)` : soft ? `hsl(${hue} 35% 88%)` : `hsl(${hue} 40% 80%)`);
  const ring = focus?.ring ?? [];
  const rstep = ring.length ? (2 * Math.PI) / ring.length : 0;
  const finer = ring.find((r) => r.word === sub)?.words ?? [];

  return (
    <div className="sh-wheel">
      <svg viewBox="0 0 320 320" role="group" aria-label="Feelings wheel">
        {WHEEL.map((c, i) => {
          const a0 = start + i * step;
          const a1 = a0 + step;
          const mid = (a0 + a1) / 2;
          const on = picked.has(c.word.toLowerCase());
          const isFocus = focus?.key === c.key;
          return (
            <g key={c.key} className="sh-wedge" onClick={() => { setFocus(isFocus && !on ? null : c); setSub(null); onToggle(c.word.toLowerCase()); }} role="button" aria-pressed={on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFocus(c); onToggle(c.word.toLowerCase()); } }}>
              <path d={wedge(34, isFocus ? 104 : 96, a0, a1)} fill={fill(c.hue, on)} stroke="var(--surface)" strokeWidth="2" />
              <text x={CX + 66 * Math.cos(mid)} y={CY + 66 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="700" fill={on ? "#fff" : "var(--text)"}>{c.word}</text>
            </g>
          );
        })}
        {ring.map((r, i) => {
          const a0 = start + i * rstep;
          const a1 = a0 + rstep;
          const mid = (a0 + a1) / 2;
          const on = picked.has(r.word);
          const isSub = sub === r.word;
          return (
            <g key={r.word} className="sh-wedge" onClick={() => { setSub(isSub ? null : r.word); onToggle(r.word); }} role="button" aria-pressed={on} tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSub(r.word); onToggle(r.word); } }}>
              <path d={wedge(108, isSub ? 156 : 150, a0, a1)} fill={fill(focus!.hue, on, true)} stroke="var(--surface)" strokeWidth="2" />
              <text x={CX + 130 * Math.cos(mid)} y={CY + 130 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill={on ? "#fff" : "var(--text)"}>{r.word}</text>
            </g>
          );
        })}
        {!focus && <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="var(--text-muted)">tap one</text>}
      </svg>
      {finer.length > 0 && (
        <div className="sh-chips" aria-label={`Finer words for ${sub}`}>
          {finer.map((w) => (
            <button key={w} type="button" className={`sh-chip ${picked.has(w) ? "" : "sh-chip-quiet"}`} aria-pressed={picked.has(w)} onClick={() => onToggle(w)}>{w}</button>
          ))}
        </div>
      )}
      {picked.size > 0 && <p className="sh-hint">Picked: {[...picked].join(", ")}. Tap again to unpick.</p>}
    </div>
  );
}
