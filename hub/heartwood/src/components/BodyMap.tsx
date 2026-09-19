import { useState } from 'react';
import { REGIONS } from '@/learn/bodymap';
import type { MuscleRegion } from '@/domain/types';

/**
 * Interactive body map (Sections 3.4, 12). Regions glow fern -> moss -> forest as
 * they are trained (intensity 0..1). Front and back views.
 */
export function BodyMap({ intensity = {}, selected, onSelect, highlight = [], compact = false }: {
  intensity?: Partial<Record<MuscleRegion, number>>;
  selected?: MuscleRegion | null;
  onSelect?: (r: MuscleRegion) => void;
  highlight?: MuscleRegion[];
  compact?: boolean;
}) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const color = (id: MuscleRegion) => {
    if (highlight.includes(id)) return 'var(--color-moss-600)';
    const v = intensity[id] ?? 0;
    if (v <= 0) return 'var(--color-stone-200)';
    if (v < 0.34) return 'var(--color-fern-400)';
    if (v < 0.67) return 'var(--color-moss-600)';
    return 'var(--color-forest-700)';
  };
  const w = compact ? 120 : 200;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 200 420" width={w} height={w * 2.1} role="img" aria-label={`${view} view of the body`}>
        {/* silhouette */}
        <path d="M100 30 a26 26 0 1 1 0.1 0 M74 60 h52 l22 30 v70 l-14 4 v-56 l-6 2 v100 l12 140 h-30 l-8 -130 h-4 l-8 130 h-30 l12 -140 v-100 l-6 -2 v56 l-14 -4 v-70 z" fill="var(--bg-card)" stroke="var(--border)" strokeWidth={2} />
        {REGIONS.map((r) => {
          const d = view === 'front' ? r.front : r.back;
          if (!d) return null;
          const isSel = selected === r.id;
          return (
            <path key={r.id} d={d} fill={color(r.id)} opacity={0.85} stroke={isSel ? 'var(--accent)' : 'var(--bg)'} strokeWidth={isSel ? 4 : 1.5}
              style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'fill 400ms' }} role={onSelect ? 'button' : undefined} tabIndex={onSelect ? 0 : -1}
              aria-label={r.name} onClick={() => onSelect?.(r.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect?.(r.id); }} />
          );
        })}
      </svg>
      {!compact && (
        <div className="flex gap-2">
          <button type="button" className="chip" aria-pressed={view === 'front'} onClick={() => setView('front')}>Front</button>
          <button type="button" className="chip" aria-pressed={view === 'back'} onClick={() => setView('back')}>Back</button>
        </div>
      )}
    </div>
  );
}
