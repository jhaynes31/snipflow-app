import { useMemo } from 'react';

/**
 * The growing tree (Section 13). Grows with growthPoints; roots with rootPoints.
 * It only ever grows. Deterministic from the points so it never "loses" leaves.
 */
export function Tree({ growth, roots, milestones = [], size = 260, celebrate = false }: { growth: number; roots: number; milestones?: string[]; size?: number; celebrate?: boolean }) {
  const stage = Math.min(1, Math.log1p(growth) / Math.log1p(120));
  const leaves = Math.min(60, Math.floor(growth / 2) + 2);
  const rootCount = Math.min(12, Math.floor(roots / 2) + 1);
  const blooms = milestones.length;

  const leafNodes = useMemo(() => {
    const out: { x: number; y: number; r: number; hue: number }[] = [];
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let k = 0; k < leaves; k++) {
      const ang = rnd() * Math.PI * 2;
      const rad = 6 + rnd() * (18 + stage * 70);
      out.push({ x: 130 + Math.cos(ang) * rad, y: 120 - stage * 20 + Math.sin(ang) * rad * 0.7, r: 7 + rnd() * 9, hue: rnd() });
    }
    return out;
  }, [leaves, stage]);

  const trunkH = 70 + stage * 90;
  const crownY = 215 - trunkH;
  return (
    <svg viewBox="0 0 260 300" width={size} height={size * 300 / 260} role="img" aria-label={`Your tree, ${growth} growth and ${roots} root points`}>
      {celebrate && <g style={{ animation: 'sunbeam 2.6s ease-out forwards' }}>
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={210} y1={40} x2={210 + Math.cos((i / 5) * Math.PI + 1.2) * 90} y2={40 + Math.sin((i / 5) * Math.PI + 1.2) * 90} stroke="var(--accent)" strokeWidth={6} strokeLinecap="round" />)}
      </g>}
      <circle cx={210} cy={40} r={22} fill="var(--accent)" opacity={0.7} />
      {/* roots */}
      {Array.from({ length: rootCount }).map((_, i) => {
        const dir = i % 2 === 0 ? -1 : 1;
        const len = 20 + (i * 7) % 40;
        return <path key={i} d={`M130 232 q ${dir * len * 0.4} 10 ${dir * len} ${18 + (i % 3) * 8}`} stroke="var(--color-bark-600)" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.7} />;
      })}
      <ellipse cx={130} cy={232} rx={70} ry={10} fill="var(--bg-card-soft)" />
      {/* trunk */}
      <path d={`M122 232 L120 ${crownY + 30} Q130 ${crownY + 10} 140 ${crownY + 30} L138 232 Z`} fill="var(--color-bark-600)" />
      {stage > 0.35 && <path d={`M128 ${crownY + 60} q -30 -15 -45 -40`} stroke="var(--color-bark-600)" strokeWidth={6} fill="none" strokeLinecap="round" />}
      {stage > 0.55 && <path d={`M132 ${crownY + 45} q 30 -18 42 -44`} stroke="var(--color-bark-600)" strokeWidth={6} fill="none" strokeLinecap="round" />}
      {/* crown */}
      <g transform={`translate(0 ${crownY - 120})`}>
        <ellipse cx={130} cy={120 - stage * 20} rx={22 + stage * 70} ry={16 + stage * 50} fill="var(--color-fern-400)" opacity={0.35} />
        {leafNodes.map((l, i) => <circle key={i} cx={l.x} cy={l.y} r={l.r} fill={l.hue < 0.33 ? 'var(--color-fern-400)' : l.hue < 0.66 ? 'var(--color-moss-600)' : 'var(--color-forest-700)'} opacity={0.92} className={i === leafNodes.length - 1 && celebrate ? 'grow-in' : undefined} />)}
        {Array.from({ length: Math.min(8, blooms) }).map((_, i) => <circle key={`b${i}`} cx={100 + ((i * 37) % 70)} cy={110 + ((i * 23) % 40)} r={5} fill="var(--accent)" />)}
      </g>
      {growth === 0 && <text x={130} y={150} textAnchor="middle" fontSize={14} fill="var(--text-muted)" fontFamily="var(--font-sans)">a sprout, waiting</text>}
    </svg>
  );
}
