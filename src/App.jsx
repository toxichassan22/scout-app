import { lazy, Suspense, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoadingFallback } from './components/LoadingFallback';

// Public Pages (lazy)
const Landing = lazy(() => import('./pages/Landing'));
const Contact = lazy(() => import('./pages/Contact'));

// Team Pages (lazy)
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const Activities = lazy(() => import('./pages/Activities'));
const Program = lazy(() => import('./pages/Program'));
const UploadReport = lazy(() => import('./pages/UploadReport'));
const News = lazy(() => import('./pages/News'));
const Profile = lazy(() => import('./pages/Profile'));
const CompetitionEntry = lazy(() => import('./pages/CompetitionEntry'));
const CompetitionPlay = lazy(() => import('./pages/CompetitionPlay'));
const GuessTheNumber = lazy(() => import('./pages/activities/GuessTheNumber'));
const HackerSandbox = lazy(() => import('./pages/activities/HackerSandbox'));
const AiChat = lazy(() => import('./pages/AiChat'));

// Judge Pages (lazy)
const JudgeLogin = lazy(() => import('./pages/judge/JudgeLogin'));
const PasscodeGate = lazy(() => import('./pages/judge/PasscodeGate'));
const JudgingSheet = lazy(() => import('./pages/judge/JudgingSheet'));

// Admin Pages (lazy)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions'));
const AdminNews = lazy(() => import('./pages/admin/News'));
const AdminTeams = lazy(() => import('./pages/admin/Teams'));
const AdminJudges = lazy(() => import('./pages/admin/AdminJudges'));
const AdminScoring = lazy(() => import('./pages/admin/AdminScoring'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminAgenda = lazy(() => import('./pages/admin/Agenda'));
const AdminStressTest = lazy(() => import('./pages/admin/StressTest'));

import { TopHeader } from './components/TopHeader';
import { ScoutMascotToy } from './components/ScoutMascotToy';
import { ScoutCampfireScene } from './components/ScoutCampfireScene';

const App = memo(function App() {
  const { user } = useAuth();

  let defaultRoute = '/';
  if (user) {
    if (user.role === 'admin') defaultRoute = '/admin/dashboard';
    else if (user.role === 'judge') defaultRoute = '/judge/passcode';
    else defaultRoute = '/home';
  }

  return (
    <div dir="rtl" className="app-shell min-h-screen">
      <TopHeader />
      <ScoutCampfireScene />
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <Navigate to={defaultRoute} replace /> : <Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/judge/login" element={<JudgeLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Contact />} />

          {/* Team Routes */}
          <Route path="/home" element={<ProtectedRoute allowedRoles={['team']}><Home /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute allowedRoles={['team']}><Activities /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute allowedRoles={['team']}><Activities /></ProtectedRoute>} />
          <Route path="/program" element={<ProtectedRoute allowedRoles={['team']}><Program /></ProtectedRoute>} />
          <Route path="/upload-report" element={<ProtectedRoute allowedRoles={['team']}><UploadReport /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute allowedRoles={['team']}><News /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['team']}><Profile /></ProtectedRoute>} />

          {/* Competition Entry and Play */}
          <Route path="/competition-entry/:slug" element={<ProtectedRoute allowedRoles={['team']}><CompetitionEntry /></ProtectedRoute>} />
          <Route path="/competition/:slug" element={<ProtectedRoute allowedRoles={['team']}><CompetitionPlay /></ProtectedRoute>} />
          <Route path="/activities/guess-number" element={<ProtectedRoute allowedRoles={['team']}><GuessTheNumber /></ProtectedRoute>} />
          <Route path="/activities/hacker-sandbox" element={<ProtectedRoute allowedRoles={['team']}><HackerSandbox /></ProtectedRoute>} />
          <Route path="/ai-chat" element={<ProtectedRoute allowedRoles={['team']}><AiChat /></ProtectedRoute>} />

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

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Suspense>
      <ScoutMascotToy />
      <Navbar />
    </div>
  );
});

export default App;
