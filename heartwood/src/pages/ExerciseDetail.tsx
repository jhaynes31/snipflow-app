import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { BodyMap } from '@/components/BodyMap';
import { DemoMedia } from '@/components/DemoMedia';
import { Button, Card, Callout } from '@/components/ui';
import { EXERCISE_MAP } from '@/data/exercises';
import { db } from '@/db/db';
import { contextFromProfile, exclusionReason, isHardExcluded } from '@/domain/safety';
import type { CautionTag } from '@/domain/types';
import { updateProfile, useProfile } from '@/hooks/useProfile';
import { LESSON_MAP } from '@/learn/lessons';

const CAUTION_LABEL: Record<CautionTag, string> = {
  'unsupported-single-leg': 'Unsupported single-leg work', 'deep-knee-flexion': 'Deep loaded knee flexion', 'heavy-overhead': 'Heavy overhead pressing', 'step-up': 'Step-ups',
};

/** Exercise card (Section 6.3). */
export function ExerciseDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const profile = useProfile();
  const custom = useLiveQuery(() => (EXERCISE_MAP[id] ? undefined : db.customExercises.get(id)), [id]);
  const ex = EXERCISE_MAP[id] ?? custom;
  const [slow, setSlow] = useState(false);
  const [confirm, setConfirm] = useState<CautionTag | null>(null);
  if (!profile) return null;
  if (!ex || isHardExcluded(ex)) return <div className="page stack"><p>This exercise is not part of your program.</p><Button onClick={() => nav('/library')}>Back</Button></div>;
  const reason = exclusionReason(ex, contextFromProfile(profile));
  const intensity = Object.fromEntries([...ex.musclesPrimary.map((m) => [m, 1]), ...ex.musclesSecondary.map((m) => [m, 0.4])]);

  return (
    <div className="page stack fade-in">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}>← Back</Button>
      <DemoMedia exercise={ex} slow={slow} />
      <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setSlow((s) => !s)}>{slow ? 'Normal speed' : 'Slow motion'}</Button></div>
      <h1>{ex.name}</h1>
      <p className="text-lg">{ex.summary}</p>

      {reason?.kind === 'caution' && (
        <Callout>
          <p className="font-bold">Locked: {CAUTION_LABEL[reason.tag]}</p>
          <p className="text-sm">Unlocks automatically when a reassessment shows readiness. You can also unlock it yourself.</p>
          {confirm !== reason.tag ? <Button variant="ghost" size="sm" className="mt-2" onClick={() => setConfirm(reason.tag)}>Unlock manually</Button> : (
            <div className="mt-2 stack-sm">
              <p className="text-sm">Are you sure? This is on the caution list because of your history. If a PT has cleared you for it, go ahead.</p>
              <div className="flex gap-2"><Button size="sm" onClick={() => updateProfile({ unlockedCautions: [...profile.unlockedCautions, reason.tag] }).then(() => setConfirm(null))}>Yes, unlock</Button><Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>No</Button></div>
            </div>
          )}
        </Callout>
      )}
      {reason?.kind === 'pt-restriction' && <Callout>Excluded by your PT's restriction: {reason.label}.</Callout>}

      <Card className="stack-sm"><h3>How to do it</h3><ol className="list-decimal pl-5 stack-sm">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card soft><h3>Key cues</h3><ul className="list-disc pl-5">{ex.cues.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>
        <Card soft><h3>Common mistakes</h3><ul className="list-disc pl-5">{ex.mistakes.map((c, i) => <li key={i}>{c}</li>)}</ul></Card>
      </div>
      {ex.whyItMatters && <Callout><strong>Why this matters:</strong> {ex.whyItMatters}</Callout>}
      <Card className="flex gap-4 items-center">
        <BodyMap intensity={intensity} compact />
        <div className="stack-sm text-sm">
          <p><strong>Muscles:</strong> {ex.musclesPrimary.join(', ')}{ex.musclesSecondary.length ? ` (also ${ex.musclesSecondary.join(', ')})` : ''}</p>
          <p><strong>Joints:</strong> {ex.jointsLoaded.join(', ') || 'none loaded'}</p>
          <p><strong>Equipment:</strong> {ex.equipment.join(', ')}</p>
          <p><strong>Position:</strong> {ex.stance.replace('-', ' ')}{ex.supportLevel ? ` · ${ex.supportLevel.replace('-', ' ')} support` : ''}</p>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {ex.regressionId && EXERCISE_MAP[ex.regressionId] && <Link to={`/exercise/${ex.regressionId}`} className="chip">Easier: {EXERCISE_MAP[ex.regressionId].name}</Link>}
        {ex.progressionId && EXERCISE_MAP[ex.progressionId] && <Link to={`/exercise/${ex.progressionId}`} className="chip">Harder: {EXERCISE_MAP[ex.progressionId].name}</Link>}
      </div>
      {ex.lessonIds.length > 0 && <p className="muted text-sm">Related lessons: {ex.lessonIds.map((l) => LESSON_MAP[l]?.title).filter(Boolean).join(', ')}</p>}
    </div>
  );
}
