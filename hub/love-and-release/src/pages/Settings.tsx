import { SHIRE_PAGE } from '@/app/person'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Toggle } from '@/components/Toggle'
import { Confirm } from '@/components/Confirm'
import { db, newId } from '@/db/db'
import type { Reminder, Theme } from '@/db/types'
import { updateSettings, useSettings } from '@/lib/settings'
import { hashPasscode, makeSalt, setUnlocked } from '@/lib/passcode'
import { downloadBackup, importBackup, parseBackup, resetEverything, type Backup } from '@/lib/backup'
import { notificationsSupported, requestNotificationPermission } from '@/lib/reminders'

export function SettingsPage() {
  const s = useSettings()
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [pendingImport, setPendingImport] = useState<Backup | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmRemovePin, setConfirmRemovePin] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [newTime, setNewTime] = useState('20:00')
  const [newLabel, setNewLabel] = useState('')
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>(notificationsSupported() ? Notification.permission : 'unsupported')

  const savePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) return setPinMsg('Use 4 to 8 digits.')
    if (pin !== pin2) return setPinMsg("Those didn't match. Try once more.")
    const salt = makeSalt()
    await updateSettings({ passcodeSalt: salt, passcodeHash: await hashPasscode(pin, salt) })
    setUnlocked(true)
    setPin(''); setPin2(''); setPinMsg('Passcode set.')
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setPendingImport(parseBackup(await f.text()))
      setImportMsg('')
    } catch (e) {
      setImportMsg((e as Error).message)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const addReminder = async () => {
    const r: Reminder = { id: newId(), time: newTime, label: newLabel.trim(), enabled: true }
    await updateSettings({ reminders: [...s.reminders, r] })
    setNewLabel('')
    if (notifState === 'default') setNotifState(await requestNotificationPermission())
  }
  const setReminder = (id: string, patch: Partial<Reminder>) => updateSettings({ reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch } : r)) })

  return (
    <Shell back="/" title="Settings">
      <div className="stack-lg">
        <section className="card">
          <h3>Look and feel</h3>
          <div className="field">
            <span className="label">Theme</span>
            <div className="chips">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => <button key={t} type="button" className="chip" aria-pressed={s.theme === t} onClick={() => updateSettings({ theme: t })}>{t === 'system' ? 'Match device' : t === 'light' ? 'Warm light' : 'Soft dark'}</button>)}
            </div>
          </div>
          <Toggle label="Larger text" checked={s.textSize === 'large'} onChange={(v) => updateSettings({ textSize: v ? 'large' : 'normal' })} />
          <Toggle label="Reduce motion" hint="Turns off animations, including the breathing circle's movement." checked={s.reduceMotion} onChange={(v) => updateSettings({ reduceMotion: v })} />
          <Toggle label="Gentle haptics" hint="A soft buzz on breathing phases, where the device supports it." checked={s.haptics !== false} onChange={(v) => updateSettings({ haptics: v })} />
        </section>

        <section className="card">
          <h3>Circles</h3>
          <Toggle label="Show cues on the circle" hint="Small dots for one-sided patterns and open watch notes." checked={s.circleCues !== false} onChange={(v) => updateSettings({ circleCues: v })} />
          <Toggle label="Gentle circle reviews" hint="An optional nudge to look over the whole circle now and then. Easy to snooze." checked={s.circleReviewEnabled !== false} onChange={(v) => updateSettings({ circleReviewEnabled: v })} />
          <div className="field mt">
            <span className="label">Review every</span>
            <div className="chips">{[30, 90, 180].map((d) => <button key={d} type="button" className="chip chip-sm" style={{ cursor: 'pointer' }} aria-pressed={(s.circleReviewDays ?? 90) === d} onClick={() => updateSettings({ circleReviewDays: d })}>{d === 30 ? 'Month' : d === 90 ? '3 months' : '6 months'}</button>)}</div>
          </div>
          <button type="button" className="btn btn-quiet btn-sm mt" onClick={() => updateSettings({ circlesIntroSeen: false })}>Show the "Why circles?" intro again</button>
        </section>

        <section className="card">
          <h3>Daily rhythm</h3>
          <Toggle label="Morning check-in" hint="Whose I am, one truth, one intention. Sixty seconds." checked={s.dailyMorning !== false} onChange={(v) => updateSettings({ dailyMorning: v })} />
          <Toggle label="Evening check-in" hint="Where I felt loved, where I fawned, where I honored myself, what I'm setting down." checked={s.dailyEvening !== false} onChange={(v) => updateSettings({ dailyEvening: v })} />
          <p className="help">Cycle tracking and your name live under <Link to="/me">Me</Link>.</p>
        </section>

        <section className="card">
          <h3>Unhooked</h3>
          <p className="help">Therapist contact and support options live under <Link to="/unhooked/support">Support and safety</Link>.{s.therapistName ? ` Saved: ${s.therapistName}.` : ''}</p>
        </section>

        <section className="card">
          <h3>Passcode</h3>
          <p className="help">Optional. Keeps a casual glance from reading your entries. Your data stays on this device either way.</p>
          {s.passcodeHash ? (
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>A passcode is set.</p>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmRemovePin(true)}>Remove passcode</button>
            </div>
          ) : (
            <div className="stack">
              <input className="input" inputMode="numeric" type="password" autoComplete="off" placeholder="New passcode (4–8 digits)" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="New passcode" />
              <input className="input" inputMode="numeric" type="password" autoComplete="off" placeholder="Same again" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))} aria-label="Repeat passcode" />
              <button type="button" className="btn btn-primary" onClick={savePin} disabled={!pin}>Set passcode</button>
            </div>
          )}
          {pinMsg && <p className="faint mt" aria-live="polite">{pinMsg}</p>}
        </section>

        <section className="card">
          <h3>Gentle reminders</h3>
          <p className="help">Optional. Never guilt-based, easy to turn off. Reminders can only appear while the app is open or installed and running; there's no server behind this.</p>
          {notifState === 'unsupported' && <p className="faint">This browser doesn't support notifications.</p>}
          {notifState === 'denied' && <p className="faint">Notifications are blocked in your browser settings. Reminders will stay quiet until that changes.</p>}
          {s.reminders.map((r) => (
            <div key={r.id} className="switch">
              <div className="row grow">
                <input className="input" type="time" value={r.time} onChange={(e) => setReminder(r.id, { time: e.target.value })} aria-label="Reminder time" style={{ width: 'auto', minHeight: 40, padding: '6px 10px' }} />
                <input className="input grow" value={r.label} placeholder="Whenever you're ready." onChange={(e) => setReminder(r.id, { label: e.target.value })} aria-label="Reminder message" style={{ minHeight: 40, padding: '6px 10px' }} />
              </div>
              <button type="button" role="switch" aria-checked={r.enabled} aria-label="Reminder on" className="toggle" onClick={() => setReminder(r.id, { enabled: !r.enabled })} />
              <button type="button" className="btn btn-quiet btn-sm" aria-label="Remove reminder" onClick={() => updateSettings({ reminders: s.reminders.filter((x) => x.id !== r.id) })}>✕</button>
            </div>
          ))}
          <div className="row mt">
            <input className="input" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} aria-label="New reminder time" style={{ width: 'auto' }} />
            <input className="input grow" value={newLabel} placeholder="Message (optional)" onChange={(e) => setNewLabel(e.target.value)} aria-label="New reminder message" />
            <button type="button" className="btn btn-primary btn-sm" onClick={addReminder} disabled={notifState === 'unsupported'}>Add</button>
          </div>
        </section>

        <section className="card">
          <h3>Backup</h3>
          <p className="help">Everything lives on this device. Export a file you control, and import it on a new phone.</p>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={downloadBackup}>Export backup</button>
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Choose a backup file" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {importMsg && <p className="faint mt" aria-live="polite">{importMsg}</p>}
          {pendingImport && (
            <div className="notice mt stack">
              <div>Backup from {new Date(pendingImport.exportedAt).toLocaleString()}. How would you like to bring it in?</div>
              <div className="btn-row">
                <button type="button" className="btn btn-primary btn-sm" onClick={async () => { await importBackup(pendingImport, 'merge'); setPendingImport(null); setImportMsg('Merged in. Nothing existing was removed.') }}>Merge with what's here</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={async () => { await importBackup(pendingImport, 'replace'); setPendingImport(null); setImportMsg('Replaced. Your device now matches the backup.') }}>Replace everything</button>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setPendingImport(null)}>Cancel</button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Start over</h3>
          <p className="help">Removes every entry, person, truth, and setting from this device. Export a backup first if you might want it later.</p>
          <button type="button" className="btn btn-danger-soft" onClick={() => setConfirmReset(true)}>Reset the app</button>
        </section>

        <p className="faint center">Re-Centered · private, local, no accounts, no analytics.<br />A companion to healing work, not a replacement for it.</p>
      </div>

      <Confirm open={confirmRemovePin} title="Remove the passcode?" confirmLabel="Remove" onCancel={() => setConfirmRemovePin(false)} onConfirm={async () => { await updateSettings({ passcodeHash: undefined, passcodeSalt: undefined }); setConfirmRemovePin(false); setPinMsg('Passcode removed.') }} />
      <Confirm open={confirmReset} title="Reset everything?" body="This removes all your data from this device and can't be undone." confirmLabel="Yes, reset" onCancel={() => setConfirmReset(false)} onConfirm={async () => { await resetEverything(); window.location.href = SHIRE_PAGE }} />
      <span className="sr-only">{db.name}</span>
    </Shell>
  )
}
