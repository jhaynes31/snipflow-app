import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ensureSeeded } from '@/db/seed'
import { applyTheme, useSettingsMaybe } from '@/lib/settings'
import { isUnlocked } from '@/lib/passcode'
import { checkReminders } from '@/lib/reminders'
import { Lock } from '@/pages/Lock'
import { Home } from '@/pages/Home'
import { Pause } from '@/pages/Pause'
import { CheckIn } from '@/pages/CheckIn'
import { JesusCardPage, JesusLibrary } from '@/pages/Jesus'
import { Hurting, Truths } from '@/pages/Truths'
import { BoundaryEditor, BoundaryList } from '@/pages/Boundaries'
import { PeopleList, PersonDetail } from '@/pages/People'
import { ReleaseList, ReleaseNew } from '@/pages/Release'
import { Wins } from '@/pages/Wins'
import { History } from '@/pages/History'
import { SettingsPage } from '@/pages/Settings'
import { ScrollToTop } from '@/components/ScrollToTop'

export default function App() {
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlockedState] = useState(isUnlocked())
  const settings = useSettingsMaybe()

  useEffect(() => { ensureSeeded().then(() => setReady(true)) }, [])
  useEffect(() => {
    if (!settings) return
    applyTheme(settings)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(settings)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings])
  const reminders = settings?.reminders
  useEffect(() => {
    if (!reminders) return
    checkReminders(reminders)
    const id = window.setInterval(() => checkReminders(reminders), 30_000)
    return () => clearInterval(id)
  }, [reminders])

  if (!ready || !settings) return null
  if (settings.passcodeHash && !unlocked && !isUnlocked()) return <Lock settings={settings} onUnlock={() => setUnlockedState(true)} />

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pause" element={<Pause />} />
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/hurting" element={<Hurting />} />
        <Route path="/jesus" element={<JesusLibrary />} />
        <Route path="/jesus/:id" element={<JesusCardPage />} />
        <Route path="/truths" element={<Truths />} />
        <Route path="/boundaries" element={<BoundaryList />} />
        <Route path="/boundaries/:id" element={<BoundaryEditor />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/release" element={<ReleaseList />} />
        <Route path="/release/new" element={<ReleaseNew />} />
        <Route path="/wins" element={<Wins />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
