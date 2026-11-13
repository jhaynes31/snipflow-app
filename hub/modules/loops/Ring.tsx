"use client";

import type { Doc } from "@/convex/_generated/dataModel";
import { rampWeight } from "@/convex/loops/pure";
import type { ThemeTokens } from "./theme";

type Stage = Doc<"lpLoops">["stages"][number];

interface Props {
  theme: ThemeTokens;
  stages: Stage[];
  hereId?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  spiral?: boolean;
  passes?: number;
  /** Ids with lookout flags (warning signs), shown on the first two stages. */
  flagged?: Set<string>;
  pinnedLine?: string | null;
  truth?: string | null;
  kids?: { child?: string; teen?: string };
  compact?: boolean;
}

const SIZE = 520;
const C = SIZE / 2;

/**
 * The ring: stages as stepping stones (Shire) or leaves (Metamorphosis)
 * around a circle, curved arrows between them, exit ramps branching outward
 * (wider and brighter on early stages), and the "you are here" marker: a
 * lantern or a butterfly. Spiral mode lifts the ring and shows past passes
 * below it. Inline SVG, themeable, 44px tap targets.
 */
export function Ring({ theme, stages, hereId, selectedId, onSelect, spiral, passes = 0, flagged, pinnedLine, truth, kids, compact }: Props) {
  const n = Math.max(1, stages.length);
  const R = compact ? 150 : 180;
  const pos = (i: number, r = R) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const y = C + r * Math.sin(a) * (spiral ? 0.72 : 1);
    return { x: C + r * Math.cos(a), y, a };
  };
  const nodeR = compact ? 30 : Math.max(26, Math.min(40, 150 / Math.sqrt(n)));
  const marker = stages.findIndex((s) => s.id === hereId);
  const storyIdx = stages.findIndex((s) => s.key === "story");

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="lp-ring" role="img" aria-label={`${theme.toolName}: ${stages.map((s) => s.name).join(", ")}`}>
      <defs>
        <radialGradient id={`lp-glow-${theme.key}`}><stop offset="0%" stopColor={theme.marker2} stopOpacity="0.9" /><stop offset="100%" stopColor={theme.marker1} stopOpacity="0" /></radialGradient>
        <marker id={`lp-arrow-${theme.key}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={theme.ring} /></marker>
      </defs>
      <rect x="0" y="0" width={SIZE} height={SIZE} fill="none" />
      {/* Past passes in spiral mode: faint rings below. */}
      {spiral && Array.from({ length: Math.min(5, passes) }, (_, k) => (
        <ellipse key={k} cx={C} cy={C + 26 * (k + 1)} rx={R} ry={R * 0.72} fill="none" stroke={theme.ring} strokeOpacity={0.35 - k * 0.06} strokeWidth="2" strokeDasharray="6 8" />
      ))}
      {/* The ring and its arrows. */}
      {stages.map((s, i) => {
        const a = pos(i);
        const b = pos((i + 1) % n);
        const mid = pos(i + 0.5, R + 14);
        return <path key={`arc-${s.id}`} className="lp-arrow" d={`M${a.x} ${a.y} Q${mid.x} ${mid.y} ${b.x} ${b.y}`} fill="none" stroke={theme.ring} strokeWidth="3" strokeDasharray="10 14" strokeLinecap="round" markerEnd={`url(#lp-arrow-${theme.key})`} opacity="0.85" />;
      })}
      {/* Exit ramps: little paths outward, wider and brighter early. */}
      {stages.map((s, i) => {
        const p = pos(i);
        const w = rampWeight(i, n);
        const out = pos(i, R + 58);
        const bend = pos(i + 0.08, R + 34);
        return (
          <g key={`ramp-${s.id}`} className="lp-ramp">
            <path d={`M${p.x} ${p.y} Q${bend.x} ${bend.y} ${out.x} ${out.y}`} fill="none" stroke={theme.ramp} strokeWidth={3 + 7 * w} strokeOpacity={0.25 + 0.6 * w} strokeLinecap="round" />
            <circle cx={out.x} cy={out.y} r={3 + 3 * w} fill={theme.ramp} fillOpacity={0.3 + 0.6 * w} />
          </g>
        );
      })}
      {/* Nodes. */}
      {stages.map((s, i) => {
        const p = pos(i);
        const sel = s.id === selectedId;
        const label = s.name.length > 14 ? `${s.name.slice(0, 13)}…` : s.name;
        return (
          <g key={s.id} className="lp-node" transform={`translate(${p.x} ${p.y})`} role="button" tabIndex={0} aria-label={`${s.name}${s.id === hereId ? ", you are here" : ""}`} onClick={() => onSelect?.(s.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(s.id); } }}>
            {theme.node === "stone" ? (
              <ellipse className="lp-node-shape" rx={nodeR} ry={nodeR * 0.8} fill={theme.nodeFill} stroke={sel ? theme.accent : theme.nodeStroke} strokeWidth={sel ? 4 : 2} />
            ) : (
              <path className="lp-node-shape" d={`M0 ${-nodeR} C ${nodeR} ${-nodeR * 0.6}, ${nodeR} ${nodeR * 0.6}, 0 ${nodeR} C ${-nodeR} ${nodeR * 0.6}, ${-nodeR} ${-nodeR * 0.6}, 0 ${-nodeR} Z`} fill={theme.nodeFill} stroke={sel ? theme.accent : theme.nodeStroke} strokeWidth={sel ? 4 : 2} transform={`rotate(${(i * 360) / n + 30})`} />
            )}
            <text textAnchor="middle" y="4" fontSize={compact ? 10 : 11.5} fontWeight="700" fill={theme.nodeText}>{label}</text>
            <text textAnchor="middle" y={-nodeR - 6} fontSize="10" fill={theme.nodeText} opacity="0.7">{i + 1}</text>
            {flagged?.has(s.id) && <text x={nodeR - 4} y={-nodeR + 8} fontSize="14" aria-label="lookout flag">⚑</text>}
          </g>
        );
      })}
      {/* Pinned belief and truth near The Story. */}
      {storyIdx >= 0 && (pinnedLine || truth) && (() => {
        const p = pos(storyIdx, R - 100);
        const anchor = p.x > C + 10 ? "end" : p.x < C - 10 ? "start" : "middle";
        const shift = anchor === "end" ? -nodeR * 0.2 : anchor === "start" ? nodeR * 0.2 : 0;
        return (
          <g key="pin" transform={`translate(${p.x + shift} ${p.y})`}>
            {pinnedLine && <text textAnchor={anchor} fontSize="9.5" fill={theme.nodeText} opacity="0.8"><tspan x="0" dy="0">old: {pinnedLine.slice(0, 28)}{pinnedLine.length > 28 ? "…" : ""}</tspan></text>}
            {truth && <text textAnchor={anchor} fontSize="9.5" fontWeight="700" fill={theme.accent}><tspan x="0" dy={pinnedLine ? 13 : 0}>true: {truth.slice(0, 30)}{truth.length > 30 ? "…" : ""}</tspan></text>}
          </g>
        );
      })()}
      {/* Inner kids near the stage they're tied to. */}
      {(["child", "teen"] as const).map((age) => {
        const sid = kids?.[age];
        const idx = stages.findIndex((s) => s.id === sid);
        if (idx < 0) return null;
        const p = pos(idx, R + 92 + (age === "teen" ? 18 : 0));
        return <KidFigure key={age} age={age} theme={theme} x={p.x} y={p.y} />;
      })}
      {/* You are here. */}
      {marker >= 0 && (() => {
        const p = pos(marker, R - 46);
        return (
          <g transform={`translate(${p.x} ${p.y})`} aria-hidden>
            <circle className="lp-marker-glow" r="26" fill={`url(#lp-glow-${theme.key})`} />
            {theme.marker === "lantern" ? <Lantern c1={theme.marker1} c2={theme.marker2} /> : <Butterfly c1={theme.marker1} c2={theme.marker2} />}
          </g>
        );
      })()}
      {/* Center. */}
      <text x={C} y={C - 6} textAnchor="middle" fontSize="12" fill={theme.nodeText} opacity="0.6">{spiral ? "the spiral" : "the loop"}</text>
      {spiral && passes > 0 && <text x={C} y={C + 10} textAnchor="middle" fontSize="10" fill={theme.nodeText} opacity="0.55">{passes} {passes === 1 ? "pass" : "passes"} below you</text>}
    </svg>
  );
}

function Lantern({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <g>
      <rect x="-7" y="-12" width="14" height="20" rx="3" fill={c2} stroke="#6b4f39" strokeWidth="1.5" />
      <rect x="-9" y="-14" width="18" height="3" rx="1" fill="#6b4f39" />
      <rect x="-9" y="8" width="18" height="3" rx="1" fill="#6b4f39" />
      <path d="M-4 -14 Q0 -22 4 -14" fill="none" stroke="#6b4f39" strokeWidth="1.5" />
      <circle cy="-2" r="4" fill={c1} />
    </g>
  );
}

function Butterfly({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <g>
      <path d="M0 0 C -14 -16, -24 -4, -12 4 C -22 10, -8 18, 0 6 Z" fill={c2} stroke="#3D5A73" strokeWidth="1" />
      <path d="M0 0 C 14 -16, 24 -4, 12 4 C 22 10, 8 18, 0 6 Z" fill={c1} stroke="#3D5A73" strokeWidth="1" />
      <ellipse rx="2" ry="7" cy="3" fill="#3D5A73" />
    </g>
  );
}

function KidFigure({ age, theme, x, y }: { age: "child" | "teen"; theme: ThemeTokens; x: number; y: number }) {
  if (theme.key === "chrysalis") {
    return age === "child" ? (
      <g transform={`translate(${x} ${y})`} aria-label="the caterpillar"><circle cx="-10" cy="0" r="5" fill="#8fb069" /><circle cx="-3" cy="-2" r="5" fill="#8fb069" /><circle cx="4" cy="0" r="5" fill="#8fb069" /><circle cx="11" cy="-1" r="6" fill="#6f8f5a" /><circle cx="13" cy="-3" r="1" fill="#1f261c" /></g>
    ) : (
      <g transform={`translate(${x} ${y})`} aria-label="the chrysalis"><path d="M0 -12 C 8 -8, 8 8, 0 14 C -8 8, -8 -8, 0 -12 Z" fill="#b89ad6" stroke="#3D5A73" strokeWidth="1" /><path d="M0 -12 L0 -17" stroke="#3D5A73" strokeWidth="1.5" /></g>
    );
  }
  return age === "child" ? (
    <g transform={`translate(${x} ${y})`} aria-label="the little one with a lantern"><circle cy="-8" r="5" fill="#f3e0c9" /><path d="M-6 -3 Q0 -1 6 -3 L5 8 L-5 8 Z" fill="#9c7a5c" /><rect x="7" y="-2" width="4" height="6" rx="1" fill="#f2c14e" /></g>
  ) : (
    <g transform={`translate(${x} ${y})`} aria-label="the teenager at the edge of the woods"><circle cy="-11" r="5" fill="#f3e0c9" /><path d="M-6 -6 Q0 -4 6 -6 L6 10 L-6 10 Z" fill="#4F6B3A" /><path d="M-9 4 L-3 -2 M9 4 L3 -2" stroke="#4F6B3A" strokeWidth="2" /></g>
  );
}
