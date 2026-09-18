import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME } from '@/app/config';
import { Button, Card, Chip, Field, Toggle } from '@/components/ui';
import { db, exportAll, importAll, type BackupFile } from '@/db/db';
import { setMaintainMode } from '@/db/program-service';
import { WEEKDAY_SHORT } from '@/domain/dates';
import type { Weekday } from '@/domain/types';
import { updateProfile, useProfile } from '@/hooks/useProfile';
import { WhyRecorder } from '@/components/WhyRecorder';
import { CoachStep } from './Onboarding';
import { setActiveUserId } from '@/db/users';

export function SettingsPage() {
  const profile = useProfile();
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!profile) return null;
  const ss = profile.sensorySettings;
  const setSS = (p: Partial<typeof ss>) => updateProfile({ sensorySettings: { ...ss, ...p } });

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${APP_NAME.toLowerCase()}-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setMsg('Backup downloaded.');
  };
  const doImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text()) as BackupFile;
      await importAll(json);
      setMsg('Backup restored.');
    } catch (e) { setMsg(`Could not import: ${(e as Error).message}`); }
  };

  return (
    <div className="page stack fade-in">
      <h1>Settings</h1>
      {msg && <p className="callout">{msg}</p>}

      <Card className="stack-sm">
        <h2>This person</h2>
        <Field label="Name"><input className="input" value={profile.name} onChange={(e) => updateProfile({ name: e.target.value })} /></Field>
        <p className="muted text-sm">Body figure: {profile.bodyType === 'man' ? 'man' : 'woman'}.</p>
        <Button variant="ghost" onClick={() => { setActiveUserId(null); window.location.replace('/'); }}>Switch person</Button>
      </Card>

      <Card className="stack-sm">
        <h2>Appearance</h2>
        <Field label="Mode">
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => <Chip key={m} active={profile.themeMode === m} onClick={() => updateProfile({ themeMode: m })}>{m === 'light' ? 'Morning' : m === 'dark' ? 'Dusk' : 'System'}</Chip>)}
          </div>
        </Field>
        <Toggle label="Outdoor mode" hint="Bigger text and buttons, higher contrast for sun glare." checked={ss.outdoorMode} onChange={(v) => setSS({ outdoorMode: v })} />
        <Toggle label="Reduced motion" checked={ss.reducedMotion} onChange={(v) => setSS({ reducedMotion: v })} />
        <Toggle label="Sound cues" checked={ss.soundCues} onChange={(v) => setSS({ soundCues: v })} />
        <Toggle label="Vibration cues" checked={ss.vibrationCues} onChange={(v) => setSS({ vibrationCues: v })} />
        <Toggle label="Keep screen awake during sessions" checked={ss.keepScreenAwake} onChange={(v) => setSS({ keepScreenAwake: v })} />
      </Card>

      <Card className="stack-sm">
        <h2>Coach & PT</h2>
        <CoachStep settings={profile.coachSettings} onChange={(coachSettings) => updateProfile({ coachSettings })} />
      </Card>

      <Card className="stack-sm">
        <h2>Your why</h2>
        <WhyRecorder why={profile.why} onChange={(why) => updateProfile({ why })} />
      </Card>

      <Card className="stack-sm">
        <h2>Schedule</h2>
        <Field label="Training days" hint="Sabbath is asked weekly on the Today screen.">
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => <Chip key={d} active={profile.preferredDays.includes(d)} onClick={() => updateProfile({ preferredDays: profile.preferredDays.includes(d) ? profile.preferredDays.filter((x) => x !== d) : [...profile.preferredDays, d] })}>{WEEKDAY_SHORT[d]}</Chip>)}
          </div>
        </Field>
        <Toggle label="Maintain mode" hint="Two strength days instead of three, preserving what you have built." checked={profile.maintainMode} onChange={(v) => setMaintainMode(v).then(() => setMsg(v ? 'Maintain mode on.' : 'Back to the full program.'))} />
        <Toggle label="Gentle reminders" hint="Silenced on your Sabbath. Requires notification permission." checked={ss.remindersEnabled} onChange={async (v) => { if (v && 'Notification' in window && Notification.permission !== 'granted') await Notification.requestPermission(); setSS({ remindersEnabled: v }); }} />
        {ss.remindersEnabled && <input type="time" className="input" value={ss.reminderTime ?? '08:00'} onChange={(e) => setSS({ reminderTime: e.target.value })} aria-label="Reminder time" />}
      </Card>

      <Card className="stack-sm">
        <h2>Body & safety</h2>
        <Link to="/pt-plan" className="btn btn-secondary">My PT's Plan</Link>
        <Link to="/reassess" className="btn btn-ghost">Repeat movement screen</Link>
        <p className="text-sm muted">Unlocked caution exercises: {profile.unlockedCautions.length ? profile.unlockedCautions.join(', ') : 'none'}{profile.unlockedCautions.length > 0 && <> · <button type="button" className="underline" onClick={() => updateProfile({ unlockedCautions: [] })}>re-lock all</button></>}</p>
        <Link to="/disclaimer" className="underline text-sm">Not medical advice</Link>
      </Card>

      <Card className="stack-sm">
        <h2>Backup</h2>
        <p className="text-sm muted">Everything stays on this device. Export a JSON file to keep a copy or move to a new phone.</p>
        <Button variant="secondary" onClick={doExport}>Export backup</Button>
        <label className="btn btn-ghost cursor-pointer">Import backup<input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} /></label>
      </Card>

      <Card className="stack-sm">
        <h2>Start over</h2>
        {!confirmReset ? <Button variant="danger" size="sm" onClick={() => setConfirmReset(true)}>Erase everything</Button> : (
          <div className="stack-sm">
            <p>This deletes all sessions, logs and settings on this device. Export a backup first if you want one.</p>
            <div className="flex gap-2"><Button variant="danger" size="sm" onClick={async () => { await db.delete(); await db.open(); nav('/onboarding'); window.location.reload(); }}>Yes, erase</Button><Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>Keep it</Button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
