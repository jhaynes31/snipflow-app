import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { Tree } from '@/components/Tree';
import { Card } from '@/components/ui';
import { EXERCISE_MAP } from '@/data/exercises';
import { db, DEFAULT_TREE } from '@/db/db';
import { SCREEN_TESTS } from '@/domain/assessment';
import type { SetLog } from '@/domain/types';

const TRACKED = ['sit-to-stand', 'goblet-squat-box', 'db-rdl', 'incline-push-up-counter', 'band-row', 'db-row-one-arm', 'db-floor-press', 'glute-bridge-block'];

/** Progress (Section 13): tree, strength trends, left/right, screen history, lifetime count. */
export function ProgressPage() {
  const tree = useLiveQuery(() => db.tree.get('tree'), []) ?? DEFAULT_TREE;
  const logs = useLiveQuery(() => db.setLogs.orderBy('loggedAt').toArray(), []) ?? [];
  const assessments = useLiveQuery(() => db.assessments.orderBy('date').toArray(), []) ?? [];

  const trends = useMemo(() => TRACKED.map((id) => {
    const byDay = new Map<string, number>();
    for (const l of logs.filter((x) => x.exerciseId === id)) {
      const day = l.loggedAt.slice(0, 10);
      const score = (l.weight ?? 0) * (l.reps ?? 1) || (l.reps ?? l.holdSeconds ?? 0);
      byDay.set(day, Math.max(byDay.get(day) ?? 0, score));
    }
    return { id, points: [...byDay.entries()].map(([d, v]) => ({ d, v })) };
  }).filter((t) => t.points.length > 0), [logs]);

  const unilateral = useMemo(() => {
    const out: { id: string; left: number; right: number; unit: string }[] = [];
    const ids = new Set(logs.filter((l) => l.side).map((l) => l.exerciseId));
    for (const id of ids) {
      const best = (side: 'left' | 'right') => {
        const ls = logs.filter((l) => l.exerciseId === id && l.side === side);
        return ls.length ? Math.max(...ls.map((l: SetLog) => l.holdSeconds ?? l.reps ?? 0)) : 0;
      };
      const ex = EXERCISE_MAP[id];
      out.push({ id, left: best('left'), right: best('right'), unit: ex?.timerType === 'hold' ? 's' : 'reps' });
    }
    return out.slice(0, 8);
  }, [logs]);

  return (
    <div className="page stack fade-in">
      <h1>Your tree</h1>
      <div className="flex justify-center"><Tree growth={tree.growthPoints} roots={tree.rootPoints} milestones={tree.milestones} size={280} /></div>
      <Card className="text-center">
        <p className="display text-4xl">{tree.totalSessions}</p>
        <p className="muted">sessions, lifetime. Rest days grew {tree.rootPoints} roots.</p>
      </Card>

      {trends.length > 0 && (
        <Card className="stack">
          <h2>Strength trends</h2>
          {trends.map((t) => <Sparkline key={t.id} label={EXERCISE_MAP[t.id]?.name ?? t.id} points={t.points} />)}
        </Card>
      )}

      {unilateral.length > 0 && (
        <Card className="stack-sm">
          <h2>Left vs right</h2>
          {unilateral.map((u) => {
            const max = Math.max(u.left, u.right, 1);
            return (
              <div key={u.id} className="stack-sm">
                <p className="font-bold text-sm">{EXERCISE_MAP[u.id]?.name ?? u.id}</p>
                <Bar label="L" value={u.left} max={max} unit={u.unit} />
                <Bar label="R" value={u.right} max={max} unit={u.unit} />
              </div>
            );
          })}
        </Card>
      )}

      <Card className="stack-sm">
        <h2>Movement screens</h2>
        {assessments.length === 0 && <p className="muted">No screens yet.</p>}
        {assessments.map((a) => (
          <details key={a.id} className="card-soft">
            <summary className="font-bold cursor-pointer">{a.date} · {a.kind}</summary>
            <ul className="mt-2 text-sm stack-sm">
              {a.results.map((r, i) => <li key={i}>{SCREEN_TESTS.find((t) => t.id === r.testId)?.name}{r.side ? ` (${r.side})` : ''}: <strong>{r.rating}</strong>{r.value != null ? ` · ${r.value}` : ''}</li>)}
            </ul>
          </details>
        ))}
        <Link to="/reassess" className="btn btn-ghost btn-sm">Repeat the movement screen</Link>
      </Card>
    </div>
  );
}

function Sparkline({ label, points }: { label: string; points: { d: string; v: number }[] }) {
  const w = 280, h = 60;
  const max = Math.max(1, ...points.map((p) => p.v));
  const min = Math.min(...points.map((p) => p.v));
  const xs = points.map((_, i) => (points.length === 1 ? w / 2 : (i / (points.length - 1)) * (w - 10) + 5));
  const ys = points.map((p) => h - 8 - ((p.v - min) / Math.max(1, max - min)) * (h - 16));
  const d = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x} ${ys[i]}`).join(' ');
  return (
    <div>
      <p className="text-sm font-bold">{label} <span className="muted font-normal">· latest {points.at(-1)!.v}</span></p>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label={`${label} trend over ${points.length} sessions`}>
        <path d={d} fill="none" stroke="var(--fill)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r={4} fill="var(--secondary)" />)}
      </svg>
    </div>
  );
}

function Bar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-4 font-bold">{label}</span>
      <div className="progress-bar flex-1"><div style={{ width: `${(value / max) * 100}%` }} /></div>
      <span className="w-14 text-right">{value}{unit}</span>
    </div>
  );
}
