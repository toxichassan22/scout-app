import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';

// Team Pages
import Login from './pages/Login';
import Home from './pages/Home';
import Competitions from './pages/Competitions';
import News from './pages/News';
import Profile from './pages/Profile';
import TwoTruths from './pages/competitions/TwoTruths';
import Genius from './pages/competitions/Genius';
import Geography from './pages/competitions/Geography';
import VideoDesign from './pages/competitions/VideoDesign';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCompetitions from './pages/admin/Competitions';
import AdminNews from './pages/admin/News';
import AdminTeams from './pages/admin/Teams';
import AdminGeography from './pages/admin/Geography';
import AdminVideoJudging from './pages/admin/VideoJudging';
import AdminQuestions from './pages/admin/Questions';
import AdminSettings from './pages/admin/Settings';

function App() {
  const { user } = useAuth();
  const defaultRoute = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'team' ? '/home' : '/login';

  return (
    <div dir="rtl" className={user?.role === 'admin' ? 'min-h-screen bg-slate-50' : 'app-shell'}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Team Routes */}
        <Route path="/home" element={<ProtectedRoute role="team"><Home /></ProtectedRoute>} />
        <Route path="/competitions" element={<ProtectedRoute role="team"><Competitions /></ProtectedRoute>} />
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
        <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

        {/* Default Redirect */}
        <Route path="*" element={<Navigate to={defaultRoute} replace />} />
      </Routes>
      <Navbar />
    </div>
  );
}

export default App;
