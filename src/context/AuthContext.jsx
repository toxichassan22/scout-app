import { createContext, useContext, useEffect, useState } from 'react';
import { 
  loginTeam as apiLoginTeam, 
  loginJudge as apiLoginJudge, 
  loginAdmin as apiLoginAdmin,
  getCurrentUser,
  setAuthToken,
  getAuthToken
} from '../services/api';
import { useSocket } from './SocketContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  // Initialize user from stored token on load
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const res = await getCurrentUser();
          setUser(res.user);
        } catch (err) {
          if (err.isNetworkError) {
            setLoading(false);
            return;
          }
          console.error('[Auth] Token verification failed:', err);
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Join team room on socket connect so revocation events are received
  useEffect(() => {
    if (!socket || !user) return;
    if (user.role === 'team') {
      socket.emit('join:room', `team:${user.id}`);
    }
    if (user.role === 'admin') {
      socket.emit('join:room', 'admin');
    }
  }, [socket, user]);

  // Force logout helper — clears auth state and redirects
  const forceLogout = (reason) => {
    console.warn(`[Auth] Force logout: ${reason}`);
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('dsc_token');
    localStorage.removeItem('dsc_auth_user');
    window.location.href = `/login?revoked=1`;
  };

  // Listen for real-time team deletion / device revocation events via Socket.IO
  useEffect(() => {
    if (!socket || !user) return;

    const handleTeamDeleted = (data) => {
      if (user.role === 'team' && (data.teamId === user.id || data.teamId === user.username)) {
        forceLogout('team deleted by admin');
      }
    };

    const handleDeviceRevoked = (data) => {
      const myDeviceId = localStorage.getItem('dsc_device_id');
      if (user.role === 'team' && myDeviceId) {
        if (data.fingerprint === myDeviceId || data.teamId === user.id) {
          forceLogout('device revoked by admin');
        }
      }
    };

    socket.on('team:deleted', handleTeamDeleted);
    socket.on('device:revoked', handleDeviceRevoked);
    return () => {
      socket.off('team:deleted', handleTeamDeleted);
      socket.off('device:revoked', handleDeviceRevoked);
    };
  }, [socket, user]);

  // Fallback heartbeat: poll /api/auth/me every 30s to verify device is still registered.
  // Also checks on visibility change (user returns to tab) for instant detection.
  useEffect(() => {
    if (!user || user.role !== 'team') return;

    let consecutiveFailures = 0;

    const verifyDevice = async () => {
      try {
        await getCurrentUser();
        consecutiveFailures = 0;
      } catch (err) {
        if (err.isNetworkError) {
          consecutiveFailures++;
          return;
        }
        if (err.deviceRevoked) {
          forceLogout('device revoked (detected by heartbeat)');
          return;
        }
        if (err.status === 401 || err.forceLogout) {
          consecutiveFailures++;
          if (consecutiveFailures >= 3) {
            forceLogout('token expired (3 consecutive failures)');
          }
          return;
        }
        consecutiveFailures++;
      }
    };

    const interval = setInterval(verifyDevice, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        verifyDevice();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [user]);

  // Team login with username and password
  const loginTeam = async (username, password) => {
    try {
      const res = await apiLoginTeam(username, password);
      setAuthToken(res.token);
      setUser(res.user);
      return { ok: true, user: res.user };
    } catch (err) {
      return { ok: false, message: err.message || 'فشل تسجيل الدخول' };
    }
  };

  // Judge login with username and password
  const loginJudge = async (username, password) => {
    try {
      const res = await apiLoginJudge(username, password);
      setAuthToken(res.token);
      setUser(res.user);
      return { ok: true, user: res.user };
    } catch (err) {
      return { ok: false, message: err.message || 'فشل تسجيل دخول المحكم' };
    }
  };

  // Admin login with username and password
  const loginAdmin = async (username, password) => {
    try {
      const res = await apiLoginAdmin(username, password);
      setAuthToken(res.token);
      setUser(res.user);
      return { ok: true, user: res.user };
    } catch (err) {
      return { ok: false, message: err.message || 'فشل تسجيل دخول الأدمن' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      loginTeam,
      loginJudge,
      loginAdmin,
      logout,
      isAdmin: user?.role === 'admin',
      isJudge: user?.role === 'judge',
      isTeam: user?.role === 'team'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
