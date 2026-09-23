import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, Square } from 'lucide-react';
import { messageText, pickMessage, type Speaker } from '@/coach/messages';
import { guideForCategory, guideForTemplate } from '@/data/guides';
import { getSpeaker } from '@/coach/tts';
import { CoachBubble } from '@/components/CoachBubble';
import { CountdownRing } from '@/components/CountdownRing';
import { DemoMedia } from '@/components/DemoMedia';
import { Tree } from '@/components/Tree';
import { Button, Card, Callout, Chip, Stepper } from '@/components/ui';
import { EXERCISES, EXERCISE_MAP } from '@/data/exercises';
import { TEMPLATES } from '@/data/templates';
import { db, getTree } from '@/db/db';
import { completeSession, logSet, swapExerciseInSession, type CompletionSummary } from '@/db/program-service';
import { equipmentForSession } from '@/domain/program';
import { contextFromProfile, findSafeAlternative } from '@/domain/safety';
import type { Exercise, PlannedSession, Prescription, SetLog, UserProfile } from '@/domain/types';
import { useProfile } from '@/hooks/useProfile';
import { useWakeLock } from '@/hooks/useWakeLock';
import { DISCOMFORT_LOCATIONS } from '@/learn/bodymap';
import { LESSON_MAP } from '@/learn/lessons';
import { softBuzz, softTone } from '@/player/cues';
import { useCountdown } from '@/player/useTimer';
import { StickerPicker } from '@/components/Stickers';
import { newlyUnlockedPacks, type StickerStats } from '@/data/stickers';
import { stickerStats } from '@/db/sticker-service';
import { todayISO } from '@/domain/dates';

type Stage = 'equipment' | 'exercise' | 'log' | 'rest' | 'reflect' | 'done';

const EFFORT_LABELS = ['', 'Very easy', 'Easy', 'Light', 'Moderate', 'Somewhat hard', 'Hard', 'Hard, could do a few more', 'Very hard', 'Almost max', 'Max'];
const RED_FLAGS = [
  { id: 'sharp', label: 'Sharp, stabbing or shooting pain', emergency: false },
  { id: 'numb', label: 'Numbness or tingling', emergency: false },
  { id: 'swelling', label: 'Sudden swelling', emergency: false },
  { id: 'giving-way', label: 'A joint giving way or locking', emergency: false },
  { id: 'chest', label: 'Chest pain, unusual shortness of breath, dizziness or fainting', emergency: true },
];

export function SessionPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const profile = useProfile();
  const live = useLiveQuery(() => (id ? db.sessions.get(id) : undefined), [id]);
  // Snapshot the session the moment it is seen in progress. Completing it writes a
  // new status, and the celebration screen must survive that write.
  const [snapshot, setSnapshot] = useState<PlannedSession | null>(null);
  useEffect(() => { if (live?.status === 'in-progress') setSnapshot(live); }, [live]);
  useWakeLock(!!profile?.sensorySettings.keepScreenAwake);
  if (!profile || live === undefined) return <div className="page muted">Loading…</div>;
  const session = live?.status === 'in-progress' ? live : snapshot;
  if (!session) return <div className="page stack"><p>This session is finished.</p><Button onClick={() => nav('/')}>Back to today</Button></div>;
  return <Player session={session} profile={profile} />;
}

/** Custom PT exercises live in the DB; everything else is in the static map. */
function useExercise(id: string): Exercise | undefined {
  const custom = useLiveQuery(() => (EXERCISE_MAP[id] ? undefined : db.customExercises.get(id)), [id]);
  return EXERCISE_MAP[id] ?? custom;
}

function Player({ session, profile }: { session: PlannedSession; profile: UserProfile }) {
  const nav = useNavigate();
  const cs = profile.coachSettings;
  const ss = profile.sensorySettings;
  const [stage, setStage] = useState<Stage>('equipment');
  const [exIdx, setExIdx] = useState(0);
  const [setNo, setSetNo] = useState(1);
  const [sideIdx, setSideIdx] = useState(0);
  const [slow, setSlow] = useState(false);
  const [bubble, setBubble] = useState<{ speaker: Speaker; text: string } | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [summary, setSummary] = useState<CompletionSummary | null>(null);
  const [tree, setTree] = useState({ growth: 0, roots: 0, milestones: [] as string[] });
  const [swappedNote, setSwappedNote] = useState<string | null>(null);
  const [statsBefore, setStatsBefore] = useState<StickerStats | null>(null);
  const [newPacks, setNewPacks] = useState<string[]>([]);
  const [stickerPicked, setStickerPicked] = useState<string | null>(null);
  const [tempoCount, setTempoCount] = useState(0);
  const [tempoPhase, setTempoPhase] = useState<'down' | 'pause' | 'up' | null>(null);
  const speaker = getSpeaker();

  const rx = session.prescriptions[exIdx];
  const ex = useExercise(rx?.exerciseId ?? '');
  const sides = rx?.side === 'both' ? (['left', 'right'] as const) : [undefined];
  const side = sides[sideIdx];
  const totalSteps = session.prescriptions.length;
  const vars = useMemo(() => ({ n: tree.milestones.length, name: profile.name, why: profile.why.text }), [tree.milestones.length, profile.name, profile.why.text]);

  useEffect(() => { getTree().then((t) => setTree({ growth: t.growthPoints, roots: t.rootPoints, milestones: t.milestones })); stickerStats().then(setStatsBefore); }, []);

  const say = useCallback((text: string, who: Speaker, kind: 'cue' | 'talk') => {
    if (cs.voice === 'off') return;
    if (cs.voice === 'cues' && kind === 'talk') return;
    speaker.speak(text, { voice: who === 'coach' ? 'coach' : 'pt' });
  }, [cs.voice, speaker]);

  const showBubble = useCallback((speakerKind: Speaker, text: string, kind: 'cue' | 'talk' = 'talk') => {
    setBubble({ speaker: speakerKind, text });
    say(text, speakerKind, kind);
  }, [say]);

  // ----- timers -----
  const countdown = useCountdown(
    (left) => { if (left <= 3 && left > 0) { softTone(ss); softBuzz(ss, 30); } },
    () => { softTone(ss, 'done'); softBuzz(ss, [60, 40, 60]); if (stage === 'rest') advanceAfterRest(); },
  );
  const tempoRef = useRef<number | null>(null);
  const stopTempo = useCallback(() => { if (tempoRef.current) { clearInterval(tempoRef.current); tempoRef.current = null; } setTempoPhase(null); }, []);
  useEffect(() => () => { stopTempo(); speaker.cancel(); }, [stopTempo, speaker]);

  const startTempo = (target: number) => {
    stopTempo();
    setTempoCount(0);
    let rep = 0, tick = 0;
    setTempoPhase('down');
    tempoRef.current = window.setInterval(() => {
      tick++;
      const p = tick % 5; // 3 down, 1 pause, 1 up
      if (p === 1 || p === 2 || p === 3) setTempoPhase('down');
      else if (p === 4) setTempoPhase('pause');
      else { setTempoPhase('up'); rep++; setTempoCount(rep); softTone(ss); if (rep >= target) { stopTempo(); softTone(ss, 'done'); softBuzz(ss, [60, 40, 60]); } }
    }, 1000);
  };

  // ----- coach cue on each exercise -----
  useEffect(() => {
    if (stage !== 'exercise' || !ex) return;
    setSlow(false);
    if (cs.critique === 'off') { setBubble(null); return; }
    const who = guideForCategory(ex.category).id;
    const cue = cs.critique === 'detailed' ? ex.cues.join('. ') : ex.cues[0];
    if (cue) showBubble(who, cue, 'cue');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exIdx, sideIdx, setNo, stage, ex?.id]);

  const midSetCue = () => {
    const m = pickMessage({ moment: 'mid-set', tone: cs.tone, faithTrack: cs.faithTrack, speaker: ex ? guideForCategory(ex.category).id : undefined, vars });
    if (m) showBubble(m.speaker === 'any' ? 'coach' : m.speaker, messageText(m), 'cue');
  };

  // ----- navigation between sets/sides/exercises -----
  const goNextExercise = () => {
    countdown.reset(); stopTempo();
    if (exIdx + 1 >= totalSteps) { setStage('reflect'); return; }
    setExIdx(exIdx + 1); setSetNo(1); setSideIdx(0); setStage('exercise');
  };
  const advanceAfterRest = () => {
    if (!rx) return;
    if (sideIdx + 1 < sides.length) { setSideIdx(sideIdx + 1); setStage('exercise'); return; }
    if (setNo < rx.sets) { setSetNo(setNo + 1); setSideIdx(0); setStage('exercise'); return; }
    goNextExercise();
  };
  const finishSet = () => {
    countdown.reset(); stopTempo();
    if (rx.block === 'main') setStage('log');
    else afterLog();
  };
  const afterLog = () => {
    const isLast = sideIdx + 1 >= sides.length && setNo >= rx.sets;
    if (isLast) { goNextExercise(); return; }
    setStage('rest');
    countdown.start(rx.restSeconds);
  };

  const swap = async () => {
    if (!ex) return;
    const ctx = contextFromProfile(profile);
    const alt = findSafeAlternative(ex, EXERCISES, ctx, session.prescriptions.map((p) => p.exerciseId));
    if (!alt) { showBubble('pt', 'No safe swap is available for this one. Skip it if you need to.'); return; }
    await swapExerciseInSession(session.id, ex.id, alt);
    setSetNo(1); setSideIdx(0); countdown.reset(); stopTempo();
    setSwappedNote(`Swapped to ${alt.name}.`);
  };

  const finish = async (early: boolean) => {
    countdown.reset(); stopTempo(); speaker.cancel();
    const s = await completeSession(session.id, { early });
    if (statsBefore) setNewPacks(newlyUnlockedPacks(statsBefore, await stickerStats()).map((p) => p.name));
    const t = await getTree();
    setTree({ growth: t.growthPoints, roots: t.rootPoints, milestones: t.milestones });
    setSummary(s);
    setStage('done');
    const moment = s.milestones.length ? 'milestone' : 'post-session';
    const m = pickMessage({ moment, tone: cs.tone, faithTrack: cs.faithTrack, vars: { ...vars, n: s.totalSessions } });
    if (m) showBubble('coach', messageText(m));
  };

  const redFlag = async (flag: (typeof RED_FLAGS)[number]) => {
    await db.redFlags.add({ date: new Date().toISOString(), symptom: flag.label, notes: ex ? `During ${ex.name}` : '', emergency: flag.emergency });
    await completeSession(session.id, { early: true });
    nav(`/red-flag?emergency=${flag.emergency ? 1 : 0}`);
  };

  // =====================================================================
  // RENDER
  // =====================================================================
  const template = TEMPLATES[session.templateId];
  const header = (
    <header className="flex items-center justify-between gap-2">
      <div>
        <p className="muted text-sm">{template.name}{session.fiveMinute ? ' · 5-minute' : ''}{session.minutes ? ` · ${session.minutes} min` : ''}</p>
        <p className="font-bold">{stage === 'equipment' ? 'Get ready' : stage === 'reflect' || stage === 'done' ? 'Finished' : `${exIdx + 1} of ${totalSteps}`}</p>
      </div>
      {stage !== 'done' && stage !== 'reflect' && (
        <div className="flex gap-2">
          {(countdown.running || tempoPhase) ? <Button variant="ghost" size="sm" onClick={() => { countdown.pause(); stopTempo(); }} aria-label="Pause"><Pause size={18} />Pause</Button>
            : countdown.remaining > 0 ? <Button variant="ghost" size="sm" onClick={countdown.resume} aria-label="Resume"><Play size={18} />Resume</Button> : null}
          <Button variant="danger" size="sm" onClick={() => setQuitOpen(true)} aria-label="Stop"><Square size={18} />Stop</Button>
        </div>
      )}
    </header>
  );

  const quitDialog = quitOpen && (
    <Card className="stack fade-in" role="dialog" aria-label="I want to quit today">
      <h2>I want to quit today</h2>
      <p>{(() => { const q = pickMessage({ moment: 'quit', tone: cs.tone, faithTrack: cs.faithTrack, vars }); return q ? messageText(q) : ''; })()}</p>
      {profile.why.text && <Callout>Your why: "{profile.why.text}"</Callout>}
      <Button variant="secondary" onClick={() => setQuitOpen(false)}>Give me a minute, then I'll keep going</Button>
      <Button variant="ghost" onClick={async () => { setQuitOpen(false); await finish(true); }}>Stop here. What I did counts.</Button>
      <Button variant="ghost" onClick={() => setQuitOpen(false)}>Never mind</Button>
    </Card>
  );

  if (stage === 'equipment') {
    const eq = equipmentForSession(session.prescriptions);
    const lead = guideForTemplate(session.templateId).id;
    const pre = pickMessage({ moment: session.isComeback ? 'comeback' : 'pre-session', tone: cs.tone, faithTrack: cs.faithTrack, speaker: lead, vars })
      ?? pickMessage({ moment: session.isComeback ? 'comeback' : 'pre-session', tone: cs.tone, faithTrack: cs.faithTrack, vars });
    return (
      <div className="page stack fade-in">
        {header}
        {quitDialog}
        <h1>Grab your gear</h1>
        <Card className="stack-sm">
          {eq.length ? eq.map((e) => <p key={e} className="text-lg">✓ {e.replace('-', ' ')}</p>) : <p>Just you today.</p>}
          {session.prescriptions.some((p) => EXERCISE_MAP[p.exerciseId]?.movementPatterns.includes('balance')) && <p className="muted text-sm mt-2">Balance work: flat, even ground, with a counter or wall within reach.</p>}
        </Card>
        {pre && <CoachBubble speaker={pre.speaker === 'any' ? lead : pre.speaker} text={messageText(pre)} settings={cs} />}
        <p className="muted">What's next: {session.prescriptions.slice(0, 3).map((p) => EXERCISE_MAP[p.exerciseId]?.name ?? 'PT exercise').join(' → ')}…</p>
        <Button variant="start" onClick={() => { setStage('exercise'); if (pre) say(pre.text, pre.speaker === 'any' ? lead : pre.speaker, 'talk'); }}>Start</Button>
      </div>
    );
  }

  if (stage === 'reflect') {
    return <Reflect onDone={(early) => finish(early)} />;
  }

  if (stage === 'done' && summary) {
    return (
      <div className="page stack fade-in text-center">
        {header}
        <h1>{summary.session.status === 'completed' ? 'Session complete' : 'That counted'}</h1>
        <div className="flex justify-center"><Tree growth={tree.growth} roots={tree.roots} milestones={tree.milestones} celebrate size={220} /></div>
        {bubble && <CoachBubble speaker={bubble.speaker} text={bubble.text} settings={cs} />}
        <Card soft className="text-left stack-sm">
          <p className="font-bold">Session {summary.totalSessions} in the books.</p>
          {summary.decisions.filter((d) => d.decision.kind !== 'hold').slice(0, 4).map((d, i) => (
            <p key={i} className="text-sm">{EXERCISE_MAP[d.exerciseId]?.name}{d.side ? ` (${d.side})` : ''}: {d.decision.detail}</p>
          ))}
          {summary.newLessons.length > 0 && <p className="text-sm">New lesson unlocked: <strong>{summary.newLessons.map((l) => LESSON_MAP[l]?.title).join(', ')}</strong>. Find it under Learn.</p>}
        </Card>
        {summary.session.status !== 'skipped' && (
          <Card className="text-left stack-sm">
            <h2>Pick a sticker for today</h2>
            {newPacks.length > 0 && <Callout>New sticker pack{newPacks.length > 1 ? 's' : ''} unlocked: <strong>{newPacks.join(', ')}</strong></Callout>}
            {stickerPicked ? <p className="text-lg">{stickerPicked} is on your chart. Find it under Tree.</p> : <p className="muted text-sm">Your way of marking the day. Add up to three.</p>}
            <StickerPicker date={todayISO()} sessionId={session.id} compact onPlaced={(st) => setStickerPicked(`${st.emoji} ${st.name}`)} />
          </Card>
        )}
        <Button size="lg" onClick={() => nav('/')}>Back to today</Button>
      </div>
    );
  }

  if (!rx || !ex) return <div className="page muted">Loading…</div>;

  if (stage === 'rest') {
    return (
      <div className="page stack fade-in text-center">
        {header}
        {quitDialog}
        <h2>Rest</h2>
        <CountdownRing remaining={countdown.remaining} total={countdown.total} label="rest" />
        <p className="muted">Next: {sideIdx + 1 < sides.length ? `${ex.name}, ${sides[sideIdx + 1]} side` : setNo < rx.sets ? `${ex.name}, set ${setNo + 1}` : (EXERCISE_MAP[session.prescriptions[exIdx + 1]?.exerciseId]?.name ?? 'cool-down')}</p>
        <Button variant="secondary" onClick={() => { countdown.reset(); advanceAfterRest(); }}>Skip rest</Button>
      </div>
    );
  }

  if (stage === 'log') {
    return <LogForm key={`${exIdx}-${setNo}-${sideIdx}`} session={session} rx={rx} ex={ex} setNo={setNo} side={side} unit={profile.equipment.weightUnit} weights={profile.equipment.dumbbellWeights}
      onLogged={afterLog} onRedFlag={redFlag} header={header} />;
  }

  // ----- exercise stage -----
  const isHold = ex.timerType === 'hold' || ex.timerType === 'interval';
  const isTempo = ex.timerType === 'tempo';
  const target = isHold ? rx.holdSeconds ?? ex.defaultHoldSeconds ?? 20 : rx.reps ?? ex.defaultReps ?? 10;
  return (
    <div className="page stack fade-in">
      {header}
      {quitDialog}
      <DemoMedia exercise={ex} slow={slow} />
      <div>
        <h2>{ex.name}{side ? ` · ${side} side` : ''}</h2>
        <p className="muted">{rx.block === 'main' ? `Set ${setNo} of ${rx.sets}` : rx.block === 'warmup' ? 'Warm-up' : 'Cool-down'} · {isHold ? `hold ${target}s` : `${target} reps`}
          {rx.weight != null ? ` · ${rx.weight} ${profile.equipment.weightUnit}` : ''}{rx.bandLevel ? ` · ${rx.bandLevel} band` : ''}{rx.supportLevel ? ` · ${rx.supportLevel.replace('-', ' ')}` : ''}</p>
        {rx.substitutedFor && <p className="text-sm muted">Swapped in for {EXERCISE_MAP[rx.substitutedFor]?.name ?? 'a locked exercise'}.</p>}
        {swappedNote && <p className="text-sm" style={{ color: 'var(--secondary)' }}>{swappedNote}</p>}
      </div>
      {bubble && <CoachBubble speaker={bubble.speaker} text={bubble.text} settings={cs} onDismiss={() => setBubble(null)} />}

      {isHold && (
        <div className="text-center stack-sm">
          {countdown.total > 0 ? <CountdownRing remaining={countdown.remaining} total={countdown.total} label="hold" /> : null}
          {countdown.total === 0 && <Button variant="start" onClick={() => { countdown.start(target); }}>Start hold</Button>}
          {countdown.total > 0 && !countdown.running && countdown.remaining === 0 && <Button variant="secondary" size="lg" onClick={finishSet}>Done, next</Button>}
          {countdown.running && <Button variant="ghost" size="sm" onClick={midSetCue}>Cue me</Button>}
        </div>
      )}
      {isTempo && (
        <div className="text-center stack-sm">
          {tempoPhase || tempoCount > 0 ? (
            <div className="card-soft">
              <p className="display text-5xl">{tempoCount} <span className="text-2xl muted">/ {target}</span></p>
              <p className="text-2xl font-bold" style={{ color: 'var(--timer)' }} aria-live="polite">{tempoPhase === 'down' ? 'lower… 3 · 2 · 1' : tempoPhase === 'pause' ? 'pause' : tempoPhase === 'up' ? 'up' : 'set complete'}</p>
            </div>
          ) : null}
          {!tempoPhase && tempoCount === 0 && <Button variant="start" onClick={() => startTempo(target)}>Start reps</Button>}
          {(!tempoPhase && tempoCount > 0) || tempoPhase ? <Button variant="secondary" size="lg" onClick={finishSet}>Done, next</Button> : null}
          {tempoPhase && <Button variant="ghost" size="sm" onClick={midSetCue}>Cue me</Button>}
        </div>
      )}
      {!isHold && !isTempo && (
        <div className="text-center stack-sm">
          <p className="display text-4xl">{target} reps</p>
          <Button variant="start" onClick={finishSet}>Done, next</Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="ghost" size="sm" onClick={() => setSlow((s) => !s)}>{slow ? 'Normal speed' : 'Show me again (slow)'}</Button>
        <Button variant="ghost" size="sm" onClick={swap}>Swap this exercise</Button>
        <Button variant="ghost" size="sm" onClick={goNextExercise}>Skip</Button>
      </div>

      <details className="card-soft">
        <summary className="font-bold cursor-pointer">Steps & cues</summary>
        <ol className="list-decimal pl-5 mt-2 stack-sm">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <p className="mt-2 text-sm"><strong>Cues:</strong> {ex.cues.join(' · ')}</p>
        <p className="mt-1 text-sm"><strong>Watch for:</strong> {ex.mistakes.join(' · ')}</p>
      </details>
      <p className="muted text-sm">Next: {sideIdx + 1 < sides.length ? `${sides[sideIdx + 1]} side` : setNo < rx.sets ? `set ${setNo + 1}` : (EXERCISE_MAP[session.prescriptions[exIdx + 1]?.exerciseId]?.name ?? 'finish')}</p>
    </div>
  );
}

function LogForm({ session, rx, ex, setNo, side, unit, weights, onLogged, onRedFlag, header }: {
  session: PlannedSession; rx: Prescription; ex: Exercise; setNo: number; side?: 'left' | 'right'; unit: string; weights: number[];
  onLogged: () => void; onRedFlag: (f: (typeof RED_FLAGS)[number]) => void; header: React.ReactNode;
}) {
  const isHold = rx.holdSeconds != null;
  const [reps, setReps] = useState(rx.reps ?? 0);
  const [hold, setHold] = useState(rx.holdSeconds ?? 0);
  const [weight, setWeight] = useState(rx.weight ?? 0);
  const [effort, setEffort] = useState(5);
  const [discomfort, setDiscomfort] = useState(0);
  const [locs, setLocs] = useState<string[]>([]);
  const [flags, setFlags] = useState(false);
  const stepWeight = (dir: 1 | -1) => {
    const i = weights.indexOf(weight);
    const n = i === -1 ? weights[0] : weights[Math.max(0, Math.min(weights.length - 1, i + dir))];
    if (n != null) setWeight(n);
  };
  const save = async () => {
    const log: Omit<SetLog, 'id' | 'loggedAt'> = { sessionId: session.id, exerciseId: ex.id, side, setNumber: setNo, effort, discomfort, discomfortLocations: locs, bandLevel: rx.bandLevel, supportLevel: rx.supportLevel };
    if (isHold) log.holdSeconds = hold; else log.reps = reps;
    if (rx.weight != null) log.weight = weight;
    await logSet(log);
    onLogged();
  };
  return (
    <div className="page stack fade-in">
      {header}
      <h2>Log set {setNo}{side ? ` · ${side}` : ''}</h2>
      <p className="muted">{ex.name}</p>
      <Card className="stack">
        {isHold ? (
          <div className="flex items-center justify-between gap-3 flex-wrap"><span className="font-bold">Seconds held</span><Stepper value={hold} onChange={setHold} min={0} max={300} label="seconds held" /></div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap"><span className="font-bold">Reps</span><Stepper value={reps} onChange={setReps} min={0} max={100} label="reps" /></div>
        )}
        {rx.weight != null && (
          <div className="flex items-center justify-between gap-3 flex-wrap"><span className="font-bold">Weight ({unit})</span>
            <div className="stepper"><button type="button" aria-label="Lighter" onClick={() => stepWeight(-1)}>−</button><output>{weight}</output><button type="button" aria-label="Heavier" onClick={() => stepWeight(1)}>+</button></div>
          </div>
        )}
        <div>
          <label htmlFor="effort">Effort: {effort}/10 · {EFFORT_LABELS[effort]}</label>
          <input id="effort" type="range" min={1} max={10} value={effort} onChange={(e) => setEffort(+e.target.value)} />
        </div>
        <div>
          <label htmlFor="discomfort">Discomfort: {discomfort}/10 · {discomfort === 0 ? 'none' : discomfort <= 2 ? 'mild' : discomfort <= 4 ? 'noticeable' : 'stop this exercise'}</label>
          <input id="discomfort" type="range" min={0} max={10} value={discomfort} onChange={(e) => setDiscomfort(+e.target.value)} />
          {discomfort > 0 && (
            <div className="mt-2 stack-sm">
              <p className="text-sm muted">Where?</p>
              <div className="flex flex-wrap gap-1">
                {DISCOMFORT_LOCATIONS.map((l) => <Chip key={l} active={locs.includes(l)} onClick={() => setLocs(locs.includes(l) ? locs.filter((x) => x !== l) : [...locs, l])} className="text-sm">{l}</Chip>)}
              </div>
              <details className="text-sm muted"><summary>Soreness or pain?</summary>
                <p className="mt-1">Soreness is dull, spread across a muscle, and eases with movement. Pain is sharp, in a joint, or comes with numbness, tingling or swelling. If it is pain, tap "Something's not right" below.</p></details>
            </div>
          )}
        </div>
        {discomfort >= 5 && <Callout>That is a stop signal. This exercise will be swapped for an easier version next time, and your PT engine will note it.</Callout>}
      </Card>
      <Button size="lg" onClick={save}>Save set</Button>
      <Button variant="ghost" size="sm" onClick={() => setFlags((f) => !f)}>Something's not right</Button>
      {flags && (
        <Card soft className="stack-sm">
          <p className="font-bold">Any of these right now?</p>
          {RED_FLAGS.map((f) => <Button key={f.id} variant="danger" size="sm" onClick={() => onRedFlag(f)}>{f.label}</Button>)}
          <p className="text-sm muted">Tapping one stops the session and shows what to do next. No swap is offered on purpose.</p>
        </Card>
      )}
    </div>
  );
}

function Reflect({ onDone }: { onDone: (early: boolean) => void }) {
  const [feel, setFeel] = useState<string | null>(null);
  return (
    <div className="page stack fade-in">
      <h1>How was that?</h1>
      <div className="flex flex-wrap gap-2">
        {['Better than expected', 'About right', 'Tough today', 'Something bothered me'].map((f) => <Chip key={f} active={feel === f} onClick={() => setFeel(f)}>{f}</Chip>)}
      </div>
      <p className="muted text-sm">Optional. Nothing here changes the plan; it is just for you.</p>
      <Button size="lg" onClick={async () => { if (feel) await db.kv.put({ key: `reflect-${Date.now()}`, value: feel }); onDone(false); }}>Finish session</Button>
    </div>
  );
}
