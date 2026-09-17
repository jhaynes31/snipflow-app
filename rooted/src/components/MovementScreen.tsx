import { useEffect, useState } from 'react';
import { EXERCISE_MAP } from '@/data/exercises';
import { screenSteps } from '@/domain/assessment';
import type { Assessment, AssessmentRating, AssessmentResult } from '@/domain/types';
import { DemoMedia } from './DemoMedia';
import { Button, Card, Chip, ProgressBar, Stepper } from './ui';

const RATINGS: { id: AssessmentRating; label: string }[] = [
  { id: 'easy', label: 'Easy' }, { id: 'okay', label: 'Okay' }, { id: 'hard', label: 'Hard' }, { id: 'painful', label: 'Painful' },
];

/** Guided self-tests with demos (Section 5.6). One step per screen. */
export function MovementScreen({ kind, onDone, onCancel }: { kind: Assessment['kind']; onDone: (a: Assessment) => void; onCancel?: () => void }) {
  const steps = screenSteps();
  const [i, setI] = useState(0);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [value, setValue] = useState(0);
  const [rating, setRating] = useState<AssessmentRating | null>(null);
  const [timer, setTimer] = useState<number | null>(null);

  const step = steps[i];
  const ex = EXERCISE_MAP[step.t.demoExerciseId];

  useEffect(() => {
    if (timer === null || timer <= 0) return;
    const id = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const next = () => {
    if (!rating) return;
    const r: AssessmentResult = { testId: step.t.id, side: step.side, rating, value: step.t.measure ? value : undefined };
    const all = [...results, r];
    if (i + 1 >= steps.length) {
      onDone({ date: new Date().toISOString().slice(0, 10), kind, results: all });
      return;
    }
    setResults(all); setI(i + 1); setValue(0); setRating(null); setTimer(null);
  };

  return (
    <div className="stack fade-in" key={i}>
      <ProgressBar value={i} max={steps.length} label="Movement screen progress" />
      <p className="muted">Test {i + 1} of {steps.length}</p>
      <h2>{step.t.name}{step.side ? ` (${step.side})` : ''}</h2>
      {ex && <DemoMedia exercise={ex} height={180} />}
      <Card soft>
        <ol className="list-decimal pl-5 stack-sm">{step.t.instructions.map((s, k) => <li key={k}>{s}</li>)}</ol>
      </Card>
      {step.t.measure && (
        <Card soft>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-bold">{step.t.measure.label}</span>
            <Stepper value={value} onChange={setValue} min={0} max={120} label={step.t.measure.label} />
          </div>
          {step.t.measure.kind === 'count' && (
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setTimer(30)}>Start 30s timer</Button>
              {timer !== null && <span className="text-2xl font-extrabold" aria-live="polite">{timer}s</span>}
            </div>
          )}
          {step.t.measure.kind === 'seconds' && (
            <div className="mt-3 flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setTimer(30)}>Start 30s timer</Button>
              {timer !== null && <span className="text-2xl font-extrabold" aria-live="polite">{timer}s</span>}
            </div>
          )}
        </Card>
      )}
      <div>
        <p className="font-bold mb-2">How did it feel?</p>
        <div className="flex gap-2 flex-wrap">
          {RATINGS.map((r) => <Chip key={r.id} active={rating === r.id} onClick={() => setRating(r.id)}>{r.label}</Chip>)}
        </div>
        {rating === 'painful' && <p className="mt-2" style={{ color: 'var(--danger)' }}>Stop this test now. Painful is useful information; the plan will start gentler here.</p>}
      </div>
      <div className="flex gap-2">
        {onCancel && <Button variant="ghost" onClick={onCancel}>Pause for now</Button>}
        <Button onClick={next} disabled={!rating} className="flex-1">{i + 1 >= steps.length ? 'Finish screen' : 'Next'}</Button>
      </div>
    </div>
  );
}
