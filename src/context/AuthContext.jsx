import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ADMIN_CREDENTIALS, MOCK_TEAMS, STORAGE_KEYS } from '../data/mockData';

const AuthContext = createContext(null);
const MAX_TEAM_LOGINS = 12;

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const unique = (items) => Array.from(new Set(items.map((item) => String(item).trim()).filter(Boolean)));

const readStoredTeams = () => {
  const currentTeams = readJson(STORAGE_KEYS.teams, []);
  const legacyTeams = readJson('teams_list', []);
  return unique([...MOCK_TEAMS, ...legacyTeams, ...currentTeams]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = readJson(STORAGE_KEYS.authUser, null);
    if (stored) return stored;
    return { name: 'الفريق الأول', role: 'team', teamName: 'الفريق الأول' };
  });
  const [teams, setTeams] = useState(() => readStoredTeams());
  const [teamLogins, setTeamLogins] = useState(() => readJson(STORAGE_KEYS.teamLogins, []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.teams, JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEYS.teams || event.key === 'teams_list') {
        setTeams(readStoredTeams());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.teamLogins, JSON.stringify(teamLogins));
  }, [teamLogins]);

  const loginTeam = (rawTeamName) => {
    const teamName = rawTeamName.trim();
    const latestTeams = readStoredTeams();
    setTeams(latestTeams);
    if (!latestTeams.includes(teamName)) {
      return { ok: false, message: 'يرجى التواصل مع الأدمن' };
    }

    const existing = teamLogins.filter((entry) => entry.teamName === teamName);
    if (existing.length >= MAX_TEAM_LOGINS) {
      return { ok: false, message: 'تم الوصول للحد الأقصى لأعضاء هذا الفريق' };
    }

    const loginRecord = { teamName, loginTime: new Date().toISOString() };
    const userData = { teamName, name: teamName, role: 'team', loginTime: loginRecord.loginTime };
    setTeamLogins((prev) => [loginRecord, ...prev]);
    setUser(userData);
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(userData));
    return { ok: true };
  };

  const loginAdmin = (username, password) => {
    if (username.trim() !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return false;
    }
    const userData = { name: 'الأدمن', role: 'admin', loginTime: new Date().toISOString() };
    setUser(userData);
    localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.authUser);
  };

  const addTeam = (teamName) => {
    const trimmed = teamName.trim();
    const latestTeams = readStoredTeams();
    if (!trimmed || latestTeams.includes(trimmed)) return false;
    setTeams(unique([...latestTeams, trimmed]));
    return true;
  };

  const updateTeam = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || (trimmed !== oldName && teams.includes(trimmed))) return false;
    setTeams((prev) => prev.map((team) => (team === oldName ? trimmed : team)));
    setTeamLogins((prev) => prev.map((entry) => (entry.teamName === oldName ? { ...entry, teamName: trimmed } : entry)));
    return true;
  };

  const deleteTeam = (teamName) => {
    setTeams((prev) => prev.filter((team) => team !== teamName));
    setTeamLogins((prev) => prev.filter((entry) => entry.teamName !== teamName));
  };

  const getTeamLoginCount = (teamName) => teamLogins.filter((entry) => entry.teamName === teamName).length;

  const value = useMemo(
    () => ({
      user,
      teams,
      teamLogins,
      loginTeam,
      loginAdmin,
      logout,
      addTeam,
      updateTeam,
      deleteTeam,
      getTeamLoginCount,
      maxTeamLogins: MAX_TEAM_LOGINS,
    }),
    [user, teams, teamLogins],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
