import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  GEOGRAPHY_COUNTRIES,
  INITIAL_NEWS,
  INITIAL_QUESTIONS,
  MOCK_COMPETITIONS,
  MOCK_TEAMS,
  STORAGE_KEYS,
} from '../data/mockData';
import { getDeviceId } from '../utils/security';

const CompetitionContext = createContext(null);

const readJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const COLAB_URL_KEY = 'dsc_colab_url';

const hasExpired = (competition, now = Date.now()) => {
  if (!competition.isOpen || !competition.duration || !competition.startTime) return false;
  return now >= new Date(competition.startTime).getTime() + competition.duration * 1000;
};

export const CompetitionProvider = ({ children }) => {
  const [competitions, setCompetitions] = useState(() => readJson(STORAGE_KEYS.competitions, MOCK_COMPETITIONS));
  const [submissions, setSubmissions] = useState(() => readJson(STORAGE_KEYS.submissions, []));
  const [deviceLocks, setDeviceLocks] = useState(() => readJson(STORAGE_KEYS.deviceLocks, []));
  const [news, setNews] = useState(() => readJson(STORAGE_KEYS.news, INITIAL_NEWS));
  const [geographyCountries, setGeographyCountries] = useState(() => readJson(STORAGE_KEYS.geography, GEOGRAPHY_COUNTRIES));
  const [questions, setQuestions] = useState(() => readJson(STORAGE_KEYS.questions, INITIAL_QUESTIONS));
  const [colabUrl, setColabUrl] = useState(() => localStorage.getItem(COLAB_URL_KEY) || '');
  const [delegations, setDelegations] = useState(() => readJson('dsc_delegations', []));
  const [scannedQRs, setScannedQRs] = useState(() => readJson('dsc_scanned_qrs', []));

  useEffect(() => persist(STORAGE_KEYS.competitions, competitions), [competitions]);
  useEffect(() => persist(STORAGE_KEYS.submissions, submissions), [submissions]);
  useEffect(() => persist(STORAGE_KEYS.deviceLocks, deviceLocks), [deviceLocks]);
  useEffect(() => persist(STORAGE_KEYS.news, news), [news]);
  useEffect(() => persist(STORAGE_KEYS.geography, geographyCountries), [geographyCountries]);
  useEffect(() => persist(STORAGE_KEYS.questions, questions), [questions]);
  useEffect(() => persist('dsc_delegations', delegations), [delegations]);
  useEffect(() => persist('dsc_scanned_qrs', scannedQRs), [scannedQRs]);
  useEffect(() => {
    if (colabUrl) localStorage.setItem(COLAB_URL_KEY, colabUrl);
  }, [colabUrl]);

  // Listen for colabUrl changes from other tabs (admin setting the URL)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === COLAB_URL_KEY) {
        setColabUrl(event.newValue || '');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const closeExpiredCompetitions = useCallback(() => {
    setCompetitions((prev) =>
      prev.map((competition) =>
        hasExpired(competition) ? { ...competition, isOpen: false, startTime: null } : competition,
      ),
    );
  }, []);

  useEffect(() => {
    closeExpiredCompetitions();
    const interval = window.setInterval(closeExpiredCompetitions, 1000);
    return () => window.clearInterval(interval);
  }, [closeExpiredCompetitions]);

  const getCompetition = (id) => competitions.find((competition) => competition.id === Number(id));

  const getRemainingSeconds = (competition) => {
    if (!competition?.duration) return null;
    if (!competition.isOpen || !competition.startTime) return competition.duration;
    const endTime = new Date(competition.startTime).getTime() + competition.duration * 1000;
    return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  };

  const openCompetition = (id) => {
    setCompetitions((prev) =>
      prev.map((competition) =>
        competition.id === Number(id)
          ? { ...competition, isOpen: true, startTime: new Date().toISOString() }
          : competition,
      ),
    );
  };

  const closeCompetition = (id) => {
    setCompetitions((prev) =>
      prev.map((competition) =>
        competition.id === Number(id) ? { ...competition, isOpen: false, startTime: null } : competition,
      ),
    );
  };

  const updateCompetition = (id, changes) => {
    setCompetitions((prev) =>
      prev.map((competition) => (competition.id === Number(id) ? { ...competition, ...changes } : competition)),
    );
  };

  const isCompleted = (compId, teamName) =>
    submissions.some((submission) => submission.compId === Number(compId) && submission.teamName === teamName && submission.final !== false);

  const getTeamSubmission = (compId, teamName) =>
    submissions.find((submission) => submission.compId === Number(compId) && submission.teamName === teamName && submission.final !== false);

  const getVideoAttempts = (teamName) =>
    submissions.filter((submission) => submission.compId === 4 && submission.teamName === teamName);

  const validateCompetitionEntry = (compId, teamName, qrCode) => {
    const competition = getCompetition(compId);
    const deviceId = getDeviceId();
    if (!competition) return { ok: false, message: 'المسابقة غير موجودة' };
    if (!competition.isOpen || hasExpired(competition)) return { ok: false, message: 'المسابقة مغلقة حالياً' };
    // QR Code check temporarily disabled for testing
    // if (qrCode && qrCode !== competition.qrCode) return { ok: false, message: 'الكود غير متوافق مع هذه المسابقة' };
    if (competition.id !== 4 && isCompleted(competition.id, teamName)) return { ok: false, message: 'تم تسجيل إجابتك' };

    // Device lock temporarily disabled for testing
    // const lock = deviceLocks.find((entry) => entry.compId === competition.id && entry.teamName === teamName);
    // if (lock && lock.deviceId !== deviceId) {
    //   return { ok: false, message: 'تم تسجيل جهاز آخر لفريقك في هذه المسابقة' };
    // }
    return { ok: true, competition };
  };

  const registerCompetitionEntry = (compId, teamName) => {
    const competition = getCompetition(compId);
    const deviceId = getDeviceId();
    const validation = validateCompetitionEntry(compId, teamName);
    if (!validation.ok) return validation;

    setDeviceLocks((prev) => {
      const exists = prev.some((entry) => entry.compId === competition.id && entry.teamName === teamName);
      if (exists) return prev;
      return [
        { compId: competition.id, teamName, deviceId, timestamp: new Date().toISOString() },
        ...prev,
      ];
    });
    return { ok: true, competition };
  };

  const submitEntry = (compId, teamName, data = {}) => {
    const competition = getCompetition(compId);
    const deviceId = getDeviceId();
    if (!competition) throw new Error('المسابقة غير موجودة');

    // Device lock check temporarily disabled for testing
    // const lock = deviceLocks.find((entry) => entry.compId === competition.id && entry.teamName === teamName);
    // if (lock && lock.deviceId !== deviceId) throw new Error('تم تسجيل جهاز آخر لفريقك في هذه المسابقة');
    if (competition.id !== 4 && isCompleted(competition.id, teamName)) throw new Error('تم تسجيل إجابتك');

    const submission = {
      id: crypto.randomUUID(),
      compId: competition.id,
      competitionName: competition.name,
      teamName,
      deviceId,
      data,
      score: Number(data.score || 0),
      final: data.final !== false,
      timestamp: new Date().toISOString(),
    };

    setSubmissions((prev) => [submission, ...prev]);
    setDeviceLocks((prev) => {
      const exists = prev.some((entry) => entry.compId === competition.id && entry.teamName === teamName);
      if (exists) return prev;
      return [{ compId: competition.id, teamName, deviceId, timestamp: submission.timestamp }, ...prev];
    });
    return submission;
  };

  const updateSubmissionScore = (submissionId, score) => {
    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === submissionId ? { ...submission, score: Number(score || 0), judged: true } : submission,
      ),
    );
  };

  const addNews = ({ title, text, photo, teamName }) => {
    const entry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      text: text.trim(),
      photo: photo?.trim() || '',
      teamName,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };
    setNews((prev) => [entry, ...prev]);
    return entry;
  };

  const approveNews = (id) => setNews((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item)));
  const rejectNews = (id) => setNews((prev) => prev.filter((item) => item.id !== id));
  const deleteNews = (id) => setNews((prev) => prev.filter((item) => item.id !== id));

  const addCountry = (country) => setGeographyCountries((prev) => [{ ...country, id: crypto.randomUUID() }, ...prev]);
  const updateCountry = (id, changes) =>
    setGeographyCountries((prev) => prev.map((country) => (country.id === id ? { ...country, ...changes } : country)));
  const deleteCountry = (id) => setGeographyCountries((prev) => prev.filter((country) => country.id !== id));

  const addQuestion = (type, question) =>
    setQuestions((prev) => ({ ...prev, [type]: [{ ...question, id: crypto.randomUUID() }, ...prev[type]] }));
  const updateQuestion = (type, id, changes) =>
    setQuestions((prev) => ({
      ...prev,
      [type]: prev[type].map((question) => (question.id === id ? { ...question, ...changes } : question)),
    }));
  const deleteQuestion = (type, id) =>
    setQuestions((prev) => ({ ...prev, [type]: prev[type].filter((question) => question.id !== id) }));

  const setColabApiUrl = (url) => {
    setColabUrl(url.trim());
    localStorage.setItem(COLAB_URL_KEY, url.trim());
  };

  const getColabApiUrl = () => colabUrl;

  const generateVideoWithColab = async (submissionId, prompt) => {
    try {
      const COLAB_API_URL = colabUrl || localStorage.getItem(COLAB_URL_KEY) || '';

      const response = await fetch(`${COLAB_API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, submission_id: submissionId }),
      });

      if (!response.ok) throw new Error('فشل في توليد الفيديو');

      const data = await response.json();

      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === submissionId
            ? { ...submission, data: { ...submission.data, videoUrl: data.video_url, videoStatus: 'generated' } }
            : submission,
        ),
      );

      return { ok: true, videoUrl: data.video_url };
    } catch (error) {
      setSubmissions((prev) =>
        prev.map((submission) =>
          submission.id === submissionId
            ? { ...submission, data: { ...submission.data, videoStatus: 'failed', videoError: error.message } }
            : submission,
        ),
      );
      return { ok: false, error: error.message };
    }
  };

  const updateSubmissionVideo = (submissionId, videoUrl) => {
    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === submissionId
          ? { ...submission, data: { ...submission.data, videoUrl, videoStatus: 'generated' } }
          : submission,
      ),
    );
  };

  const getLeaderboard = (compId) => {
    const bestByTeam = new Map();
    submissions
      .filter((submission) => submission.compId === Number(compId))
      .forEach((submission) => {
        const current = bestByTeam.get(submission.teamName);
        if (!current || Number(submission.score || 0) > Number(current.score || 0)) {
          bestByTeam.set(submission.teamName, submission);
        }
      });
    return Array.from(bestByTeam.values()).sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  };

  const getOverallLeaderboard = () => {
    // For each team, sum their best score in each competition
    const teamScores = {};
    const storedTeams = readJson(STORAGE_KEYS.teams, MOCK_TEAMS);
    storedTeams.forEach((team) => {
      teamScores[team] = 0;
    });

    const bestScores = {};
    submissions.forEach((sub) => {
      const key = `${sub.teamName}_${sub.compId}`;
      const score = Number(sub.score || 0);
      if (bestScores[key] === undefined || score > bestScores[key]) {
        bestScores[key] = score;
      }
    });

    Object.keys(bestScores).forEach((key) => {
      const parts = key.split('_');
      const compId = parts.pop();
      const teamName = parts.join('_');
      if (teamScores[teamName] !== undefined) {
        teamScores[teamName] += bestScores[key];
      }
    });

    return Object.entries(teamScores)
      .map(([teamName, totalScore]) => ({ teamName, score: totalScore }))
      .sort((a, b) => b.score - a.score);
  };

  const value = useMemo(
    () => ({
      competitions,
      submissions,
      deviceLocks,
      news,
      geographyCountries,
      questions,
      getCompetition,
      getRemainingSeconds,
      openCompetition,
      closeCompetition,
      updateCompetition,
      validateCompetitionEntry,
      registerCompetitionEntry,
      submitEntry,
      updateSubmissionScore,
      isCompleted,
      getTeamSubmission,
      getVideoAttempts,
      addNews,
      approveNews,
      rejectNews,
      deleteNews,
      addCountry,
      updateCountry,
      deleteCountry,
      addQuestion,
      updateQuestion,
      deleteQuestion,
      setColabApiUrl,
      getColabApiUrl,
      colabUrl,
      generateVideoWithColab,
      updateSubmissionVideo,
      getLeaderboard,
      getOverallLeaderboard,
      delegations,
      setDelegations,
      scannedQRs,
      setScannedQRs,
    }),
    [competitions, submissions, deviceLocks, news, geographyCountries, questions, colabUrl, delegations, scannedQRs],
  );

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'colab_video_update') {
        try {
          const data = JSON.parse(event.newValue);
          if (data.submissionId && data.videoUrl) {
            updateSubmissionVideo(data.submissionId, data.videoUrl);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return <CompetitionContext.Provider value={value}>{children}</CompetitionContext.Provider>;
};

export const useCompetitions = () => useContext(CompetitionContext);
