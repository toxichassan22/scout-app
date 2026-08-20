import { lazy, Suspense, memo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoadingFallback } from './components/LoadingFallback';

// Seamlessly reload on stale chunk hashes during new deployments
function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      const msg = String(err?.message || '');
      if (
        msg.includes('dynamically imported module') ||
        msg.includes('Failed to fetch') ||
        msg.includes('Loading chunk')
      ) {
        const lastReload = Number(sessionStorage.getItem('dsc_lazy_reload_at') || 0);
        if (Date.now() - lastReload > 10000) {
          sessionStorage.setItem('dsc_lazy_reload_at', String(Date.now()));
          window.location.reload();
          return new Promise(() => {}); // Wait for reload
        }
      }
      throw err;
    }
  });
}

// Public Pages (lazy)
const Landing = lazyWithRetry(() => import('./pages/Landing'));
const Contact = lazyWithRetry(() => import('./pages/Contact'));
const Support = lazyWithRetry(() => import('./pages/Support'));

// Team Pages (lazy)
const Login = lazyWithRetry(() => import('./pages/Login'));
const Home = lazyWithRetry(() => import('./pages/Home'));
const Activities = lazyWithRetry(() => import('./pages/Activities'));
const Program = lazyWithRetry(() => import('./pages/Program'));
const UploadReport = lazyWithRetry(() => import('./pages/UploadReport'));
const News = lazyWithRetry(() => import('./pages/News'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const CompetitionEntry = lazyWithRetry(() => import('./pages/CompetitionEntry'));
const CompetitionPlay = lazyWithRetry(() => import('./pages/CompetitionPlay'));
const GuessTheNumber = lazyWithRetry(() => import('./pages/activities/GuessTheNumber'));
const EasterEgg = lazyWithRetry(() => import('./pages/activities/EasterEgg'));

// Judge Pages (lazy)
const JudgeLogin = lazyWithRetry(() => import('./pages/judge/JudgeLogin'));
const PasscodeGate = lazyWithRetry(() => import('./pages/judge/PasscodeGate'));
const JudgingSheet = lazyWithRetry(() => import('./pages/judge/JudgingSheet'));

// Admin Pages (lazy)
const AdminLogin = lazyWithRetry(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/Dashboard'));
const AdminCompetitions = lazyWithRetry(() => import('./pages/admin/Competitions'));
const AdminNews = lazyWithRetry(() => import('./pages/admin/News'));
const AdminTeams = lazyWithRetry(() => import('./pages/admin/Teams'));
const AdminJudges = lazyWithRetry(() => import('./pages/admin/AdminJudges'));
const AdminScoring = lazyWithRetry(() => import('./pages/admin/AdminScoring'));
const AdminReports = lazyWithRetry(() => import('./pages/admin/AdminReports'));
const AdminAgenda = lazyWithRetry(() => import('./pages/admin/Agenda'));
const AdminStressTest = lazyWithRetry(() => import('./pages/admin/StressTest'));
const AdminActivitySetup = lazyWithRetry(() => import('./pages/admin/ActivitySetup'));
const AdminLeaderboard = lazyWithRetry(() => import('./pages/admin/Leaderboard'));
const AdminAiStudio = lazyWithRetry(() => import('./pages/admin/AiStudio'));
const AiStudio = lazyWithRetry(() => import('./pages/AiStudio'));

import { TopHeader } from './components/TopHeader';
import { ScoutMascotToy } from './components/ScoutMascotToy';
import { ScoutCampfireScene } from './components/ScoutCampfireScene';
import CompetitionNotice from './components/CompetitionNotice';

const App = memo(function App() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  let defaultRoute = '/';
  if (user) {
    if (user.role === 'admin') defaultRoute = '/admin/dashboard';
    else if (user.role === 'judge') defaultRoute = '/judge/passcode';
    else defaultRoute = '/home';
  }

  return (
    <div dir="rtl" className={`app-shell min-h-screen ${isAdminRoute ? 'admin-shell' : ''}`}>
      <TopHeader />
      {!isAdminRoute && <CompetitionNotice />}
      {!isAdminRoute && <ScoutCampfireScene />}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to={defaultRoute} replace /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/judge/login" element={<JudgeLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Support />} />

          {/* Team Routes */}
          <Route path="/home" element={<ProtectedRoute allowedRoles={['team']}><Home /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute allowedRoles={['team']}><Activities /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute allowedRoles={['team']}><Activities /></ProtectedRoute>} />
          <Route path="/program" element={<ProtectedRoute allowedRoles={['team']}><Program /></ProtectedRoute>} />
          <Route path="/upload-report" element={<ProtectedRoute allowedRoles={['team']}><UploadReport /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute allowedRoles={['team']}><News /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['team']}><Profile /></ProtectedRoute>} />
          <Route path="/ai-studio" element={<ProtectedRoute allowedRoles={['team', 'admin']}><AiStudio /></ProtectedRoute>} />
          <Route path="/activities/ai-studio" element={<ProtectedRoute allowedRoles={['team', 'admin']}><AiStudio /></ProtectedRoute>} />

          {/* Competition Entry and Play */}
          <Route path="/competition-entry/:slug" element={<ProtectedRoute allowedRoles={['team']}><CompetitionEntry /></ProtectedRoute>} />
          <Route path="/competition/:slug" element={<ProtectedRoute allowedRoles={['team']}><CompetitionPlay /></ProtectedRoute>} />
          <Route path="/activities/guess-number" element={<ProtectedRoute allowedRoles={['team']}><GuessTheNumber /></ProtectedRoute>} />
          <Route path="/activities/easter-egg" element={<ProtectedRoute allowedRoles={['team']}><EasterEgg /></ProtectedRoute>} />

          {/* Judge Routes */}
          <Route path="/judge" element={<Navigate to="/judge/passcode" replace />} />
          <Route path="/judge/passcode" element={<ProtectedRoute allowedRoles={['judge']}><PasscodeGate /></ProtectedRoute>} />
          <Route path="/judge/sheet" element={<ProtectedRoute allowedRoles={['judge']}><JudgingSheet /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/competitions" element={<ProtectedRoute allowedRoles={['admin']}><AdminCompetitions /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute allowedRoles={['admin']}><AdminNews /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute allowedRoles={['admin']}><AdminTeams /></ProtectedRoute>} />
          <Route path="/admin/judges" element={<ProtectedRoute allowedRoles={['admin']}><AdminJudges /></ProtectedRoute>} />
          <Route path="/admin/scoring" element={<ProtectedRoute allowedRoles={['admin']}><AdminScoring /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/agenda" element={<ProtectedRoute allowedRoles={['admin']}><AdminAgenda /></ProtectedRoute>} />
          <Route path="/admin/stress-test" element={<ProtectedRoute allowedRoles={['admin']}><AdminStressTest /></ProtectedRoute>} />
          <Route path="/admin/activities" element={<ProtectedRoute allowedRoles={['admin']}><AdminActivitySetup /></ProtectedRoute>} />
          <Route path="/admin/leaderboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminLeaderboard /></ProtectedRoute>} />
          <Route path="/admin/ai-studio" element={<ProtectedRoute allowedRoles={['admin']}><AdminAiStudio /></ProtectedRoute>} />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Suspense>
      {!isAdminRoute && <ScoutMascotToy />}
      <Navbar />
    </div>
  );
});

export default App;
