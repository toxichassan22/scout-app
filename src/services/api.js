const API_URL = import.meta.env.VITE_API_URL || '/api';

export const getAuthToken = () => {
  return localStorage.getItem('dsc_token');
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('dsc_token', token);
  } else {
    localStorage.removeItem('dsc_token');
  }
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'حدث خطأ في الاتصال بالسيرفر');
  }

  return data;
};

// Auth API calls
export const loginTeam = (username, password) => 
  apiFetch('/auth/team/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const loginJudge = (username, password) => 
  apiFetch('/auth/judge/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const loginAdmin = (username, password) => 
  apiFetch('/auth/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getCurrentUser = () => 
  apiFetch('/auth/me');

// Public/Team Data
export const getLeaderboard = () => 
  apiFetch('/leaderboard');

export const getNews = () => 
  apiFetch('/news');

export const getAgenda = () => 
  apiFetch('/agenda');

// Judge API calls
export const unlockJudgeSession = (passcode) => 
  apiFetch('/judge/unlock', { method: 'POST', body: JSON.stringify({ passcode }) });

export const getJudgeTeams = (competitionId) => 
  apiFetch(`/judge/teams/${competitionId}`);

export const submitJudgeScore = (data) => 
  apiFetch('/judge/scores', { method: 'POST', body: JSON.stringify(data) });

// Admin API calls
export const getAdminLeaderboard = () => 
  apiFetch('/admin/leaderboard');

export const getAdminTeams = () => 
  apiFetch('/admin/teams');

export const createTeam = (data) => 
  apiFetch('/admin/teams', { method: 'POST', body: JSON.stringify(data) });

export const importTeams = (teams) => 
  apiFetch('/admin/teams/import', { method: 'POST', body: JSON.stringify({ teams }) });

export const deleteTeam = (id) => 
  apiFetch(`/admin/teams/${id}`, { method: 'DELETE' });

export const getAdminJudges = () => 
  apiFetch('/admin/judges');

export const createJudge = (data) => 
  apiFetch('/admin/judges', { method: 'POST', body: JSON.stringify(data) });

export const deleteJudge = (id) => 
  apiFetch(`/admin/judges/${id}`, { method: 'DELETE' });

export const getAdminCompetitions = () => 
  apiFetch('/admin/competitions');

export const createCompetition = (data) => 
  apiFetch('/admin/competitions', { method: 'POST', body: JSON.stringify(data) });

export const updateCompetition = (id, data) => 
  apiFetch(`/admin/competitions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const generateCompetitionPasscode = (id) => 
  apiFetch(`/admin/competitions/${id}/passcode`, { method: 'POST' });

export const createQuestion = (data) => 
  apiFetch('/admin/questions', { method: 'POST', body: JSON.stringify(data) });

export const deleteQuestion = (id) => 
  apiFetch(`/admin/questions/${id}`, { method: 'DELETE' });

export const updateScoreOverride = (id, total) => 
  apiFetch(`/admin/scores/${id}`, { method: 'PATCH', body: JSON.stringify({ total }) });

export const publishNews = (data) => 
  apiFetch('/admin/news', { method: 'POST', body: JSON.stringify(data) });

export const deleteNews = (id) => 
  apiFetch(`/admin/news/${id}`, { method: 'DELETE' });

export const addAgendaItem = (data) => 
  apiFetch('/admin/agenda', { method: 'POST', body: JSON.stringify(data) });

export const deleteAgendaItem = (id) => 
  apiFetch(`/admin/agenda/${id}`, { method: 'DELETE' });

export const updateAgendaItem = (id, data) => 
  apiFetch(`/admin/agenda/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const getAdminReports = () => 
  apiFetch('/admin/reports');
