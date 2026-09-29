"use client";

import { useState } from "react";
import { WHEEL, type Core } from "./wheel";

/**
 * A three-ring wheel, like the poster on the wall: seven feelings in the
 * middle, their finer words around them, and the body sensations that tend to
 * come with each on the outside, all visible at once. Tap a feeling in the
 * middle and that slice fills the wheel so the small words are readable on a
 * phone; tap the center to see the whole wheel again. Tap as many words as fit.
 */
const C = 250;
const R = { core0: 40, core1: 96, mid0: 100, mid1: 160, out0: 164, out1: 246 };

function wedge(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0} A${r1} ${r1} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${large} 0 ${x3} ${y3} Z`;
}

/** Text that runs along the radius and never reads upside down. */
function radial(mid: number, r: number, size: number, fill: string, text: string, key: string) {
  const deg = (mid * 180) / Math.PI;
  const flip = deg > 90 && deg < 270;
  const x = C + r * Math.cos(mid);
  const y = C + r * Math.sin(mid);
  return <text key={key} x={x} y={y} transform={`rotate(${flip ? deg + 180 : deg} ${x} ${y})`} textAnchor="middle" dominantBaseline="middle" fontSize={size} fontWeight={600} fill={fill}>{text}</text>;
}

const fill = (hue: number, on: boolean, level: 0 | 1 | 2) => (on ? `hsl(${hue} 55% 36%)` : level === 0 ? `hsl(${hue} 60% 68%)` : level === 1 ? `hsl(${hue} 55% 78%)` : `hsl(${hue} 50% 87%)`);
const ink = (on: boolean) => (on ? "#ffffff" : "#1f261c");

export function Wheel({ picked, onToggle, pickedBody, onToggleBody }: { picked: Set<string>; onToggle: (word: string) => void; pickedBody: Set<string>; onToggleBody: (word: string) => void }) {
  const [focus, setFocus] = useState<Core | null>(null);
  const start = -Math.PI / 2;
  const total = WHEEL.reduce((n, c) => n + c.ring.length, 0);

  // Which cores are laid out, and over how much of the circle.
  const cores = focus ? [focus] : WHEEL;
  const layout: { core: Core; a0: number; a1: number }[] = [];
  let a = start;
  for (const c of cores) {
    const span = focus ? 2 * Math.PI : (2 * Math.PI * c.ring.length) / total;
    layout.push({ core: c, a0: a, a1: a + span });
    a += span;
  }
  const press = (fn: () => void) => ({ onClick: fn, role: "button" as const, tabIndex: 0, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } } });

  return (
    <div className={`sh-wheel ${focus ? "is-zoomed" : ""}`}>
      <svg viewBox="0 0 500 500" role="group" aria-label="Feelings and sensations wheel">
        {layout.map(({ core, a0, a1 }) => {
          const mid = (a0 + a1) / 2;
          const on = picked.has(core.word.toLowerCase());
          const n = core.ring.length;
          const step = (a1 - a0) / n;
          return (
            <g key={core.key}>
              <g className="sh-wedge" aria-pressed={on} {...press(() => { if (focus) onToggle(core.word.toLowerCase()); else setFocus(core); })}>
                <path d={wedge(R.core0, R.core1, a0, a1)} fill={fill(core.hue, on, 0)} stroke="var(--surface)" strokeWidth="2" />
                {a1 - a0 < 0.62 && !focus
                  ? radial(mid, 68, 12, ink(on), core.word, `c-${core.key}`)
                  : <text x={C + 68 * Math.cos(mid)} y={C + 68 * Math.sin(mid)} textAnchor="middle" dominantBaseline="middle" fontSize={focus ? 18 : 14} fontWeight={700} fill={ink(on)}>{core.word}</text>}
              </g>
              {core.ring.map((r, i) => {
                const b0 = a0 + i * step;
                const b1 = b0 + step;
                const bm = (b0 + b1) / 2;
                const ron = picked.has(r.word);
                const bodyStep = step / r.body.length;
                return (
                  <g key={r.word}>
                    <g className="sh-wedge" aria-pressed={ron} {...press(() => onToggle(r.word))}>
                      <path d={wedge(R.mid0, R.mid1, b0, b1)} fill={fill(core.hue, ron, 1)} stroke="var(--surface)" strokeWidth="1.5" />
                      {radial(bm, (R.mid0 + R.mid1) / 2, focus ? 13 : 9.5, ink(ron), r.word, `t-${r.word}`)}
                    </g>
                    {r.body.map((w, k) => {
                      const c0 = b0 + k * bodyStep;
                      const c1 = c0 + bodyStep;
                      const cm = (c0 + c1) / 2;
                      const won = pickedBody.has(w);
                      return (
                        <g key={`${r.word}-${w}`} className="sh-wedge" aria-pressed={won} {...press(() => onToggleBody(w))}>
                          <path d={wedge(R.out0, R.out1, c0, c1)} fill={fill(core.hue, won, 2)} stroke="var(--surface)" strokeWidth="1.2" />
                          {radial(cm, (R.out0 + R.out1) / 2, focus ? 12 : 7.6, ink(won), w, `b-${r.word}-${w}`)}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          );
        })}
        <g className="sh-wedge" {...press(() => setFocus(null))} aria-label={focus ? "Show the whole wheel" : "The whole wheel"}>
          <circle cx={C} cy={C} r={R.core0 - 4} fill="var(--surface)" stroke="var(--border)" />
          <text x={C} y={C - 4} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--text-muted)">{focus ? "whole" : "feeling"}</text>
          <text x={C} y={C + 8} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="var(--text-muted)">{focus ? "wheel" : "· body"}</text>
        </g>
      </svg>
      <p className="sh-hint">{focus ? `Zoomed in on ${focus.word.toLowerCase()}. Tap the middle to see the whole wheel.` : "Middle: the feeling. Around it: finer words. Outside: what the body tends to do. Tap a feeling in the middle to zoom in."}</p>
      {(picked.size > 0 || pickedBody.size > 0) && (
        <p className="sh-hint">
          {picked.size > 0 && <>Feeling: {[...picked].join(", ")}. </>}
          {pickedBody.size > 0 && <>Body: {[...pickedBody].join(", ")}. </>}
          Tap again to unpick.
        </p>
      )}
    </div>
  );
}
