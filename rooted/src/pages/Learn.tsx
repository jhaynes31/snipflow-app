import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BodyMap } from '@/components/BodyMap';
import { Card, Chip } from '@/components/ui';
import { EXERCISES, EXERCISE_MAP } from '@/data/exercises';
import { db } from '@/db/db';
import type { MuscleRegion } from '@/domain/types';
import { REGION_MAP } from '@/learn/bodymap';
import { LESSONS } from '@/learn/lessons';

/** Learning layer (Section 12): body map + micro-lessons. Self-paced, optional. */
export function LearnPage() {
  const unlocked = useLiveQuery(() => db.lessons.toArray(), []) ?? [];
  const logs = useLiveQuery(() => db.setLogs.toArray(), []) ?? [];
  const [region, setRegion] = useState<MuscleRegion | null>(null);
  const [tab, setTab] = useState<'body' | 'lessons'>('body');
  const [open, setOpen] = useState<string | null>(null);

  const intensity = useMemo(() => {
    const counts: Partial<Record<MuscleRegion, number>> = {};
    for (const l of logs) {
      const ex = EXERCISE_MAP[l.exerciseId];
      if (!ex) continue;
      for (const m of ex.musclesPrimary) counts[m] = (counts[m] ?? 0) + 1;
      for (const m of ex.musclesSecondary) counts[m] = (counts[m] ?? 0) + 0.4;
    }
    const max = Math.max(1, ...Object.values(counts));
    return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / max])) as Partial<Record<MuscleRegion, number>>;
  }, [logs]);

  const unlockedIds = new Set(unlocked.map((u) => u.lessonId));
  const info = region ? REGION_MAP[region] : null;
  const trainedBy = region ? EXERCISES.filter((e) => !e.id.startsWith('x-') && (e.musclesPrimary.includes(region) || e.musclesSecondary.includes(region))).slice(0, 8) : [];

  return (
    <div className="page stack fade-in">
      <h1>Learn</h1>
      <div className="flex gap-2"><Chip active={tab === 'body'} onClick={() => setTab('body')}>Body map</Chip><Chip active={tab === 'lessons'} onClick={() => setTab('lessons')}>Lessons ({unlockedIds.size}/{LESSONS.length})</Chip></div>
      {tab === 'body' && (
        <div className="stack">
          <p className="muted">Tap a region. Areas glow as you train them.</p>
          <BodyMap intensity={intensity} selected={region} onSelect={setRegion} />
          {info && (
            <Card className="stack-sm fade-in">
              <h2>{info.name}</h2>
              <p><strong>Muscles:</strong> {info.muscles}</p>
              <p><strong>Joints:</strong> {info.joints}</p>
              <p><strong>In daily life:</strong> {info.dailyLife}</p>
              {trainedBy.length > 0 && <p className="text-sm"><strong>Your exercises:</strong> {trainedBy.map((e, i) => <span key={e.id}>{i > 0 && ', '}<Link to={`/exercise/${e.id}`} className="underline">{e.name}</Link></span>)}</p>}
            </Card>
          )}
        </div>
      )}
      {tab === 'lessons' && (
        <ul className="stack-sm">
          {LESSONS.map((l) => {
            const is = unlockedIds.has(l.id);
            return (
              <li key={l.id} className="card-soft">
                <button type="button" className="w-full text-left flex justify-between items-center" onClick={() => is && setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}>
                  <span className={`font-bold ${is ? '' : 'muted'}`}>{l.title}</span>
                  <span className="muted text-sm">{is ? (open === l.id ? '▲' : '▼') : 'unlocks as you train'}</span>
                </button>
                {open === l.id && <div className="mt-2 stack-sm fade-in">{l.content.map((p, i) => <p key={i}>{p}</p>)}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
