import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/app/config';
import { CoachAvatar, PTAvatar } from '@/components/Characters';
import { BodyMap } from '@/components/BodyMap';
import { MovementScreen } from '@/components/MovementScreen';
import { Button, Card, Callout, Chip, Field, ProgressBar, Toggle } from '@/components/ui';
import { db } from '@/db/db';
import { startingLevelsFrom } from '@/domain/assessment';
import { WEEKDAY_SHORT } from '@/domain/dates';
import type { Assessment, CoachSettings, Goal, MuscleRegion, SabbathDay, UserProfile, Weekday } from '@/domain/types';
import { updateProfile, useProfile } from '@/hooks/useProfile';
import { WhyRecorder } from '@/components/WhyRecorder';

const STEPS = ['Welcome', 'Goals', 'Schedule', 'Equipment', 'Body history', 'Movement screen', 'Your why', 'Coach setup', 'Screen setup', 'Plan ready'];

const GOALS: { id: Goal; label: string }[] = [
  { id: 'strength', label: 'Build strength' }, { id: 'balance', label: 'Improve balance' }, { id: 'joint-health', label: 'Joint health' }, { id: 'feel-better', label: 'Feel better day-to-day' },
];

export function OnboardingPage() {
  const profile = useProfile();
  const nav = useNavigate();
  const [step, setStepState] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  // Navigate only once the live profile reflects completion, otherwise the Gate
  // would read a stale profile and bounce straight back here.
  useEffect(() => { if (finished && profile?.onboardingComplete) nav('/', { replace: true }); }, [finished, profile?.onboardingComplete, nav]);
  if (!profile) return null;
  const cur = step ?? profile.onboardingStep;
  const setStep = (n: number) => { setStepState(n); updateProfile({ onboardingStep: n }); };
  const patch = (p: Partial<UserProfile>) => updateProfile(p);

  const next = () => setStep(Math.min(STEPS.length - 1, cur + 1));
  const back = () => setStep(Math.max(0, cur - 1));

  return (
    <div className="page stack fade-in" key={cur}>
      <ProgressBar value={cur} max={STEPS.length - 1} label="Onboarding progress" />
      <p className="muted">{cur + 1} of {STEPS.length} · {STEPS[cur]}</p>

      {cur === 0 && (
        <div className="stack">
          <h1>Welcome to {APP_NAME}</h1>
          <p>This app is your personal trainer and physical therapist in one. It plans every session. You open it, press Start, and follow along.</p>
          <Callout>It cannot diagnose or replace a real PT. With your neck, ankle and knee history, one in-person PT evaluation is a very good idea. Whatever they tell you wins.</Callout>
          <Field label="What should we call you?"><input className="input" value={profile.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Your name" /></Field>
          <p>You can pause this setup any time and pick it up where you left off.</p>
          <Button size="lg" onClick={next}>Let's begin</Button>
        </div>
      )}

      {cur === 1 && (
        <div className="stack">
          <h1>What matters to you?</h1>
          <p className="muted">Pick as many as you like.</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => <Chip key={g.id} active={profile.goals.includes(g.id)} onClick={() => patch({ goals: profile.goals.includes(g.id) ? profile.goals.filter((x) => x !== g.id) : [...profile.goals, g.id] })}>{g.label}</Chip>)}
          </div>
          <Nav back={back} next={next} />
        </div>
      )}

      {cur === 2 && (
        <div className="stack">
          <h1>Your week</h1>
          <Field label="Days you would like to train" hint="Six days by default: three strength, three short PT sessions. Your Sabbath is always protected.">
            <div className="flex flex-wrap gap-2">
              {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => <Chip key={d} active={profile.preferredDays.includes(d)} onClick={() => patch({ preferredDays: profile.preferredDays.includes(d) ? profile.preferredDays.filter((x) => x !== d) : [...profile.preferredDays, d] })}>{WEEKDAY_SHORT[d]}</Chip>)}
            </div>
          </Field>
          <Field label="Strength session length">
            <div className="flex flex-wrap gap-2">
              {([15, 25, 35, 45] as const).map((m) => <Chip key={m} active={profile.sessionLength === m} onClick={() => patch({ sessionLength: m })}>{m} min</Chip>)}
            </div>
          </Field>
          <Field label="Sabbath this week">
            <div className="flex gap-2">
              {(['sat', 'sun'] as SabbathDay[]).map((s) => <Chip key={s} active={profile.sabbathDay === s} onClick={() => patch({ sabbathDay: s })}>{s === 'sat' ? 'Saturday' : 'Sunday'}</Chip>)}
            </div>
            <p className="muted text-sm">You will be asked each week, and can change it on the day.</p>
          </Field>
          <Nav back={back} next={next} disabled={profile.preferredDays.length === 0} />
        </div>
      )}

      {cur === 3 && <EquipmentStep profile={profile} patch={patch} back={back} next={next} />}

      {cur === 4 && <BodyHistoryStep profile={profile} patch={patch} back={back} next={next} />}

      {cur === 5 && (
        <div className="stack">
          <h1>Movement screen</h1>
          <p className="muted">Six gentle self-tests. They set your starting levels. Rate honestly; "hard" and "painful" are useful answers.</p>
          <MovementScreen kind="onboarding" onCancel={() => { /* progress is kept at this step */ }} onDone={async (a: Assessment) => {
            await db.assessments.add(a);
            const levels = startingLevelsFrom(a);
            await patch({ bodyHistory: { ...profile.bodyHistory, notes: `${profile.bodyHistory.notes}\nScreen ${a.date}: knees ${levels.knees}, balance ${levels.balance}, focus ${levels.ptFocus.join(', ') || 'none'}`.trim() } });
            next();
          }} />
          <Button variant="ghost" onClick={back}>Back</Button>
        </div>
      )}

      {cur === 6 && (
        <div className="stack">
          <h1>Your why</h1>
          <p>Why does this matter? Who are you doing it for? Your coach will bring these words back to you at the right moments.</p>
          <WhyRecorder why={profile.why} onChange={(why) => patch({ why })} />
          <Nav back={back} next={next} />
        </div>
      )}

      {cur === 7 && <CoachStep settings={profile.coachSettings} onChange={(coachSettings) => patch({ coachSettings })} back={back} next={next} />}

      {cur === 8 && (
        <div className="stack">
          <h1>Where to put your phone</h1>
          <Card>
            <ul className="list-disc pl-5 stack-sm">
              <li>For floor work, prop the phone on a yoga block or against a wall so it is level with your eyes when your head is resting.</li>
              <li>You should never have to lift or turn your head to see the screen.</li>
              <li>For standing work, a counter or shelf at chest height works well.</li>
              <li>Turn on voice cues in Settings if looking at the screen is a strain. The coach can talk you through it.</li>
            </ul>
          </Card>
          <Nav back={back} next={next} />
        </div>
      )}

      {cur === 9 && (
        <div className="stack text-center">
          <div className="flex justify-center gap-3"><CoachAvatar design={profile.coachSettings.coachDesign} size={72} /><PTAvatar design={profile.coachSettings.ptDesign} size={72} /></div>
          <h1>Your plan is ready.</h1>
          <p className="text-xl">All you have to do is show up.</p>
          <Button size="lg" onClick={async () => { await patch({ onboardingComplete: true, onboardingStep: 9, programStartDate: new Date().toISOString().slice(0, 10) }); setFinished(true); }}>Take me to today</Button>
          <Button variant="ghost" onClick={back}>Back</Button>
        </div>
      )}
    </div>
  );
}

function Nav({ back, next, disabled }: { back: () => void; next: () => void; disabled?: boolean }) {
  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={back}>Back</Button>
      <Button onClick={next} disabled={disabled} className="flex-1">Next</Button>
    </div>
  );
}

function EquipmentStep({ profile, patch, back, next }: { profile: UserProfile; patch: (p: Partial<UserProfile>) => void; back: () => void; next: () => void }) {
  const eq = profile.equipment;
  const set = (p: Partial<UserProfile['equipment']>) => patch({ equipment: { ...eq, ...p } });
  const [w, setW] = useState('');
  const [b, setB] = useState('');
  return (
    <div className="stack">
      <h1>Your equipment</h1>
      <Field label={`Dumbbells (${eq.weightUnit})`} hint="Add each weight you own. The plan starts with the lightest.">
        <div className="flex flex-wrap gap-2">
          {eq.dumbbellWeights.map((x) => <Chip key={x} active onClick={() => set({ dumbbellWeights: eq.dumbbellWeights.filter((y) => y !== x) })}>{x} ×</Chip>)}
        </div>
        <div className="flex gap-2">
          <input className="input" inputMode="decimal" placeholder="e.g. 12" value={w} onChange={(e) => setW(e.target.value)} aria-label="New dumbbell weight" />
          <Button variant="secondary" onClick={() => { const n = parseFloat(w); if (!isNaN(n) && n > 0 && !eq.dumbbellWeights.includes(n)) set({ dumbbellWeights: [...eq.dumbbellWeights, n].sort((a, c) => a - c) }); setW(''); }}>Add</Button>
        </div>
        <div className="flex gap-2">
          {(['lb', 'kg'] as const).map((u) => <Chip key={u} active={eq.weightUnit === u} onClick={() => set({ weightUnit: u })}>{u}</Chip>)}
        </div>
      </Field>
      <Field label="Bands, lightest to heaviest">
        <div className="flex flex-wrap gap-2">
          {eq.bandLevels.map((x) => <Chip key={x} active onClick={() => set({ bandLevels: eq.bandLevels.filter((y) => y !== x) })}>{x} ×</Chip>)}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="e.g. extra heavy" value={b} onChange={(e) => setB(e.target.value)} aria-label="New band level" />
          <Button variant="secondary" onClick={() => { const v = b.trim(); if (v && !eq.bandLevels.includes(v)) set({ bandLevels: [...eq.bandLevels, v] }); setB(''); }}>Add</Button>
        </div>
      </Field>
      <Toggle label="Yoga blocks" checked={eq.yogaBlocks} onChange={(v) => set({ yogaBlocks: v })} />
      <Toggle label="Sturdy chair" checked={eq.chair} onChange={(v) => set({ chair: v })} />
      <Toggle label="Counter or table" checked={eq.counter} onChange={(v) => set({ counter: v })} />
      <Toggle label="Wall space" checked={eq.wall} onChange={(v) => set({ wall: v })} />
      <Toggle label="Low step" checked={eq.step} onChange={(v) => set({ step: v })} />
      <Nav back={back} next={next} />
    </div>
  );
}

function BodyHistoryStep({ profile, patch, back, next }: { profile: UserProfile; patch: (p: Partial<UserProfile>) => void; back: () => void; next: () => void }) {
  const bh = profile.bodyHistory;
  const set = (p: Partial<UserProfile['bodyHistory']>) => patch({ bodyHistory: { ...bh, ...p } });
  const [mode, setMode] = useState<'painAreas' | 'tightnessAreas' | 'pastInjuryAreas'>('painAreas');
  const toggleRegion = (r: MuscleRegion) => set({ [mode]: bh[mode].includes(r) ? bh[mode].filter((x) => x !== r) : [...bh[mode], r] });
  const intensity = Object.fromEntries(bh[mode].map((r) => [r, 1]));
  return (
    <div className="stack">
      <h1>Your body history</h1>
      <p className="muted">Pre-filled from what you told us. Edit anything.</p>
      <Toggle label="Neck issues" hint="No neck loading or loaded neck flexion, ever." checked={bh.neckIssues} onChange={(v) => set({ neckIssues: v })} />
      <Toggle label="Balance / instability" hint="Balance work always starts supported." checked={bh.balanceIssues} onChange={(v) => set({ balanceIssues: v })} />
      <Toggle label="Ankle sprains, breaks, strains" hint="Ankles progress conservatively." checked={bh.ankleHistory} onChange={(v) => set({ ankleHistory: v })} />
      <Toggle label="Left knee injury" hint="Controlled range, block limiters offered." checked={bh.leftKneeInjury} onChange={(v) => set({ leftKneeInjury: v })} />
      <Toggle label="Right knee injury" checked={bh.rightKneeInjury} onChange={(v) => set({ rightKneeInjury: v })} />
      <Field label="Tap areas on the body map">
        <div className="flex gap-2 flex-wrap">
          <Chip active={mode === 'painAreas'} onClick={() => setMode('painAreas')}>Pain</Chip>
          <Chip active={mode === 'tightnessAreas'} onClick={() => setMode('tightnessAreas')}>Tightness</Chip>
          <Chip active={mode === 'pastInjuryAreas'} onClick={() => setMode('pastInjuryAreas')}>Past injury</Chip>
        </div>
        <BodyMap intensity={intensity} onSelect={toggleRegion} />
      </Field>
      <Field label="Anything else">
        <textarea className="input" rows={3} value={bh.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Field>
      <Nav back={back} next={next} />
    </div>
  );
}

export function CoachStep({ settings, onChange, back, next }: { settings: CoachSettings; onChange: (s: CoachSettings) => void; back?: () => void; next?: () => void }) {
  const set = (p: Partial<CoachSettings>) => onChange({ ...settings, ...p });
  return (
    <div className="stack">
      {next && <h1>Your coach and PT</h1>}
      <Field label="Coach design">
        <div className="flex gap-3">
          {(['oak', 'willow', 'cedar'] as const).map((d) => <button type="button" key={d} className="chip" aria-pressed={settings.coachDesign === d} onClick={() => set({ coachDesign: d })}><CoachAvatar design={d} size={44} />{d}</button>)}
        </div>
      </Field>
      <Field label="PT design">
        <div className="flex gap-3">
          {(['fern', 'moss', 'river'] as const).map((d) => <button type="button" key={d} className="chip" aria-pressed={settings.ptDesign === d} onClick={() => set({ ptDesign: d })}><PTAvatar design={d} size={44} />{d}</button>)}
        </div>
      </Field>
      <Field label="Tone">
        <div className="flex flex-wrap gap-2">
          <Chip active={settings.tone === 'gentle'} onClick={() => set({ tone: 'gentle' })}>Gentle</Chip>
          <Chip active={settings.tone === 'fierce'} onClick={() => set({ tone: 'fierce' })}>Fierce Warrior</Chip>
          <Chip active={settings.tone === 'calm'} onClick={() => set({ tone: 'calm' })}>Calm & Steady</Chip>
        </div>
      </Field>
      <Field label="Critique level" hint="How much form feedback you want. Always information, never judgment.">
        <div className="flex flex-wrap gap-2">
          {(['off', 'light', 'detailed'] as const).map((c) => <Chip key={c} active={settings.critique === c} onClick={() => set({ critique: c })}>{c}</Chip>)}
        </div>
      </Field>
      <Field label="Voice">
        <div className="flex flex-wrap gap-2">
          <Chip active={settings.voice === 'on'} onClick={() => set({ voice: 'on' })}>On</Chip>
          <Chip active={settings.voice === 'cues'} onClick={() => set({ voice: 'cues' })}>Cues only</Chip>
          <Chip active={settings.voice === 'off'} onClick={() => set({ voice: 'off' })}>Off</Chip>
        </div>
      </Field>
      <Toggle label="Faith-based encouragement" hint="Scripture and reflections on stewarding the body, rest, and partnering with God in the work." checked={settings.faithTrack} onChange={(v) => set({ faithTrack: v })} />
      {back && next && <Nav back={back} next={next} />}
    </div>
  );
}
