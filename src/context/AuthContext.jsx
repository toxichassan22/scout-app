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
          console.error('[Auth] Token verification failed:', err);
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Listen for real-time team deletion event from admin -> instant force logout on mobile
  useEffect(() => {
    if (!socket || !user) return;

    const handleTeamDeleted = (data) => {
      if (user.role === 'team' && (data.teamId === user.id || data.teamId === user.username)) {
        console.warn('[Auth] Current team was deleted by admin. Executing instant logout...');
        setAuthToken(null);
        setUser(null);
        localStorage.removeItem('dsc_token');
        localStorage.removeItem('dsc_auth_user');
        window.location.href = '/login?deleted=1';
      }
    };

    socket.on('team:deleted', handleTeamDeleted);
    return () => {
      socket.off('team:deleted', handleTeamDeleted);
    };
  }, [socket, user]);

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
