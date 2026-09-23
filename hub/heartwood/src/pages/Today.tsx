import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TEMPLATES } from '@/data/templates';
import { CoachBubble } from '@/components/CoachBubble';
import { Button, Card, Callout } from '@/components/ui';
import { dailyWord, messageText, pickMessage } from '@/coach/messages';
import { guideForTemplate } from '@/data/guides';
import { USER_MAP, setActiveUserId } from '@/db/users';
import { SHIRE_FITNESS, readSignals, takeRequest, type Request } from '@/app/handoff';
import { db } from '@/db/db';
import { applyLongGapReset, getTodayState, makeTodaySabbath, notToday, recordRestDay, setSabbathForWeek, startSession, startTemplateNow, type TodayState } from '@/db/program-service';
import { formatLongDate, isWeekend, weekStartOf } from '@/domain/dates';
import { useProfile } from '@/hooks/useProfile';
import { useLiveQuery } from 'dexie-react-hooks';

export function TodayPage() {
  const profile = useProfile();
  const nav = useNavigate();
  const [state, setState] = useState<TodayState | null>(null);
  // A gentle day or a tender week in The Shire starts the day on the 5-minute version; she can change it.
  const [readiness, setReadiness] = useState<'low' | 'okay' | 'good' | null>(() => (readSignals().easy ? 'low' : null));
  const [starting, setStarting] = useState(false);
  // The Shire may ask for one session by name (a path step), or the five-minute version.
  const [request, setRequest] = useState<Request | null>(() => takeRequest());
  const [restMsg, setRestMsg] = useState<string | null>(null);
  const sessionCount = useLiveQuery(() => db.sessions.where('status').anyOf('completed', 'partial').count(), []);

  const refresh = () => getTodayState().then(setState);
  useEffect(() => { refresh(); }, [sessionCount]);

  if (!profile || !state) return <div className="page muted">Loading…</div>;
  const cs = profile.coachSettings;
  const vars = { n: state.totalSessions + 1, name: profile.name, why: profile.why.text };

  // ---------- Sabbath mode (Section 8.4) ----------
  if (state.isSabbath) {
    const msg = pickMessage({ moment: 'sabbath', tone: cs.tone, faithTrack: cs.faithTrack, vars });
    return (
      <div className="page stack fade-in text-center">
        <Grove />
        <h1>Sabbath</h1>
        <p className="text-xl">{msg ? messageText(msg) : 'A day set apart. Nothing to do here today.'}</p>
        <p className="muted">Rest is part of the plan. The tree grows roots today.</p>
        <WordForToday date={state.today} faith={cs.faithTrack} />
        <details className="muted text-sm"><summary>Take a walk anyway</summary><p className="mt-2">A gentle walk on flat ground is always fine. Nothing to log.</p></details>
      </div>
    );
  }

  const next = state.next;
  const template = next ? TEMPLATES[next.templateId] : null;
  const ws = weekStartOf(state.today);

  const start = async (five: boolean) => {
    if (!next) return;
    setStarting(true);
    if (state.gap === 'long-gap') await applyLongGapReset();
    const s = await startSession(next.id, { fiveMinute: five || readiness === 'low' });
    await db.kv.put({ key: 'readiness', value: readiness });
    nav(`/session/${s.id}`);
  };

  const lead = next ? guideForTemplate(next.templateId).id : 'coach';
  const preMsg = state.gap !== 'none'
    ? pickMessage({ moment: 'comeback', tone: cs.tone, faithTrack: cs.faithTrack, vars })
    : (pickMessage({ moment: 'pre-session', tone: cs.tone, faithTrack: cs.faithTrack, speaker: lead, vars }) ?? pickMessage({ moment: 'pre-session', tone: cs.tone, faithTrack: cs.faithTrack, vars }));

  return (
    <div className="page stack fade-in">
      <header className="flex items-baseline justify-between gap-2">
        <h1>Today</h1>
        <span className="muted text-right">{formatLongDate(state.today)}<br /><button type="button" className="underline text-sm" onClick={() => { setActiveUserId(null); window.location.replace(SHIRE_FITNESS); }}>{profile.name || USER_MAP[profile.userId ?? 'her'].label} · switch</button></span>
      </header>

      <WordForToday date={state.today} faith={cs.faithTrack} />

      {!state.weekAsked && (
        <Callout>
          <p className="font-bold mb-2">Sabbath this week: Saturday or Sunday?</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSabbathForWeek(ws, 'sat').then(refresh)}>Saturday</Button>
            <Button size="sm" variant="secondary" onClick={() => setSabbathForWeek(ws, 'sun').then(refresh)}>Sunday</Button>
          </div>
        </Callout>
      )}

      {state.needsReassessment && (
        <Callout><p>It has been a few weeks. <Link to="/reassess" className="underline font-bold">Repeat the movement screen</Link> when you have 10 minutes; it may unlock new progressions.</p></Callout>
      )}

      {request && (request.templateId && TEMPLATES[request.templateId as keyof typeof TEMPLATES] ? (
        <Card className="stack text-center">
          <p className="muted">The Shire sent you here for</p>
          <h2 className="text-3xl">{TEMPLATES[request.templateId as keyof typeof TEMPLATES].name}</h2>
          <p className="muted">About {TEMPLATES[request.templateId as keyof typeof TEMPLATES].estimatedMinutes} min. Every step optional. Your planned week is untouched.</p>
          <div className="py-2 flex flex-wrap gap-2 justify-center">
            <Button variant="start" disabled={starting} onClick={async () => { setStarting(true); const s = await startTemplateNow(request.templateId as keyof typeof TEMPLATES, { fiveMinute: request.five }); nav(`/session/${s.id}`); }}>Start</Button>
            <Button variant="ghost" onClick={() => setRequest(null)}>Not this one</Button>
          </div>
        </Card>
      ) : request.five && next ? (
        <Callout><p>The Shire sent you for five minutes. <button type="button" className="underline font-bold" onClick={() => start(true)}>Start the five-minute version</button> of today&apos;s session, or pick below.</p></Callout>
      ) : null)}
      {restMsg && <CoachBubble speaker="coach" text={restMsg} settings={cs} onDismiss={() => setRestMsg(null)} />}

      {next && template ? (
        <Card className="stack text-center">
          {state.gap !== 'none' && <p className="font-bold" style={{ color: 'var(--secondary)' }}>Comeback mode: lighter today, on purpose.</p>}
          {next.isRecoveryWeek && <p className="muted">Recovery week: volume eased.</p>}
          <h2 className="text-3xl">{template.name}</h2>
          <p className="muted">About {state.estimatedMinutes} min{state.equipment.length ? ` · grab: ${state.equipment.join(', ')}` : ''}</p>
          {state.inProgress && <p className="font-bold">In progress. Pick up where you left off.</p>}
          <div className="py-2">
            <Button variant="start" onClick={() => start(false)} disabled={starting}>{state.inProgress ? 'Continue' : 'Start'}</Button>
          </div>
          {preMsg && <CoachBubble speaker={preMsg.speaker === 'any' ? lead : preMsg.speaker} text={preMsg.text} settings={cs} />}
        </Card>
      ) : (
        <Card><p>Your program is complete. Head to Settings to start a new block.</p></Card>
      )}

      {next && (
        <Card soft className="stack-sm">
          <p className="font-bold">Quick check (optional)</p>
          <p className="muted text-sm">Energy right now?</p>
          <div className="flex gap-2">
            {(['low', 'okay', 'good'] as const).map((r) => <button key={r} type="button" className="chip" aria-pressed={readiness === r} onClick={() => setReadiness(r)}>{r}</button>)}
          </div>
          {readiness === 'low' && <p className="text-sm">Low energy is fine. Start will give you the 5-minute version.</p>}
        </Card>
      )}

      {next && (
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="ghost" onClick={() => start(true)} disabled={starting}>5-minute version</Button>
          <Button variant="ghost" onClick={async () => { await notToday(); await recordRestDay(); setRestMsg(pickMessage({ moment: 'rest', tone: cs.tone, faithTrack: cs.faithTrack, vars })?.text ?? null); refresh(); }}>Not today</Button>
          {isWeekend(state.today) && <Button variant="ghost" onClick={() => makeTodaySabbath().then(refresh)}>Make today my Sabbath</Button>}
        </div>
      )}

      <Card soft className="stack-sm">
        <p className="font-bold">No plan today? Just move.</p>
        <p className="muted text-sm">Pick the parts of your body you want to work on and how long you have. Five minutes counts.</p>
        <Link to="/freestyle" className="btn btn-secondary">Choose areas & time</Link>
      </Card>

      <p className="muted text-sm text-center">Sabbath this week: {state.sabbathThisWeek === 'sat' ? 'Saturday' : 'Sunday'} · <Link to="/disclaimer" className="underline">Not medical advice</Link></p>
    </div>
  );
}

function WordForToday({ date, faith }: { date: string; faith: boolean }) {
  const w = dailyWord(date, faith);
  return (
    <div className="callout fade-in" role="note" aria-label="A word for today">
      <p className="text-sm muted mb-1">A word for today</p>
      <p className="text-lg" style={{ fontFamily: 'var(--font-display)' }}>{w.ref ? `“${w.text}”` : w.text}</p>
      {w.ref && <p className="muted text-sm mt-1">{w.ref}</p>}
    </div>
  );
}

function Grove() {
  return (
    <svg viewBox="0 0 320 200" width="100%" role="img" aria-label="A quiet grove in golden light" className="breathe">
      <defs><radialGradient id="glow" cx="70%" cy="20%" r="60%"><stop offset="0%" stopColor="#F2C94C" stopOpacity="0.55" /><stop offset="100%" stopColor="#F2C94C" stopOpacity="0" /></radialGradient></defs>
      <rect width="320" height="200" rx="24" fill="var(--bg-card)" />
      <rect width="320" height="200" rx="24" fill="url(#glow)" />
      {[40, 100, 160, 220, 280].map((x, i) => (
        <g key={x}>
          <rect x={x - 4} y={110 + (i % 2) * 10} width="8" height={70 - (i % 2) * 10} fill="var(--color-bark-600)" />
          <path d={`M${x} ${40 + (i % 2) * 14} L${x - 34} ${120 + (i % 2) * 10} L${x + 34} ${120 + (i % 2) * 10} Z`} fill={i % 2 ? 'var(--color-moss-600)' : 'var(--color-forest-700)'} />
        </g>
      ))}
      <ellipse cx="160" cy="184" rx="150" ry="10" fill="var(--color-fern-400)" opacity="0.5" />
    </svg>
  );
}
