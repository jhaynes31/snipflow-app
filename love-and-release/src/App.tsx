import { useEffect, useState } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'

const Router = __PREVIEW__ ? HashRouter : BrowserRouter
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
import { AddPerson, CircleView, WhyCircles } from '@/pages/Circles'
import { LayerEditor, LayersList, SetupRedirect } from '@/pages/Layers'
import { MoveReview } from '@/pages/MoveReview'
import { FlagDetail, FlagLibrary, LogRedFlag } from '@/pages/Flags'
import { LayerBoundaries } from '@/pages/LayerBoundaries'
import { CircleReview } from '@/pages/CircleReview'
import { Learn, Support, UnhookedHome } from '@/pages/Unhooked'
import { ToolPage } from '@/pages/UnhookedTools'
import { LoopFlow } from '@/pages/LoopFlow'
import { Values, WhoIAm } from '@/pages/UnhookedMe'
import { UnhookedJesus } from '@/pages/UnhookedJesus'
import { ExposureLadder, ReassurancePlan, RelapsePlanPage, SkillsProgress, TriggerMap } from '@/pages/UnhookedGrowth'
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
  useEffect(() => { document.documentElement.dataset.haptics = settings?.haptics === false ? 'false' : 'true' }, [settings?.haptics])
  useEffect(() => {
    if (!reminders) return
    checkReminders(reminders)
    const id = window.setInterval(() => checkReminders(reminders), 30_000)
    return () => clearInterval(id)
  }, [reminders])

  if (!ready || !settings) return null
  if (settings.passcodeHash && !unlocked && !isUnlocked()) return <Lock settings={settings} onUnlock={() => setUnlockedState(true)} />

  return (
    <Router>
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
        <Route path="/people/:id/flag" element={<LogRedFlag />} />
        <Route path="/circles" element={<CircleView />} />
        <Route path="/circles/why" element={<WhyCircles />} />
        <Route path="/circles/add" element={<AddPerson />} />
        <Route path="/circles/layers" element={<LayersList />} />
        <Route path="/circles/layers/:ringId" element={<LayerEditor />} />
        <Route path="/circles/setup" element={<SetupRedirect />} />
        <Route path="/circles/move/:personId" element={<MoveReview />} />
        <Route path="/circles/flags" element={<FlagLibrary />} />
        <Route path="/circles/flags/:id" element={<FlagDetail />} />
        <Route path="/circles/boundaries" element={<LayerBoundaries />} />
        <Route path="/circles/review" element={<CircleReview />} />
        <Route path="/unhooked" element={<UnhookedHome />} />
        <Route path="/unhooked/loop" element={<LoopFlow />} />
        <Route path="/unhooked/learn/:id" element={<Learn />} />
        <Route path="/unhooked/tools/:tool" element={<ToolPage />} />
        <Route path="/unhooked/me" element={<WhoIAm />} />
        <Route path="/unhooked/values" element={<Values />} />
        <Route path="/unhooked/jesus" element={<UnhookedJesus />} />
        <Route path="/unhooked/map" element={<TriggerMap />} />
        <Route path="/unhooked/ladder" element={<ExposureLadder />} />
        <Route path="/unhooked/reassurance" element={<ReassurancePlan />} />
        <Route path="/unhooked/progress" element={<SkillsProgress />} />
        <Route path="/unhooked/plan" element={<RelapsePlanPage />} />
        <Route path="/unhooked/support" element={<Support />} />
        <Route path="/release" element={<ReleaseList />} />
        <Route path="/release/new" element={<ReleaseNew />} />
        <Route path="/wins" element={<Wins />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Router>
  )
}
