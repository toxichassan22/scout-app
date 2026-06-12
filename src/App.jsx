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
const TwoTruths = lazy(() => import('./pages/competitions/TwoTruths'));
const Genius = lazy(() => import('./pages/competitions/Genius'));
const Geography = lazy(() => import('./pages/competitions/Geography'));
const VideoDesign = lazy(() => import('./pages/competitions/VideoDesign'));

// Admin Pages (lazy)
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminCompetitions = lazy(() => import('./pages/admin/Competitions'));
const AdminNews = lazy(() => import('./pages/admin/News'));
const AdminTeams = lazy(() => import('./pages/admin/Teams'));
const AdminGeography = lazy(() => import('./pages/admin/Geography'));
const AdminVideoJudging = lazy(() => import('./pages/admin/VideoJudging'));
const AdminQuestions = lazy(() => import('./pages/admin/Questions'));
const AdminStressTest = lazy(() => import('./pages/admin/StressTest'));

const App = memo(function App() {
  const { user } = useAuth();
  const defaultRoute = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'team' ? '/home' : '/';
  const isAdmin = user?.role === 'admin';

  return (
    <div dir="rtl" className="app-shell">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/support" element={<Contact />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Team Routes */}
          <Route path="/home" element={<ProtectedRoute role="team"><Home /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute role="team"><Activities /></ProtectedRoute>} />
          <Route path="/activities" element={<ProtectedRoute role="team"><Activities /></ProtectedRoute>} />
          <Route path="/program" element={<ProtectedRoute role="team"><Program /></ProtectedRoute>} />
          <Route path="/upload-report" element={<ProtectedRoute role="team"><UploadReport /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute role="team"><News /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute role="team"><Profile /></ProtectedRoute>} />

          {/* Competition Detail Routes */}
          <Route path="/competition/1" element={<ProtectedRoute role="team"><TwoTruths /></ProtectedRoute>} />
          <Route path="/competition/2" element={<ProtectedRoute role="team"><Genius /></ProtectedRoute>} />
          <Route path="/competition/3" element={<ProtectedRoute role="team"><Geography /></ProtectedRoute>} />
          <Route path="/competition/4" element={<ProtectedRoute role="team"><VideoDesign /></ProtectedRoute>} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/competitions" element={<ProtectedRoute role="admin"><AdminCompetitions /></ProtectedRoute>} />
          <Route path="/admin/news" element={<ProtectedRoute role="admin"><AdminNews /></ProtectedRoute>} />
          <Route path="/admin/teams" element={<ProtectedRoute role="admin"><AdminTeams /></ProtectedRoute>} />
          <Route path="/admin/geography" element={<ProtectedRoute role="admin"><AdminGeography /></ProtectedRoute>} />
          <Route path="/admin/video-judging" element={<ProtectedRoute role="admin"><AdminVideoJudging /></ProtectedRoute>} />
          <Route path="/admin/questions" element={<ProtectedRoute role="admin"><AdminQuestions /></ProtectedRoute>} />
          <Route path="/admin/stress-test" element={<ProtectedRoute role="admin"><AdminStressTest /></ProtectedRoute>} />

          {/* Default Redirect */}
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Suspense>
      <Navbar />
    </div>
  );
});

export default App;
