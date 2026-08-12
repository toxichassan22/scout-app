const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const readResponseData = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

// ─── Server Health Tracker ───
let serverDown = false;
let serverDownCallbacks = [];
const SERVER_CHECK_INTERVAL = 5000;

export const isServerDown = () => serverDown;

const markServerDown = () => {
  if (!serverDown) {
    serverDown = true;
    window.dispatchEvent(new Event('server:down'));
  }
};

const markServerUp = () => {
  if (serverDown) {
    serverDown = false;
    window.dispatchEvent(new Event('server:up'));
  }
};

// Background server health checker
const checkServerHealth = async () => {
  if (!serverDown) return;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (res.ok || res.status === 401) {
      markServerUp();
    }
  } catch {
    // still down
  }
};

setInterval(checkServerHealth, SERVER_CHECK_INTERVAL);

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

// ─── Device ID Management ───
const DEVICE_ID_KEY = 'dsc_device_id';

export const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    // Generate a persistent unique fingerprint for this browser/device
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}_${navigator.userAgent.length}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
};

export const apiFetch = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  const method = String(options.method || 'GET').toUpperCase();
  const idempotencyKey = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    ? (options.headers?.['Idempotency-Key'] || globalThis.crypto?.randomUUID?.())
    : null;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    ...options.headers
  };

  const isAuthEndpoint = endpoint.includes('/auth/');
  const isAiEndpoint = endpoint.startsWith('/ai/');
  const noRetry = Boolean(options.noRetry) || isAiEndpoint;
  const fetchOptions = { ...options };
  delete fetchOptions.noRetry;
  const maxAttempts = isAuthEndpoint || noRetry ? 1 : 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchOptions,
        headers
      });
      markServerUp();
    } catch (networkErr) {
      markServerDown();
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      const err = new Error('السيرفر غير متاح حالياً');
      err.isNetworkError = true;
      throw err;
    }

    const data = await readResponseData(response);

    if (response.status === 429) {
      const err = new Error(data.error || 'طلبات كثيرة؛ حاول مرة أخرى لاحقاً');
      err.status = 429;
      err.code = data.code;
      err.requestId = data.requestId;
      err.retryAfter = Number(response.headers.get('Retry-After')) || undefined;
      throw err;
    }

    if (response.status === 401 || data.forceLogout) {
      const isDeviceRevoked = !!data.deviceRevoked;
      if (isDeviceRevoked) {
        localStorage.removeItem('dsc_token');
        localStorage.removeItem('dsc_auth_user');
        window.location.href = '/login?revoked=1';
        const err = new Error(data.error || 'تم إلغاء اعتماد هذا الجهاز');
        err.deviceRevoked = true;
        throw err;
      }
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      const err = new Error(data.error || 'جلسة الدخول غير صالحة');
      err.status = 401;
      err.code = data.code;
      err.requestId = data.requestId;
      err.forceLogout = !!data.forceLogout;
      throw err;
    }

    if (!response.ok) {
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, retryDelay));
        continue;
      }
      const err = new Error(data.error || 'حدث خطأ في الاتصال بالسيرفر');
      err.status = response.status;
      err.code = data.code;
      err.requestId = data.requestId;
      throw err;
    }

    return data;
  }
};

// Auth API calls
export const loginTeam = (username, password) => {
  const deviceId = getOrCreateDeviceId();
  const userAgent = navigator.userAgent;
  return apiFetch('/auth/team/login', { method: 'POST', body: JSON.stringify({ username, password, deviceId, userAgent }) });
};

export const loginJudge = (username, password) =>
  apiFetch('/auth/judge/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const loginAdmin = (username, password) =>
  apiFetch('/auth/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });

export const getCurrentUser = () =>
  apiFetch('/auth/me');

// Public/Team Data
export const getLeaderboard = async () => unwrapList(await apiFetch('/leaderboard'));

export const getNews = async () => unwrapList(await apiFetch('/news'));

// The program screen is a complete daily schedule; request the full page rather than
// the generic API default of 20 items.
export const getAgenda = () =>
  apiFetch('/agenda?limit=100');

export const unwrapList = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);

export const scanCompetition = (idOrSlug, qrCode) =>
  apiFetch(`/competitions/${encodeURIComponent(idOrSlug)}/scan`, { method: 'POST', body: JSON.stringify({ qrCode }) });

export const getCompetitionPlay = (idOrSlug) =>
  apiFetch(`/competitions/${encodeURIComponent(idOrSlug)}/play`);

export const getActivities = () => apiFetch('/activities');
export const getActivityWallet = () => apiFetch('/activities/wallet');
export const getActivityShop = () => apiFetch('/activities/shop');
export const getActivityLeaderboard = (slug) => apiFetch(`/activities/${encodeURIComponent(slug)}/leaderboard`);
export const createActivitySession = (slug, data = {}) => apiFetch(`/activities/${encodeURIComponent(slug)}/sessions`, { method: 'POST', body: JSON.stringify(data) });
export const getActivitySession = (sessionId) => apiFetch(`/activities/sessions/${sessionId}`);
export const createActivityInvite = (sessionId) => apiFetch(`/activities/sessions/${sessionId}/invite`, { method: 'POST' });
export const startActivitySession = (sessionId) => apiFetch(`/activities/sessions/${sessionId}/start`, { method: 'POST' });
export const finishActivitySession = (sessionId, score, metadata) => apiFetch(`/activities/sessions/${sessionId}/finish`, { method: 'POST', body: JSON.stringify({ score, metadata }) });
export const setGuessSecret = (sessionId, secretCode) => apiFetch(`/activities/sessions/${sessionId}/secret`, { method: 'POST', body: JSON.stringify({ secretCode }) });
export const heartbeatActivitySession = (sessionId) => apiFetch(`/activities/sessions/${sessionId}/heartbeat`, { method: 'POST' });
export const submitGuess = (sessionId, guessCode) => apiFetch(`/activities/sessions/${sessionId}/guess`, { method: 'POST', body: JSON.stringify({ guessCode }) });
export const submitHackerAnswer = (sessionId, challenge, selectedIndex) => apiFetch(`/activities/sessions/${sessionId}/hacker-answer`, { method: 'POST', body: JSON.stringify({ challenge, selectedIndex }) });
export const getColorRound = (sessionId, round, value = {}) => apiFetch(`/activities/sessions/${sessionId}/color-round`, { method: 'POST', body: JSON.stringify({ round, ...value }) });
export const purchaseShopItem = (itemId, quantity = 1) => apiFetch(`/activities/shop/${itemId}/purchase`, { method: 'POST', body: JSON.stringify({ quantity }) });

export const getLeaderboardVisibility = () => apiFetch('/admin/leaderboard/reveal');

export const setLeaderboardVisibility = (visible) =>
  apiFetch('/admin/leaderboard/reveal', { method: 'POST', body: JSON.stringify({ visible }) });

// Who is using this device: their own name and scouting role.
export const SCOUT_ROLES = ['كشاف', 'مرشدة', 'جوال', 'جوالة', 'قائد/ة'];

export const updateOwnDeviceIdentity = (displayName, role) =>
  apiFetch('/auth/device-identity', { method: 'PATCH', body: JSON.stringify({ displayName, role }) });

// Provider calls are rate-limited and not safe to blindly retry; one user click must
// produce at most one provider request.
export const sendAiMessage = (messages) => apiFetch('/ai/chat', { method: 'POST', noRetry: true, body: JSON.stringify({ messages }) });

// Judge API calls
export const unlockJudgeSession = (passcode) =>
  apiFetch('/judge/unlock', { method: 'POST', body: JSON.stringify({ passcode }) });

export const getJudgeTeams = async (competitionId) => unwrapList(await apiFetch(`/judge/teams/${competitionId}`));

export const submitJudgeScore = (data) =>
  apiFetch('/judge/scores', { method: 'POST', body: JSON.stringify(data) });

// Report files are never served statically; they must go through the authorised download route.
export const fetchReportFile = async (reportId) => {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}/reports/${reportId}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('تعذر تحميل ملف التقرير');
  return res.blob();
};

// Admin API calls
export const getAdminLeaderboard = () =>
  apiFetch('/admin/leaderboard');

export const getAdminTeams = async () => unwrapList(await apiFetch('/admin/teams'));

export const createTeam = (teamData) =>
  apiFetch('/admin/teams', { method: 'POST', body: JSON.stringify(teamData) });

export const updateTeam = (id, teamData) =>
  apiFetch(`/admin/teams/${id}`, { method: 'PATCH', body: JSON.stringify(teamData) });

export const updateTeamDeviceLimit = (teamId, maxDevices) =>
  apiFetch(`/admin/teams/${teamId}/device-limit`, { method: 'PATCH', body: JSON.stringify({ maxDevices }) });

export const importTeams = (teams) =>
  apiFetch('/admin/teams/import', { method: 'POST', body: JSON.stringify({ teams }) });

export const deleteTeam = (id) =>
  apiFetch(`/admin/teams/${id}`, { method: 'DELETE' });

export const getTeamMembers = async (teamId) => unwrapList(await apiFetch(`/admin/teams/${teamId}/members`));

export const addTeamMember = (teamId, memberData) =>
  apiFetch(`/admin/teams/${teamId}/members`, { method: 'POST', body: JSON.stringify(memberData) });

export const deleteTeamMember = (memberId) =>
  apiFetch(`/admin/members/${memberId}`, { method: 'DELETE' });

// Team Devices API
export const getTeamDevices = async (teamId) => unwrapList(await apiFetch(`/admin/teams/${teamId}/devices`));

export const revokeTeamDevice = (deviceId) =>
  apiFetch(`/admin/devices/${deviceId}`, { method: 'DELETE' });

export const getAdminJudges = async () => unwrapList(await apiFetch('/admin/judges'));

export const createJudge = (data) =>
  apiFetch('/admin/judges', { method: 'POST', body: JSON.stringify(data) });

export const updateJudge = (id, data) =>
  apiFetch(`/admin/judges/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteJudge = (id) =>
  apiFetch(`/admin/judges/${id}`, { method: 'DELETE' });

export const getJudgeAssignments = async (judgeId) => unwrapList(await apiFetch(`/admin/judges/${judgeId}/assignments`));

export const assignJudgeCompetition = (judgeId, competitionId) =>
  apiFetch(`/admin/judges/${judgeId}/assignments`, { method: 'POST', body: JSON.stringify({ competitionId }) });

export const unassignJudgeCompetition = (judgeId, competitionId) =>
  apiFetch(`/admin/judges/${judgeId}/assignments/${competitionId}`, { method: 'DELETE' });

export const getCompetitions = async () => unwrapList(await apiFetch('/competitions'));

export const getAdminCompetitions = async () => unwrapList(await apiFetch('/admin/competitions?limit=100'));

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

export const getScoreBreakdown = async () => unwrapList(await apiFetch('/admin/scores/breakdown'));

export const unlockScore = (id, reason) =>
  apiFetch(`/admin/scores/${id}/unlock`, { method: 'POST', body: JSON.stringify({ reason }) });

export const lockScore = (id) =>
  apiFetch(`/admin/scores/${id}/lock`, { method: 'POST' });

export const updateScoreOverride = (id, data) =>
  apiFetch(`/admin/scores/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const publishNews = (data) =>
  apiFetch('/admin/news', { method: 'POST', body: JSON.stringify(data) });

export const updateNews = (id, data) =>
  apiFetch(`/admin/news/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteNews = (id) =>
  apiFetch(`/admin/news/${id}`, { method: 'DELETE' });

export const addAgendaItem = (data) =>
  apiFetch('/admin/agenda', { method: 'POST', body: JSON.stringify(data) });

export const deleteAgendaItem = (id) =>
  apiFetch(`/admin/agenda/${id}`, { method: 'DELETE' });

export const updateAgendaItem = (id, data) =>
  apiFetch(`/admin/agenda/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const agendaAction = (id, action) =>
  apiFetch(`/admin/agenda/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) });

export const getAdminReports = async () => unwrapList(await apiFetch('/admin/reports'));

export const deleteAdminReport = (id) =>
  apiFetch(`/admin/reports/${id}`, { method: 'DELETE' });

export const getReportPermissions = async () => unwrapList(await apiFetch('/admin/report-permissions'));

export const updateReportPermission = (teamId, competitionId, data) =>
  apiFetch(`/admin/report-permissions/${teamId}/${competitionId}`, { method: 'PATCH', body: JSON.stringify(data) });

export const getMyReportPermissions = () =>
  apiFetch('/reports/permissions');

export const getMyReports = async () => unwrapList(await apiFetch('/reports/mine'));

export const uploadTeamReport = (data) =>
  apiFetch('/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const resubmitTeamReport = (id, data) =>
  apiFetch(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

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

export const triggerGithubBackup = () => apiFetch('/admin/backup/github', { method: 'POST' });
