import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { startDigitalSession } from '../quizService.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from './leaderboard.js';
import { emitLeaderboardUpdate } from '../realtime.js';
import { normalizeArabicText } from '../textNormalization.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod/v3';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();
const MAX_SUBMISSION_ANSWERS = Math.min(1000, Math.max(1, Number(process.env.MAX_SUBMISSION_ANSWERS) || 500));
const MAX_ANSWER_TEXT_LENGTH = Math.min(10_000, Math.max(1, Number(process.env.MAX_ANSWER_TEXT_LENGTH) || 1000));
const ALLOWED_VIDEO_DOMAINS = new Set(['youtube.com', 'youtu.be', 'vimeo.com', 'drive.google.com']);

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const isVideoCompetition = (c) => c.slug === 'video' || c.slug === 'video_design';

const zSlug = zString('المسابقة', { min: 1, max: 100 });
const entryCodeSchema = { params: { idOrSlug: zSlug }, body: { entryCode: zString('كود الدخول', { max: 100 }).optional() } };
const playSchema = { params: { idOrSlug: zSlug } };
const submitSchema = {
  params: { idOrSlug: zSlug },
  body: { answers: z.array(z.record(z.any())).max(MAX_SUBMISSION_ANSWERS, 'عدد الإجابات أكبر من المسموح') },
};
const videoAttemptSchema = {
  params: { idOrSlug: zSlug },
  body: {
    prompt: zString('البرومبت', { min: 1, max: 4000 }),
    videoUrl: zString('رابط الفيديو', { max: 2048 }).optional(),
  },
};
const videoPatchSchema = {
  params: { idOrSlug: zSlug, attemptId: zString('معرف المحاولة', { min: 36, max: 36 }) },
  body: { videoUrl: zString('رابط الفيديو', { max: 2048 }) },
};

const publicCompetition = (comp, myScore = null) => ({
  id: comp.id,
  name: comp.name,
  slug: comp.slug,
  type: comp.type,
  description: comp.description || '',
  isOpen: comp.isOpen,
  duration: comp.duration,
  hasEntryCode: Boolean(comp.entryCode),
  completed: Boolean(myScore),
  myTotal: myScore ? myScore.total : null,
  attemptCount:
    myScore && myScore.values
      ? (parseJson(myScore.values, {}).attempts || []).length
      : 0,
});

// List competitions for teams
router.get('/', authenticateToken, requireRole(['team', 'admin']), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = {};
    const [comps, total] = await Promise.all([
      prisma.competition.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.competition.count({ where }),
    ]);

    let myScores = [];
    if (req.user.role === 'team') {
      myScores = await prisma.score.findMany({
        where: { teamId: req.user.id },
      });
    }
    const scoreByComp = Object.fromEntries(myScores.map((s) => [s.competitionId, s]));

    res.json(paginatedResponse({ data: comps.map((c) => publicCompetition(c, scoreByComp[c.id])), page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch competitions');
    res.status(500).json({ success: false, error: 'فشل في جلب المسابقات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Unlock / enter competition (optional entry code)
router.post('/:idOrSlug/enter', authenticateToken, requireRole(['team']), enforceNotFrozen, validate(entryCodeSchema), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { entryCode } = req.body;

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }

    if (competition.entryCode && competition.entryCode !== String(entryCode || '').trim()) {
      return res.status(403).json({ error: 'كود الدخول غير صحيح' });
    }
    if (competition.entryCode) {
      await prisma.competitionAccess.upsert({
        where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } },
        create: { teamId: req.user.id, competitionId: competition.id },
        update: { grantedAt: new Date() },
      });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    // Video allows multiple attempts; others are one-shot
    if (existing && !isVideoCompetition(competition)) {
      return res.status(400).json({
        error: 'تم تسجيل إجابتك مسبقاً في هذه المسابقة',
        completed: true,
        total: existing.total,
      });
    }

    let session = null;
    if (competition.type === 'auto_digital') {
      session = await startDigitalSession({
        teamId: req.user.id,
        competitionId: competition.id,
        deviceId: req.user.deviceId,
        entryCode,
      });
    }
    res.json({
      ok: true,
      competition: publicCompetition(competition, existing),
      ...(session && { sessionId: session.id, remainingSeconds: Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)) }),
    });
  } catch (err) {
    req.log.error({ err }, 'failed to enter competition');
    res.status(500).json({ success: false, error: 'فشل في دخول المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Play pack: questions/countries WITHOUT answers
router.get('/:idOrSlug/play', authenticateToken, requireRole(['team']), validate(playSchema), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }
    if (competition.entryCode && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) {
      return res.status(403).json({ error: 'يجب إدخال كود المسابقة أولاً' });
    }

    let session = null;
    if (competition.type === 'auto_digital') {
      session = await prisma.quizSession.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } });
      if (!session) return res.status(409).json({ error: 'يجب بدء جلسة المسابقة أولاً', sessionRequired: true });
      if (session.deviceId !== req.user.deviceId) return res.status(403).json({ error: 'المسابقة مقفلة على جهاز آخر' });
      if (session.isCompleted || new Date() >= session.expiresAt) return res.status(409).json({ error: 'انتهت جلسة المسابقة' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    if (existing && !isVideoCompetition(competition)) {
      return res.status(400).json({
        error: 'تم تسجيل إجابتك مسبقاً',
        completed: true,
        total: existing.total,
      });
    }

    if (competition.slug === 'geography') {
      const countries = await prisma.geographyCountry.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({
        competition: publicCompetition(competition, existing),
        countries: countries.map((c) => ({
          id: c.id,
          capital: c.capital,
          currency: c.currency,
          flag: c.flag,
          mapUrl: c.mapUrl,
          // name withheld for server-side grading
        })),
      });
    }

    if (isVideoCompetition(competition)) {
      const values = existing ? parseJson(existing.values, {}) : {};
      return res.json({
        competition: publicCompetition(competition, existing),
        attempts: values.attempts || [],
        maxAttempts: 3,
      });
    }

    // two_truths / genius / generic auto
    const questions = competition.questions.map((q) => {
      const options = parseJson(q.options, []);
      const safeOptions = options.map((opt) => {
        if (typeof opt === 'string') return opt;
        return opt.text || '';
      });
      return {
        id: q.id,
        text: q.text,
        options: safeOptions,
        points: q.points,
      };
    });

    res.json({
      competition: publicCompetition(competition, existing),
      questions,
      ...(session && { sessionId: session.id, remainingSeconds: Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)) }),
    });
  } catch (err) {
    req.log.error({ err }, 'failed to load competition content');
    res.status(500).json({ success: false, error: 'فشل في تحميل محتوى المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

async function upsertScore({ competitionId, teamId, total, values, judgeId = null }) {
  return prisma.score.upsert({
    where: {
      competitionId_teamId: { competitionId, teamId },
    },
    create: {
      competitionId,
      teamId,
      judgeId,
      total,
      values: typeof values === 'string' ? values : JSON.stringify(values || {}),
    },
    update: {
      judgeId,
      total,
      values: typeof values === 'string' ? values : JSON.stringify(values || {}),
      submittedAt: new Date(),
    },
  });
}

function validateSubmissionAnswers(answers, competition) {
  if (!Array.isArray(answers)) return 'answers must be an array';
  if (answers.length > MAX_SUBMISSION_ANSWERS) return `Too many answers (max ${MAX_SUBMISSION_ANSWERS})`;

  const idKey = competition.slug === 'geography' ? 'countryId' : 'questionId';
  const seen = new Set();
  for (const answer of answers) {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return 'Invalid answer format';
    const id = answer[idKey];
    if (typeof id !== 'string' || id.length === 0 || id.length > 100 || seen.has(id)) return 'Invalid or duplicate answer identifier';
    seen.add(id);

    if (competition.slug === 'geography') {
      if (typeof answer.answer !== 'string' || answer.answer.length > MAX_ANSWER_TEXT_LENGTH) return 'Invalid or oversized answer';
    } else if (!Number.isInteger(Number(answer.selectedIndex)) || Number(answer.selectedIndex) < 0 || Number(answer.selectedIndex) > 1000) {
      return 'Invalid selected answer';
    }
  }
  return null;
}

// Submit auto-digital answers (server grades)
router.post('/:idOrSlug/submit', authenticateToken, requireRole(['team']), enforceNotFrozen, validate(submitSchema), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { answers } = req.body;

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
      include: { questions: true },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }
    if (competition.entryCode && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) {
      return res.status(403).json({ error: 'يجب إدخال كود المسابقة أولاً' });
    }
    if (competition.type !== 'auto_digital' && competition.slug !== 'geography') {
      return res.status(400).json({ error: 'هذه المسابقة لا تُصحَّح تلقائياً' });
    }

    const answerValidationError = validateSubmissionAnswers(answers, competition);
    if (answerValidationError) return res.status(400).json({ error: answerValidationError });
    const expectedAnswerCount = competition.slug === 'geography'
      ? await prisma.geographyCountry.count()
      : competition.questions.length;
    if (answers.length > expectedAnswerCount) return res.status(400).json({ error: 'Answer count exceeds competition question count' });

    const session = await prisma.quizSession.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } });
    if (!session) return res.status(409).json({ error: 'يجب بدء جلسة المسابقة أولاً', sessionRequired: true });
    if (session.deviceId !== req.user.deviceId) return res.status(403).json({ error: 'الجهاز لا يطابق جلسة المسابقة' });
    if (session.isCompleted || new Date() >= session.expiresAt) return res.status(409).json({ error: 'انتهت جلسة المسابقة' });

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });
    if (existing) {
      return res.status(400).json({ error: 'تم تسجيل إجابتك مسبقاً', total: existing.total });
    }

    let total = 0;
    const detail = [];

    if (competition.slug === 'geography') {
      const countries = await prisma.geographyCountry.findMany();
      const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
      const answerList = answers;

      for (const item of answerList) {
        const country = byId[item.countryId];
        if (!country) continue;
        const correct =
          normalizeArabicText(item.answer) === normalizeArabicText(country.name);
        const points = correct ? 10 : 0;
        total += points;
        detail.push({ countryId: item.countryId, correct, points });
      }
    } else {
      const byId = Object.fromEntries(competition.questions.map((q) => [q.id, q]));
      const answerList = answers;

      for (const item of answerList) {
        const q = byId[item.questionId];
        if (!q) continue;
        const selected = parseInt(item.selectedIndex, 10);
        const correct = selected === q.correctOption;
        const points = correct ? Number(q.points || 0) : 0;
        total += points;
        detail.push({ questionId: q.id, correct, points });
      }
    }

    let score;
    try {
      score = await prisma.$transaction(async tx => {
        const current = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId: competition.id, teamId: req.user.id } } });
        if (current) return current;
        const created = await tx.score.create({ data: { competitionId: competition.id, teamId: req.user.id, total, values: JSON.stringify({ mode: 'auto', sessionId: session.id, detail }), judgeId: null } });
        await tx.quizSession.update({ where: { id: session.id }, data: { isCompleted: true, completedAt: new Date() } });
        return created;
      });
    } catch (error) {
      if (error.code !== 'P2002') throw error;
      score = await prisma.score.findUnique({ where: { competitionId_teamId: { competitionId: competition.id, teamId: req.user.id } } });
    }

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);

    res.json({
      success: true,
      total: score.total,
      scoreId: score.id,
    });
  } catch (err) {
    req.log.error({ err }, 'failed to submit competition answers');
    res.status(500).json({ success: false, error: 'فشل في تسجيل النتيجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Video attempt (max 3) — score stays 0 until judged
router.post('/:idOrSlug/video-attempt', authenticateToken, requireRole(['team']), enforceNotFrozen, validate(videoAttemptSchema), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { prompt, videoUrl } = req.body;

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });

    if (!competition || !isVideoCompetition(competition)) {
      return res.status(404).json({ error: 'مسابقة الفيديو غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim() : '';
    if (!cleanPrompt || cleanPrompt.length > 4000) return res.status(400).json({ error: 'البرومبت غير صالح' });
    if (videoUrl !== undefined && videoUrl !== null && !isAllowedVideoUrl(videoUrl)) return res.status(400).json({ error: 'رابط الفيديو غير صالح' });
    if (competition.entryCode && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) return res.status(403).json({ error: 'يجب إدخال كود المسابقة أولاً' });

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    const values = existing ? parseJson(existing.values, {}) : {};
    const attempts = Array.isArray(values.attempts) ? values.attempts : [];

    if (attempts.length >= 3) {
      return res.status(400).json({ error: 'تم استنفاد الحد الأقصى (3 محاولات)' });
    }

    attempts.push({
      id: randomUUID(),
      prompt: cleanPrompt,
      videoUrl: videoUrl || null,
      videoStatus: videoUrl ? 'generated' : 'pending',
      at: new Date().toISOString(),
    });

    const score = await upsertScore({
      competitionId: competition.id,
      teamId: req.user.id,
      total: existing?.total || 0,
      values: { ...values, attempts },
      judgeId: existing?.judgeId || null,
    });

    res.json({
      success: true,
      attempts,
      remaining: Math.max(0, 3 - attempts.length),
      scoreId: score.id,
    });
  } catch (err) {
    req.log.error({ err }, 'failed to save video attempt');
    res.status(500).json({ success: false, error: 'فشل في حفظ محاولة الفيديو', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Update video URL on an attempt
router.patch('/:idOrSlug/video-attempt/:attemptId', authenticateToken, requireRole(['team']), enforceNotFrozen, validate(videoPatchSchema), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { attemptId } = req.params;
    const { videoUrl } = req.body;

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });
    if (!competition || !isVideoCompetition(competition)) {
      return res.status(404).json({ error: 'مسابقة الفيديو غير موجودة' });
    }

    if (!competition.isOpen) return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    if (!isAllowedVideoUrl(videoUrl)) return res.status(400).json({ error: 'رابط الفيديو غير صالح' });
    if (competition.entryCode && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) return res.status(403).json({ error: 'يجب إدخال كود المسابقة أولاً' });

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'لا توجد محاولات محفوظة' });
    }

    const values = parseJson(existing.values, {});
    const attempts = Array.isArray(values.attempts) ? values.attempts : [];
    const idx = attempts.findIndex((a) => a.id === attemptId);
    if (idx < 0) {
      return res.status(404).json({ error: 'المحاولة غير موجودة' });
    }

    attempts[idx] = {
      ...attempts[idx],
      videoUrl: videoUrl || attempts[idx].videoUrl,
      videoStatus: videoUrl ? 'generated' : attempts[idx].videoStatus,
    };

    await upsertScore({
      competitionId: competition.id,
      teamId: req.user.id,
      total: existing.total,
      values: { ...values, attempts },
      judgeId: existing.judgeId,
    });

    res.json({ success: true, attempts });
  } catch (err) {
    req.log.error({ err }, 'failed to update video attempt');
    res.status(500).json({ success: false, error: 'فشل تحديث الفيديو', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export function isAllowedVideoUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const allowedDomain = [...ALLOWED_VIDEO_DOMAINS].some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
    return allowedDomain && (url.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && url.protocol === 'http:'));
  } catch {
    return false;
  }
}

export default router;
