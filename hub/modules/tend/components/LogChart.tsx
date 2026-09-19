"use client";

import { useState } from "react";
import type { DayPoint } from "@/convex/tend/patterns";

/**
 * Mood and energy over time, one axis (both run 1 to 5), two lines in a
 * validated pair (moss green, heather plum), a legend, a crosshair tooltip,
 * and a table view. Sleep gets its own small chart below because hours are
 * a different scale, never a second axis.
 */
const W = 640;
const H = 200;
const PAD = { l: 28, r: 12, t: 12, b: 24 };

function x(i: number, n: number) {
  return PAD.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - PAD.l - PAD.r));
}
function y(v: number, min: number, max: number) {
  return PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
}

function path(points: DayPoint[], pick: (p: DayPoint) => number | null, min: number, max: number): string {
  let d = "";
  let open = false;
  points.forEach((p, i) => {
    const v = pick(p);
    if (v === null) {
      open = false;
      return;
    }
    d += `${open ? "L" : "M"}${x(i, points.length).toFixed(1)},${y(v, min, max).toFixed(1)} `;
    open = true;
  });
  return d;
}

export function LogChart({ points }: { points: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const n = points.length;
  if (n === 0) return <p className="sh-muted">No check-ins in this stretch yet. The chart grows as you check in.</p>;
  const hp = hover === null ? null : points[hover];
  const sleepMax = Math.max(10, ...points.map((p) => p.sleep ?? 0));

  return (
    <div className="viz-root tend-chart">
      <div className="tend-legend" aria-label="Legend">
        <span><i className="tend-swatch" style={{ background: "var(--series-1)" }} /> Mood (1 heavy to 5 sunny)</span>
        <span><i className="tend-swatch" style={{ background: "var(--series-2)" }} /> Energy (1 empty to 5 revved)</span>
        <button type="button" className="sh-link" onClick={() => setTable((t) => !t)}>{table ? "Show chart" : "Show table"}</button>
      </div>
      {table ? (
        <table className="tend-table">
          <thead><tr><th>Day</th><th>Mood</th><th>Energy</th><th>Sleep (h)</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day}><td>{p.day}</td><td>{p.weather ?? "–"}</td><td>{p.energy ?? "–"}</td><td>{p.sleep ?? "–"}</td></tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="tend-svg" role="img" aria-label="Mood and energy over time"
            onMouseMove={(e) => {
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width) * W;
              const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
              setHover(Math.min(n - 1, Math.max(0, i)));
            }}
            onMouseLeave={() => setHover(null)}
          >
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v, 1, 5)} y2={y(v, 1, 5)} className="tend-grid" />
                <text x={PAD.l - 6} y={y(v, 1, 5) + 4} className="tend-tick" textAnchor="end">{v}</text>
              </g>
            ))}
            <text x={PAD.l} y={H - 6} className="tend-tick">{points[0].day}</text>
            <text x={W - PAD.r} y={H - 6} className="tend-tick" textAnchor="end">{points[n - 1].day}</text>
            <path d={path(points, (p) => p.weather, 1, 5)} className="tend-line" style={{ stroke: "var(--series-1)" }} />
            <path d={path(points, (p) => p.energy, 1, 5)} className="tend-line" style={{ stroke: "var(--series-2)" }} />
            {points.map((p, i) => (
              <g key={p.day}>
                {p.weather !== null && <circle cx={x(i, n)} cy={y(p.weather, 1, 5)} r={4} className="tend-dot" style={{ fill: "var(--series-1)" }} />}
                {p.energy !== null && <circle cx={x(i, n)} cy={y(p.energy, 1, 5)} r={4} className="tend-dot" style={{ fill: "var(--series-2)" }} />}
              </g>
            ))}
            {hover !== null && <line x1={x(hover, n)} x2={x(hover, n)} y1={PAD.t} y2={H - PAD.b} className="tend-crosshair" />}
          </svg>
          {hp && (
            <div className="tend-tooltip" role="status">
              <strong>{hp.day}</strong> · mood {hp.weather ?? "–"} · energy {hp.energy ?? "–"} · sleep {hp.sleep ?? "–"} h
            </div>
          )}
          <p className="sh-hint">Sleep, hours per night</p>
          <svg viewBox={`0 0 ${W} 90`} className="tend-svg tend-svg-small" role="img" aria-label="Sleep hours per night">
            {points.map((p, i) => {
              if (p.sleep === null) return null;
              const bw = Math.min(24, Math.max(4, (W - PAD.l - PAD.r) / n - 2));
              const h = (p.sleep / sleepMax) * 60;
              return <rect key={p.day} x={x(i, n) - bw / 2} y={70 - h} width={bw} height={h} rx={4} ry={4} className="tend-bar" style={{ fill: "var(--series-1)" }} />;
            })}
            <line x1={PAD.l} x2={W - PAD.r} y1={70} y2={70} className="tend-grid" />
            <text x={PAD.l - 6} y={14} className="tend-tick" textAnchor="end">{sleepMax}</text>
            <text x={PAD.l - 6} y={72} className="tend-tick" textAnchor="end">0</text>
          </svg>
        </>
      )}
    </div>
  );
}
