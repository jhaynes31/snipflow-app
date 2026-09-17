import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Lock } from 'lucide-react';
import { Chip } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import { db } from '@/db/db';
import { contextFromProfile, exclusionReason, isHardExcluded } from '@/domain/safety';
import type { Exercise } from '@/domain/types';
import { useProfile } from '@/hooks/useProfile';

const CATS: { id: Exercise['category'] | 'all' | 'locked'; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'strength', label: 'Strength' }, { id: 'pt', label: 'PT' }, { id: 'warmup', label: 'Warm-up' }, { id: 'cooldown', label: 'Cool-down' }, { id: 'locked', label: 'Locked' },
];

/** Browsable curated library. Hard-excluded exercises are never listed. */
export function LibraryPage() {
  const profile = useProfile();
  const custom = useLiveQuery(() => db.customExercises.toArray(), []) ?? [];
  const [cat, setCat] = useState<(typeof CATS)[number]['id']>('all');
  const [q, setQ] = useState('');
  const ctx = contextFromProfile(profile);
  const list = useMemo(() => {
    const all = [...EXERCISES, ...custom].filter((e) => !isHardExcluded(e));
    return all.filter((e) => {
      const reason = exclusionReason(e, ctx);
      if (cat === 'locked') return reason !== null;
      if (cat !== 'all' && e.category !== cat) return false;
      if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [cat, q, custom, ctx]);

  return (
    <div className="page stack fade-in">
      <h1>Exercises</h1>
      <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search exercises" />
      <div className="flex flex-wrap gap-2">{CATS.map((c) => <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</Chip>)}</div>
      <ul className="stack-sm">
        {list.map((e) => {
          const reason = exclusionReason(e, ctx);
          return (
            <li key={e.id}>
              <Link to={`/exercise/${e.id}`} className="card-soft flex items-center gap-3 no-underline">
                <img src={e.media[0]?.src} alt="" width={64} height={48} style={{ borderRadius: 10, objectFit: 'cover' }} />
                <span className="flex-1"><span className="font-bold block">{e.name}</span><span className="muted text-sm">{e.summary}</span></span>
                {reason && <Lock size={18} aria-label="Locked" />}
              </Link>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="muted">Nothing here yet.</p>}
    </div>
  );
}
