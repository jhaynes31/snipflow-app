import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, Chip, Field } from '@/components/ui';
import { TEMPLATES } from '@/data/templates';
import { db } from '@/db/db';
import type { Exercise, Joint, MovementPattern, PTRestriction, SessionType, TimerType } from '@/domain/types';
import { updateProfile, useProfile } from '@/hooks/useProfile';
import { isHardExcluded } from '@/domain/safety';

const JOINTS: Joint[] = ['neck', 'shoulder', 'elbow', 'wrist', 'spine', 'hip', 'knee', 'ankle'];
const PATTERNS: MovementPattern[] = ['squat', 'hinge', 'push', 'pull', 'carry', 'core-antiextension', 'core-antirotation', 'core-lateral', 'balance', 'mobility', 'ankle', 'knee', 'hip'];

/** My PT's Plan (Section 4.7): restrictions feed the filter; custom exercises schedule into PT sessions. */
export function PTPlanPage() {
  const profile = useProfile();
  const custom = useLiveQuery(() => db.customExercises.toArray(), []) ?? [];
  const [r, setR] = useState<Partial<PTRestriction>>({ label: '', avoidJoints: [], avoidPatterns: [] });
  const [ex, setEx] = useState({ name: '', summary: '', steps: '', cues: '', timerType: 'none' as TimerType, reps: 10, hold: 20, unilateral: false });
  const [file, setFile] = useState<File | null>(null);
  if (!profile) return null;
  const plan = profile.ptPlan;
  const setPlan = (p: Partial<typeof plan>) => updateProfile({ ptPlan: { ...plan, ...p } });

  const addRestriction = () => {
    if (!r.label?.trim()) return;
    setPlan({ restrictions: [...plan.restrictions, { id: `r-${Date.now()}`, label: r.label.trim(), avoidJoints: r.avoidJoints, avoidPatterns: r.avoidPatterns }] });
    setR({ label: '', avoidJoints: [], avoidPatterns: [] });
  };

  const addExercise = async () => {
    if (!ex.name.trim()) return;
    const id = `custom-${Date.now()}`;
    let media: Exercise['media'] = [{ type: 'svg', src: '/media/stance-bilateral-standing.svg' }];
    if (file) {
      const key = `media-${id}`;
      await db.customMedia.put({ key, blob: file, mime: file.type, createdAt: new Date().toISOString() });
      media = [{ type: 'custom', src: key }];
    }
    const e: Exercise = {
      id, name: ex.name.trim(), summary: ex.summary.trim() || 'From my PT.', steps: ex.steps.split('\n').filter(Boolean), cues: ex.cues.split('\n').filter(Boolean), mistakes: [],
      whyItMatters: 'Prescribed by your physical therapist.', media, movementPatterns: ['mobility'], jointsLoaded: [], impact: 'none', stance: 'bilateral-standing', neckDemand: 'low',
      equipment: ['bodyweight'], exclusionTags: [], cautionTags: [], timerType: ex.timerType, defaultReps: ex.reps, defaultHoldSeconds: ex.hold, lessonIds: [], musclesPrimary: [], musclesSecondary: [], unilateral: ex.unilateral, category: 'pt', custom: true,
    };
    if (isHardExcluded(e)) return;
    await db.customExercises.put(e);
    await setPlan({ customExerciseIds: [...plan.customExerciseIds, id] });
    setEx({ name: '', summary: '', steps: '', cues: '', timerType: 'none', reps: 10, hold: 20, unilateral: false });
    setFile(null);
  };

  return (
    <div className="page stack fade-in">
      <h1>My PT's Plan</h1>
      <p className="muted">Anything from a real physical therapist goes here and overrides the app. Restrictions are added to the safety filter immediately.</p>

      <Card className="stack-sm">
        <Field label="PT's name (optional)"><input className="input" value={plan.ptName ?? ''} onChange={(e) => setPlan({ ptName: e.target.value })} /></Field>
        <Field label="Notes from my PT"><textarea className="input" rows={3} value={plan.notes} onChange={(e) => setPlan({ notes: e.target.value })} /></Field>
      </Card>

      <Card className="stack-sm">
        <h2>Restrictions</h2>
        {plan.restrictions.map((x) => (
          <div key={x.id} className="card-soft flex justify-between items-center gap-2">
            <span><strong>{x.label}</strong><span className="muted text-sm block">{[...(x.avoidJoints ?? []), ...(x.avoidPatterns ?? [])].join(', ') || 'note only'}</span></span>
            <Button variant="ghost" size="sm" onClick={() => setPlan({ restrictions: plan.restrictions.filter((y) => y.id !== x.id) })}>Remove</Button>
          </div>
        ))}
        <Field label="New restriction" hint="e.g. 'No overhead work for 4 weeks'"><input className="input" value={r.label ?? ''} onChange={(e) => setR({ ...r, label: e.target.value })} /></Field>
        <Field label="Avoid exercises that load these joints">
          <div className="flex flex-wrap gap-1">{JOINTS.map((j) => <Chip key={j} active={r.avoidJoints?.includes(j)} onClick={() => setR({ ...r, avoidJoints: r.avoidJoints?.includes(j) ? r.avoidJoints.filter((x) => x !== j) : [...(r.avoidJoints ?? []), j] })}>{j}</Chip>)}</div>
        </Field>
        <Field label="Avoid these movement patterns">
          <div className="flex flex-wrap gap-1">{PATTERNS.map((p) => <Chip key={p} active={r.avoidPatterns?.includes(p)} onClick={() => setR({ ...r, avoidPatterns: r.avoidPatterns?.includes(p) ? r.avoidPatterns.filter((x) => x !== p) : [...(r.avoidPatterns ?? []), p] })}>{p}</Chip>)}</div>
        </Field>
        <Button variant="secondary" onClick={addRestriction} disabled={!r.label?.trim()}>Add restriction</Button>
      </Card>

      <Card className="stack-sm">
        <h2>My PT's exercises</h2>
        {custom.map((c) => (
          <div key={c.id} className="card-soft flex justify-between items-center gap-2">
            <span><strong>{c.name}</strong><span className="muted text-sm block">{c.timerType === 'hold' ? `hold ${c.defaultHoldSeconds}s` : `${c.defaultReps} reps`}{c.unilateral ? ' · each side' : ''}</span></span>
            <Button variant="ghost" size="sm" onClick={async () => { await db.customExercises.delete(c.id); setPlan({ customExerciseIds: plan.customExerciseIds.filter((x) => x !== c.id) }); }}>Remove</Button>
          </div>
        ))}
        <Field label="Schedule them into">
          <div className="flex flex-wrap gap-1">{(['ptAnkles', 'ptKneesHips', 'ptMobility'] as SessionType[]).map((t) => <Chip key={t} active={plan.scheduleInto.includes(t)} onClick={() => setPlan({ scheduleInto: plan.scheduleInto.includes(t) ? plan.scheduleInto.filter((x) => x !== t) : [...plan.scheduleInto, t] })}>{TEMPLATES[t].shortName}</Chip>)}</div>
        </Field>
        <Field label="Exercise name"><input className="input" value={ex.name} onChange={(e) => setEx({ ...ex, name: e.target.value })} /></Field>
        <Field label="One-line summary"><input className="input" value={ex.summary} onChange={(e) => setEx({ ...ex, summary: e.target.value })} /></Field>
        <Field label="Steps (one per line)"><textarea className="input" rows={3} value={ex.steps} onChange={(e) => setEx({ ...ex, steps: e.target.value })} /></Field>
        <Field label="Cues (one per line)"><textarea className="input" rows={2} value={ex.cues} onChange={(e) => setEx({ ...ex, cues: e.target.value })} /></Field>
        <div className="flex flex-wrap gap-2 items-center">
          <Chip active={ex.timerType === 'none'} onClick={() => setEx({ ...ex, timerType: 'none' })}>Reps</Chip>
          <Chip active={ex.timerType === 'tempo'} onClick={() => setEx({ ...ex, timerType: 'tempo' })}>Tempo reps</Chip>
          <Chip active={ex.timerType === 'hold'} onClick={() => setEx({ ...ex, timerType: 'hold' })}>Timed hold</Chip>
          <Chip active={ex.unilateral} onClick={() => setEx({ ...ex, unilateral: !ex.unilateral })}>Each side</Chip>
        </div>
        {ex.timerType === 'hold' ? <Field label="Hold seconds"><input className="input" type="number" value={ex.hold} onChange={(e) => setEx({ ...ex, hold: +e.target.value })} /></Field>
          : <Field label="Reps"><input className="input" type="number" value={ex.reps} onChange={(e) => setEx({ ...ex, reps: +e.target.value })} /></Field>}
        <Field label="Demo video (optional)" hint="Record a short clip of yourself or your PT. Stored only on this device."><input type="file" accept="video/*,image/gif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></Field>
        <Button variant="secondary" onClick={addExercise} disabled={!ex.name.trim()}>Add exercise</Button>
      </Card>
    </div>
  );
}
