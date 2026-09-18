"use client";

import type { StageIndex } from "@/convex/everyBox/freshness";
import type { ThemeId } from "@/convex/everyBox/themes";

/**
 * Vector illustrations for each theme's five stages, drawn in the active
 * palette (via CSS variables) so they always sit naturally on the page.
 * Each theme is one parametric drawing: higher stages add elements rather
 * than swapping pictures, so growth reads as growth.
 *
 * Palette hooks: --eb-accent, --eb-text, --eb-muted, --eb-tint-1…5, --eb-surface.
 */

interface Props {
  theme: ThemeId;
  stage: StageIndex;
  /** Rendered size in rem (square). */
  size?: number;
  className?: string;
}

const STROKE = "var(--eb-text)";
const ACCENT = "var(--eb-accent)";
const MUTED = "var(--eb-muted)";
const T = (n: number) => `var(--eb-tint-${n})`;

function Garden({ stage }: { stage: StageIndex }) {
  const stemTop = [50, 40, 30, 22, 20][stage - 1];
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* soil mound */}
      <path d="M8 56 Q32 42 56 56 Z" fill={T(1)} stroke="none" />
      <path d="M8 56 Q32 42 56 56" />
      {stage === 1 && <ellipse cx={32} cy={51} rx={3.5} ry={2.5} fill={MUTED} stroke="none" />}
      {stage >= 2 && <path d={`M32 52 C32 46 32 ${stemTop + 8} 32 ${stemTop}`} />}
      {stage >= 2 && (
        <>
          <path d="M32 46 C26 46 23 42 23 39 C27 39 31 41 32 46 Z" fill={T(3)} />
          <path d="M32 44 C38 44 41 40 41 37 C37 37 33 39 32 44 Z" fill={T(3)} />
        </>
      )}
      {stage >= 3 && (
        <>
          <path d="M32 38 C25 38 22 33 22 30 C27 30 31 33 32 38 Z" fill={T(4)} />
          <path d="M32 35 C39 35 42 30 42 27 C37 27 33 30 32 35 Z" fill={T(4)} />
        </>
      )}
      {stage === 4 && <ellipse cx={32} cy={21} rx={4} ry={5.5} fill={T(5)} />}
      {stage === 5 && (
        <g>
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse
              key={a}
              cx={32}
              cy={13}
              rx={3.6}
              ry={6.5}
              fill={T(5)}
              stroke={STROKE}
              strokeWidth={1.5}
              transform={`rotate(${a} 32 20)`}
            />
          ))}
          <circle cx={32} cy={20} r={3.2} fill={ACCENT} stroke="none" />
        </g>
      )}
    </g>
  );
}

function Fish({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <ellipse cx={0} cy={0} rx={6} ry={3.4} fill={T(4)} stroke={STROKE} strokeWidth={1.6} />
      <path d="M6 0 L10 -3 L10 3 Z" fill={T(4)} stroke={STROKE} strokeWidth={1.6} strokeLinejoin="round" />
      <circle cx={-2.8} cy={-0.8} r={0.9} fill={STROKE} />
    </g>
  );
}

function Aquarium({ stage }: { stage: StageIndex }) {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* tank */}
      <rect x={8} y={12} width={48} height={42} rx={6} fill={T(2)} fillOpacity={0.55} />
      <path d="M8 20 Q20 16 32 20 T56 20" stroke={ACCENT} strokeOpacity={0.6} />
      {/* sand */}
      <path d="M8 50 Q32 44 56 50 L56 54 L8 54 Z" fill={T(1)} stroke="none" />
      {stage === 1 && <path d="M28 48 a4 4 0 0 1 8 0" stroke={MUTED} />}
      {stage >= 2 && (
        <g stroke={ACCENT} strokeOpacity={0.7}>
          <circle cx={18} cy={40} r={1.6} />
          <circle cx={21} cy={33} r={1.1} />
          <circle cx={16} cy={27} r={0.9} />
        </g>
      )}
      {stage >= 3 && <Fish x={34} y={34} />}
      {stage >= 4 && (
        <>
          <Fish x={24} y={42} s={0.7} flip />
          <path d="M46 50 C44 44 48 42 46 36 C44 32 48 30 46 26" stroke={ACCENT} />
        </>
      )}
      {stage === 5 && (
        <>
          <Fish x={44} y={28} s={0.6} />
          <path d="M14 50 L14 40 M14 44 L10 38 M14 42 L18 36 M10 38 L8 34 M18 36 L20 31" stroke={T(5)} strokeWidth={2.4} />
        </>
      )}
    </g>
  );
}

function Character({ stage }: { stage: StageIndex }) {
  const chevrons = Math.min(3, Math.max(0, stage - 1));
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 8 L50 14 V30 C50 42 41 51 32 56 C23 51 14 42 14 30 V14 Z" fill={stage === 1 ? T(1) : T(2)} />
      {stage >= 3 && <path d="M32 8 L50 14 V30 C50 42 41 51 32 56 Z" fill={T(3)} stroke="none" fillOpacity={0.5} />}
      {Array.from({ length: chevrons }, (_, i) => (
        <path key={i} d={`M24 ${40 - i * 8} L32 ${33 - i * 8} L40 ${40 - i * 8}`} stroke={i === chevrons - 1 && stage >= 4 ? ACCENT : STROKE} />
      ))}
      {stage >= 4 && <path d="M32 14 l2.2 4.6 5 .7-3.6 3.5.9 5L32 25.4l-4.5 2.4.9-5-3.6-3.5 5-.7z" fill={T(5)} />}
      {stage === 5 && (
        <>
          <path d="M11 48 C5 40 5 32 11 24" stroke={ACCENT} strokeWidth={2.4} />
          <path d="M53 48 C59 40 59 32 53 24" stroke={ACCENT} strokeWidth={2.4} />
          <ellipse cx={7} cy={36} rx={2.2} ry={3.4} fill={ACCENT} stroke="none" />
          <ellipse cx={57} cy={36} rx={2.2} ry={3.4} fill={ACCENT} stroke="none" />
        </>
      )}
    </g>
  );
}

function House({ stage }: { stage: StageIndex }) {
  const lit = stage === 5;
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 56 H54" stroke={MUTED} />
      {/* body + roof */}
      <rect x={16} y={30} width={32} height={26} fill={stage === 1 ? T(1) : T(2)} />
      <path d="M12 32 L32 14 L52 32" fill={T(3)} />
      {stage >= 4 && <rect x={40} y={17} width={5} height={9} fill={T(2)} />}
      {/* door */}
      {stage >= 2 ? <rect x={28} y={42} width={8} height={14} fill={T(4)} /> : <rect x={28} y={42} width={8} height={14} fill={T(1)} />}
      {/* windows */}
      {stage === 1 ? (
        <>
          <rect x={19} y={35} width={8} height={7} fill={T(1)} />
          <path d="M19 35 L27 42 M27 35 L19 42" stroke={MUTED} />
          <rect x={37} y={35} width={8} height={7} fill={T(1)} />
          <path d="M37 35 L45 42 M45 35 L37 42" stroke={MUTED} />
        </>
      ) : (
        <>
          <rect x={19} y={35} width={8} height={7} fill={lit ? T(5) : T(2)} />
          <rect x={37} y={35} width={8} height={7} fill={lit ? T(5) : T(2)} />
          {stage >= 3 && <path d="M23 35 V42 M19 38.5 H27 M41 35 V42 M37 38.5 H45" strokeWidth={1.2} />}
        </>
      )}
      {stage >= 4 && <path d="M12 56 C12 50 8 48 8 44 C8 40 12 38 14 38 C16 38 20 40 20 44 C20 48 16 50 16 56" fill={T(3)} />}
      {lit && <path d="M42.5 17 C42.5 12 47 12 46 8 C45 5 48 4 48 2" stroke={MUTED} strokeOpacity={0.7} />}
    </g>
  );
}

function Terrarium({ stage }: { stage: StageIndex }) {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* jar */}
      <path d="M22 8 H42 V12 C48 16 50 24 50 34 V50 C50 54 46 56 42 56 H22 C18 56 14 54 14 50 V34 C14 24 16 16 22 12 Z" fill={T(2)} fillOpacity={0.5} />
      <path d="M22 8 H42" strokeWidth={3} />
      {/* soil */}
      <path d="M14 46 Q32 40 50 46 V50 C50 54 46 56 42 56 H22 C18 56 14 54 14 50 Z" fill={T(1)} stroke="none" />
      {stage >= 2 && (
        <g stroke={ACCENT} strokeOpacity={0.7} strokeWidth={1.6}>
          <path d="M20 22 q1.5 -3 3 0 a1.5 1.5 0 0 1 -3 0" />
          <path d="M41 28 q1.5 -3 3 0 a1.5 1.5 0 0 1 -3 0" />
        </g>
      )}
      {stage >= 3 && (
        <>
          <path d="M16 46 C18 41 22 41 24 46" fill={T(3)} />
          <path d="M40 46 C42 42 46 42 48 46" fill={T(3)} />
        </>
      )}
      {stage >= 4 && (
        <>
          <path d="M32 46 V34 M32 38 L27 34 M32 36 L37 31" />
          <path d="M23 36 C21 30 25 26 30 27 C34 22 42 24 41 30 C46 31 44 38 38 37 C35 40 27 40 23 36 Z" fill={T(4)} />
        </>
      )}
      {stage === 5 && (
        <g>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={32} cy={26} rx={2} ry={3.4} fill={T(5)} stroke="none" transform={`rotate(${a} 32 29)`} />
          ))}
          <circle cx={32} cy={29} r={1.6} fill={ACCENT} stroke="none" />
        </g>
      )}
    </g>
  );
}

function Guild({ stage }: { stage: StageIndex }) {
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 10 H50" strokeWidth={3} />
      {stage === 1 ? (
        <path d="M28 10 V50 L32 46 L36 50 V10" fill={T(1)} />
      ) : (
        <path d="M16 10 V48 L32 40 L48 48 V10 Z" fill={stage >= 4 ? T(4) : T(2)} />
      )}
      {stage >= 3 && <circle cx={32} cy={26} r={7} fill={T(3)} />}
      {stage >= 4 && <path d="M32 21 l1.6 3.4 3.7.5-2.7 2.6.7 3.7L32 29.4l-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill={T(5)} stroke="none" />}
      {stage === 5 && (
        <>
          <path d="M22 4 L26 9 L32 3 L38 9 L42 4 L41 12 H23 Z" fill={T(5)} />
          <circle cx={20} cy={28} r={1.6} fill={ACCENT} stroke="none" />
          <circle cx={44} cy={28} r={1.6} fill={ACCENT} stroke="none" />
        </>
      )}
    </g>
  );
}

function Village({ stage }: { stage: StageIndex }) {
  const warm = T(5);
  return (
    <g fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 56 H56" stroke={MUTED} />
      <rect x={18} y={32} width={28} height={24} fill={stage === 1 ? T(1) : T(2)} />
      <path d="M14 34 L32 18 L50 34 Z" fill={T(3)} />
      <rect x={29} y={44} width={7} height={12} fill={stage >= 3 ? T(4) : T(1)} />
      <rect x={21} y={37} width={6} height={6} fill={stage >= 2 ? warm : T(1)} />
      <rect x={37} y={37} width={6} height={6} fill={stage >= 3 ? warm : T(1)} />
      {stage >= 3 && (
        <>
          <path d="M52 56 V40" />
          <rect x={49.5} y={35} width={5} height={6} rx={1} fill={warm} />
        </>
      )}
      {stage >= 4 && <path d="M40 20 C40 15 44 15 43 11 C42 8 45 7 45 5" stroke={MUTED} strokeOpacity={0.8} />}
      {stage === 5 && (
        <g fill={warm} stroke="none">
          <path d="M12 12 a5 5 0 1 0 6 6 a4 4 0 1 1 -6 -6 z" />
          <circle cx={24} cy={8} r={1} />
          <circle cx={54} cy={12} r={1.2} />
          <circle cx={46} cy={6} r={0.8} />
        </g>
      )}
    </g>
  );
}

const ART: Record<ThemeId, (p: { stage: StageIndex }) => React.JSX.Element> = {
  garden: Garden,
  aquarium: Aquarium,
  character: Character,
  house: House,
  terrarium: Terrarium,
  guild: Guild,
  village: Village,
};

export function StageArt({ theme, stage, size = 3, className }: Props) {
  const Draw = ART[theme];
  return (
    <svg
      viewBox="0 0 64 64"
      width={`${size}rem`}
      height={`${size}rem`}
      className={className}
      aria-hidden
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
    >
      <Draw stage={stage} />
    </svg>
  );
}

/** Quiet scene decoration for the home screen: simple shapes, no emoji. */
export function SceneDecor({ theme }: { theme: ThemeId }) {
  const common = { fill: "none", stroke: "rgba(255,255,255,0.7)", strokeWidth: 1.5, strokeLinecap: "round" as const };
  switch (theme) {
    case "aquarium":
    case "terrarium":
      return (
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="eb-scene-decor" aria-hidden>
          {[30, 90, 150, 260, 340].map((x, i) => (
            <circle key={x} cx={x} cy={30 + (i % 3) * 20} r={3 + (i % 2) * 2} {...common} />
          ))}
          <path d="M0 8 C60 2 120 14 180 8 S300 2 400 8" stroke="rgba(255,255,255,0.35)" fill="none" />
        </svg>
      );
    case "village":
    case "guild":
      return (
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="eb-scene-decor" aria-hidden>
          {[20, 70, 130, 200, 250, 310, 370].map((x, i) => (
            <circle key={x} cx={x} cy={12 + (i % 4) * 14} r={i % 3 === 0 ? 1.8 : 1.1} fill="rgba(255,255,255,0.75)" />
          ))}
          {theme === "village" && <path d="M340 20 a12 12 0 1 0 14 14 a9 9 0 1 1 -14 -14 z" fill="rgba(255,240,200,0.9)" />}
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" className="eb-scene-decor" aria-hidden>
          <g fill="rgba(255,255,255,0.75)">
            <ellipse cx={60} cy={30} rx={26} ry={9} />
            <ellipse cx={72} cy={24} rx={16} ry={8} />
            <ellipse cx={300} cy={22} rx={30} ry={9} />
            <ellipse cx={312} cy={16} rx={16} ry={7} />
          </g>
          <circle cx={360} cy={40} r={12} fill="rgba(255,236,170,0.9)" />
        </svg>
      );
  }
}
