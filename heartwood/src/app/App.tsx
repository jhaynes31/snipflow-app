import { useEffect } from 'react';
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { BookOpen, Dumbbell, Home, Settings as SettingsIcon, TreePine } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useApplyTheme } from '@/hooks/useTheme';
import { loadMediaManifest } from '@/data/media';
import { TodayPage } from '@/pages/Today';
import { OnboardingPage } from '@/pages/Onboarding';
import { SessionPage } from '@/pages/Session';
import { LibraryPage } from '@/pages/Library';
import { ExerciseDetailPage } from '@/pages/ExerciseDetail';
import { LearnPage } from '@/pages/Learn';
import { ProgressPage } from '@/pages/Progress';
import { SettingsPage } from '@/pages/Settings';
import { PTPlanPage } from '@/pages/PTPlan';
import { ReassessmentPage } from '@/pages/Reassessment';
import { RedFlagPage } from '@/pages/RedFlag';
import { DisclaimerPage } from '@/pages/Disclaimer';
import { WhoPage } from '@/pages/Who';
import { FreestylePage } from '@/pages/Freestyle';
import { getActiveUserId } from '@/db/users';

function Shell() {
  const { pathname } = useLocation();
  const hideNav = pathname.startsWith('/session') || pathname.startsWith('/onboarding') || pathname.startsWith('/reassess') || pathname.startsWith('/freestyle');
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1"><Outlet /></main>
      {!hideNav && (
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end><Home size={22} />Today</NavLink>
          <NavLink to="/library"><Dumbbell size={22} />Exercises</NavLink>
          <NavLink to="/learn"><BookOpen size={22} />Learn</NavLink>
          <NavLink to="/progress"><TreePine size={22} />Tree</NavLink>
          <NavLink to="/settings"><SettingsIcon size={22} />Settings</NavLink>
        </nav>
      )}
    </div>
  );
}

function Gate() {
  const profile = useProfile();
  const { pathname } = useLocation();
  if (!profile) return <div className="page muted">Loading…</div>;
  if (!profile.onboardingComplete && !pathname.startsWith('/onboarding') && !pathname.startsWith('/disclaimer')) return <Navigate to="/onboarding" replace />;
  return <Shell />;
}

export function App() {
  // No person chosen yet on this device: ask before touching any database.
  if (!getActiveUserId()) return <WhoPage />;
  return <Main />;
}

function Main() {
  const profile = useProfile();
  useApplyTheme(profile);
  useEffect(() => { loadMediaManifest(); }, []);
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Gate />}>
          <Route path="/" element={<TodayPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/exercise/:id" element={<ExerciseDetailPage />} />
          <Route path="/learn" element={<LearnPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pt-plan" element={<PTPlanPage />} />
          <Route path="/reassess" element={<ReassessmentPage />} />
          <Route path="/red-flag" element={<RedFlagPage />} />
          <Route path="/disclaimer" element={<DisclaimerPage />} />
          <Route path="/freestyle" element={<FreestylePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
