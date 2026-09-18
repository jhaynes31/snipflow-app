import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { messageText, pickMessage } from '@/coach/messages';
import { CoachBubble } from '@/components/CoachBubble';
import { Button, Card, Callout, Chip, Toggle } from '@/components/ui';
import { EXERCISE_MAP } from '@/data/exercises';
import { db } from '@/db/db';
import { startSession } from '@/db/program-service';
import { AREA_MAP, BODY_AREAS, FREESTYLE_MINUTES, buildFreestyle, makeFreestyleSession, parseSelection } from '@/domain/freestyle';
import { contextFromProfile } from '@/domain/safety';
import type { Phase, ProgressionState } from '@/domain/types';
import { useProfile } from '@/hooks/useProfile';
import type { PartDef } from '@/components/BodyModel3D';

const BodyModel3D = lazy(() => import('@/components/BodyModel3D'));

/** "Just move": pick areas on the 3D body and how long you have; the app builds a safe session. */
export function FreestylePage() {
  const profile = useProfile();
  const nav = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [minutes, setMinutes] = useState<number>(15);
  const [sides, setSides] = useState(false);
  const [phase, setPhase] = useState<Phase>('foundation');
  const [progression, setProgression] = useState<Map<string, ProgressionState>>(new Map());
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    db.sessions.where('status').equals('planned').sortBy('sequenceIndex').then((s) => { if (s[0]) setPhase(s[0].phase); });
    db.progression.toArray().then((rows) => setProgression(new Map(rows.map((r) => [r.key, r]))));
  }, []);

  const toggle = (area: string, side?: 'left' | 'right') => {
    setSelected((prev) => {
      const next = new Set(prev);
      const def = AREA_MAP[area];
      if (!def) return prev;
      if (!def.symmetric || !sides || !side) {
        // Whole area: clear any side keys and toggle the area key.
        const had = next.has(area) || next.has(`${area}:left`) || next.has(`${area}:right`);
        next.delete(area); next.delete(`${area}:left`); next.delete(`${area}:right`);
        if (!had) next.add(area);
      } else {
        const key = `${area}:${side}`;
        if (next.has(area)) { next.delete(area); next.add(side === 'left' ? `${area}:right` : `${area}:left`); }
        else if (next.has(key)) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const onTap = (p: PartDef) => toggle(p.area, p.side);
  const selection = useMemo(() => [...selected], [selected]);
  const plan = useMemo(() => (profile && selection.length ? buildFreestyle({ selection, minutes, equipment: profile.equipment, ctx: contextFromProfile(profile), progression, phase, seed: Math.floor(Date.now() / 86_400_000) }) : null), [profile, selection, minutes, progression, phase]);

  if (!profile) return null;
  const cs = profile.coachSettings;
  const msg = pickMessage({ moment: 'freestyle', tone: cs.tone, faithTrack: cs.faithTrack });
  const small = minutes <= 10 ? pickMessage({ moment: 'small', tone: cs.tone, faithTrack: cs.faithTrack }) : null;

  const start = async () => {
    if (!plan) return;
    setStarting(true);
    const s = makeFreestyleSession(plan, selection, minutes, phase);
    await db.sessions.put(s);
    const started = await startSession(s.id);
    nav(`/session/${started.id}`);
  };

  const labelFor = (key: string) => { const { area, side } = parseSelection(key); return `${AREA_MAP[area]?.label ?? area}${side ? ` (${side})` : ''}`; };

  return (
    <div className="page stack fade-in">
      <Button variant="ghost" size="sm" onClick={() => nav('/')}>← Today</Button>
      <h1>Just move</h1>
      {msg && <CoachBubble speaker={msg.speaker === 'pt' ? 'pt' : 'coach'} text={messageText(msg)} settings={cs} />}
      <p className="muted">Drag to rotate. Tap the parts of your body you would like to work on today. As many as you like.</p>
      <Suspense fallback={<div className="card-soft" style={{ height: 380 }} />}>
        <BodyModel3D bodyType={profile.bodyType ?? 'woman'} selected={selected} onTap={onTap} autoRotate={!profile.sensorySettings.reducedMotion} />
      </Suspense>
      <Toggle label="Select left and right separately" hint="Off: tapping a leg or arm selects both sides." checked={sides} onChange={setSides} />

      <Card soft className="stack-sm">
        <p className="font-bold">Or tap from the list</p>
        {(['upper', 'trunk', 'lower', 'whole'] as const).map((g) => (
          <div key={g} className="flex flex-wrap gap-1">
            {BODY_AREAS.filter((a) => a.group === g).map((a) => {
              const on = selected.has(a.id) || selected.has(`${a.id}:left`) || selected.has(`${a.id}:right`);
              return <Chip key={a.id} active={on} onClick={() => toggle(a.id)}>{a.label}{selected.has(`${a.id}:left`) && !selected.has(`${a.id}:right`) ? ' (L)' : selected.has(`${a.id}:right`) && !selected.has(`${a.id}:left`) ? ' (R)' : ''}</Chip>;
            })}
          </div>
        ))}
        {sides && <p className="muted text-xs">With sides on, tap a limb on the figure to pick left or right; list chips select both.</p>}
      </Card>

      <Card soft className="stack-sm">
        <p className="font-bold">How long do you have?</p>
        <div className="flex flex-wrap gap-2">{FREESTYLE_MINUTES.map((m) => <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>{m} min</Chip>)}</div>
        {small && <Callout>{messageText(small)}</Callout>}
      </Card>

      {plan && (
        <Card className="stack-sm">
          <h2>Your session</h2>
          <p className="muted text-sm">{selection.map(labelFor).join(', ')} · about {plan.estimatedMinutes} min</p>
          <ol className="list-decimal pl-5 stack-sm">
            {plan.prescriptions.map((p, i) => <li key={i}><span className="font-bold">{EXERCISE_MAP[p.exerciseId]?.name}</span> <span className="muted text-sm">· {p.block === 'main' ? `${p.sets} × ${p.holdSeconds ? `${p.holdSeconds}s` : `${p.reps} reps`}` : p.block}</span></li>)}
          </ol>
          <Button variant="start" onClick={start} disabled={starting}>Start</Button>
          <p className="muted text-xs text-center">Counts fully toward your tree and stickers. Every exercise passed the same safety filter as your plan.</p>
        </Card>
      )}
      {!plan && <p className="muted text-center">Pick at least one area to build a session.</p>}
    </div>
  );
}
