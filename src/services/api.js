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

  if (response.status === 401 || data.forceLogout) {
    localStorage.removeItem('dsc_token');
    localStorage.removeItem('dsc_auth_user');
    if (endpoint.startsWith('/admin') && !endpoint.includes('/auth/admin/login')) {
      window.location.href = '/admin/login?expired=1';
    } else if (endpoint.startsWith('/judge')) {
      window.location.href = '/judge/login?expired=1';
    } else {
      window.location.href = '/login?expired=1';
    }
    throw new Error(data.error || 'جلسة الدخول غير صالحة أو تم حذف الحساب');
  }

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

export const createTeam = (teamData) => 
  apiFetch('/admin/teams', { method: 'POST', body: JSON.stringify(teamData) });

export const importTeams = (teams) => 
  apiFetch('/admin/teams/import', { method: 'POST', body: JSON.stringify({ teams }) });

export const deleteTeam = (id) => 
  apiFetch(`/admin/teams/${id}`, { method: 'DELETE' });

export const getTeamMembers = (teamId) =>
  apiFetch(`/admin/teams/${teamId}/members`);

export const addTeamMember = (teamId, memberData) =>
  apiFetch(`/admin/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(memberData) });

export const deleteTeamMember = (memberId) =>
  apiFetch(`/admin/members/${memberId}`, { method: 'DELETE' });

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

export const uploadTeamReport = (data) =>
  apiFetch('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Device ID Generator / Helper
export const getDeviceId = () => {
  let id = localStorage.getItem('dsc_device_id');
  if (!id) {
    id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('dsc_device_id', id);
  }
  return id;
};

// Quiz API calls
export const startQuizSession = (competitionId) => 
  apiFetch('/quiz/start', { 
    method: 'POST', 
    body: JSON.stringify({ competitionId, deviceId: getDeviceId() }) 
  });

export const saveQuizAnswer = (sessionId, questionId, selectedIndex) => 
  apiFetch('/quiz/save-answer', { 
    method: 'POST', 
    body: JSON.stringify({ sessionId, questionId, selectedIndex, deviceId: getDeviceId() }) 
  });

export const submitQuizSession = (sessionId) => 
  apiFetch('/quiz/submit', { 
    method: 'POST', 
    body: JSON.stringify({ sessionId, deviceId: getDeviceId() }) 
  });

export const triggerEmergencyFreeze = (frozen) => 
  apiFetch('/admin/emergency-freeze', { 
    method: 'POST', 
    body: JSON.stringify({ frozen }) 
  });

export const triggerCleanSlate = (confirmPassword) => 
  apiFetch('/admin/clean-slate', { 
    method: 'POST', 
    body: JSON.stringify({ confirmPassword }) 
  });

export const triggerGitDeploy = () => 
  apiFetch('/admin/deploy/git-pull', { method: 'POST' });
