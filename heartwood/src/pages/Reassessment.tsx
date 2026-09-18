import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MovementScreen } from '@/components/MovementScreen';
import { Button, Card } from '@/components/ui';
import { db } from '@/db/db';
import { cautionUnlocksFrom, screenSteps } from '@/domain/assessment';
import type { Assessment } from '@/domain/types';
import { updateProfile, useProfile } from '@/hooks/useProfile';

/** Reassessment (Section 8.3): repeat the screen, compare, and apply PT-progression unlocks. */
export function ReassessmentPage() {
  const nav = useNavigate();
  const profile = useProfile();
  const [result, setResult] = useState<{ a: Assessment; prev?: Assessment; unlocks: string[] } | null>(null);
  if (!profile) return null;

  if (result) {
    const { a, prev, unlocks } = result;
    return (
      <div className="page stack fade-in">
        <h1>Before and after</h1>
        <Card className="stack-sm">
          {screenSteps().map(({ t, side }) => {
            const now = a.results.find((r) => r.testId === t.id && r.side === side);
            const before = prev?.results.find((r) => r.testId === t.id && r.side === side);
            return (
              <div key={`${t.id}-${side}`} className="flex justify-between gap-2 text-sm">
                <span>{t.name}{side ? ` (${side})` : ''}</span>
                <span><span className="muted">{before ? `${before.rating}${before.value != null ? ` · ${before.value}` : ''}` : '—'}</span> → <strong>{now?.rating}{now?.value != null ? ` · ${now.value}` : ''}</strong></span>
              </div>
            );
          })}
        </Card>
        <p>{unlocks.length ? `Readiness shown. Unlocked: ${unlocks.join(', ')}. The plan will use these from your next session.` : 'Nothing new unlocked yet. That is normal; the current progressions are still doing their work.'}</p>
        <Button size="lg" onClick={() => nav('/')}>Back to today</Button>
      </div>
    );
  }

  return (
    <div className="page stack fade-in">
      <h1>Movement screen</h1>
      <p className="muted">Same six tests as your first screen. Results are compared side by side and may unlock progressions.</p>
      <MovementScreen kind="reassessment" onCancel={() => nav(-1)} onDone={async (a) => {
        const prev = await db.assessments.orderBy('date').last();
        await db.assessments.add(a);
        const unlocks = cautionUnlocksFrom(a, prev).filter((u) => !profile.unlockedCautions.includes(u));
        if (unlocks.length) await updateProfile({ unlockedCautions: [...profile.unlockedCautions, ...unlocks] });
        setResult({ a, prev, unlocks });
      }} />
    </div>
  );
}
