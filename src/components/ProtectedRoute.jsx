import { memo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DeviceIdentityGate from './DeviceIdentityGate';
import TeamLogoUploadModal from './TeamLogoUploadModal';
import WaitingForLeaderGate from './WaitingForLeaderGate';

export const ProtectedRoute = memo(function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, needsDeviceIdentity, needsTeamLogo, waitingForLeader, setTeamLogo } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white dir-rtl">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }
    if (location.pathname.startsWith('/judge')) {
      return <Navigate to="/judge/login" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect if role is not authorized for this route
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'judge') return <Navigate to="/judge" replace />;
    return <Navigate to="/" replace />;
  }

  // A shared team account says nothing about who is holding the phone. Ask before any
  // team screen is reachable, rather than leaving devices anonymous in the admin list.
  if (needsDeviceIdentity) return <DeviceIdentityGate />;
  if (needsTeamLogo) {
    return <TeamLogoUploadModal isOpen required onSuccess={(logoUrl) => setTeamLogo(logoUrl)} />;
  }
  if (waitingForLeader) return <WaitingForLeaderGate />;

  return children;
});
