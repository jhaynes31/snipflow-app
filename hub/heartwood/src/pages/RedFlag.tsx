import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button, Card, Callout } from '@/components/ui';
import { db } from '@/db/db';

/** Red-flag screening (Section 10). Calm, clear, no exercise swap offered. */
export function RedFlagPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const emergency = params.get('emergency') === '1';
  const open = useLiveQuery(() => db.redFlags.filter((r) => !r.clearedDate).toArray(), []) ?? [];

  const clear = async () => {
    const now = new Date().toISOString();
    for (const r of open) await db.redFlags.update(r.id!, { clearedDate: now });
    nav('/');
  };

  return (
    <div className="page stack fade-in">
      <h1>Let's pause here</h1>
      {emergency ? (
        <Callout>
          <p className="text-lg font-bold">Chest pain, unusual shortness of breath, dizziness or fainting need immediate care.</p>
          <p className="mt-2">Please call emergency services now (911 in the US), or have someone with you call. Sit or lie down while you wait.</p>
          <a href="tel:911" className="btn btn-primary mt-3">Call 911</a>
        </Callout>
      ) : (
        <Card className="stack-sm">
          <p>What you described is a signal to stop for today and check in with a professional: a physical therapist, your doctor, or urgent care if it is severe.</p>
          <p>This is information, not a verdict. Sharp or shooting pain, numbness, tingling, sudden swelling, or a joint giving way are all things a clinician should look at before you continue.</p>
          <p className="muted text-sm">The session has been saved. Nothing you did is lost.</p>
        </Card>
      )}
      <Card soft className="stack-sm">
        <p className="font-bold">Logged</p>
        {open.map((r) => <p key={r.id} className="text-sm">{r.date.slice(0, 10)}: {r.symptom}{r.notes ? ` (${r.notes})` : ''}</p>)}
        {open.length === 0 && <p className="muted text-sm">No open events.</p>}
      </Card>
      <p>Training resumes when you confirm you have been cleared, or you feel well again.</p>
      <Button variant="secondary" onClick={clear}>I've been cleared / I feel well</Button>
      <Button variant="ghost" onClick={() => nav('/learn')}>Just browse for now</Button>
      <p className="muted text-sm">This app is not medical advice and cannot diagnose.</p>
    </div>
  );
}
