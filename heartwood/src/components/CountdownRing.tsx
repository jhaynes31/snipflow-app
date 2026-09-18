/** Large visual countdown ring in golden hour colour (Section 7). */
export function CountdownRing({ remaining, total, label, size = 220 }: { remaining: number; total: number; label?: string; size?: number }) {
  const r = (size - 24) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const lastThree = remaining <= 3 && remaining > 0;
  return (
    <div className="flex flex-col items-center" role="timer" aria-live="off" aria-label={label ?? 'timer'}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-card-soft)" strokeWidth={14} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={lastThree ? 'var(--accent)' : 'var(--timer)'} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 900ms linear, stroke 300ms' }} />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight={600} fontSize={size * 0.32} fill="var(--text-strong)">{Math.ceil(remaining)}</text>
        {label && <text x="50%" y="68%" textAnchor="middle" fontSize={size * 0.08} fill="var(--text-muted)" fontFamily="var(--font-sans)" fontWeight={700}>{label}</text>}
      </svg>
    </div>
  );
}
