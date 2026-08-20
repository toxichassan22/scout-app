import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { startDigitalSession, finalizeDigitalSession, MAX_ATTEMPTS } from '../quizService.js';
import { getCompetitionState, publicCompetitionSchedule, canStartCompetition } from '../competitionState.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from './leaderboard.js';
import { emitLeaderboardUpdate } from '../realtime.js';
import { normalizeArabicText } from '../textNormalization.js';
import { recalculateTeamStanding } from '../teamStanding.js';
import { getCompetitionMaxScore } from '../scoreRules.js';
import { idempotent } from '../middleware/idempotent.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod';
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
const entryCodeSchema = { params: { idOrSlug: zSlug }, body: { entryCode: zString('كود الدخول', { min: 0, max: 100, optional: true }) } };
const playSchema = { params: { idOrSlug: zSlug } };
const submitSchema = {
  params: { idOrSlug: zSlug },
  body: { answers: z.array(z.record(z.any())).max(MAX_SUBMISSION_ANSWERS, 'عدد الإجابات أكبر من المسموح').optional() },
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

function computeAttemptCount(comp, videoAttemptCount) {
  if (!isVideoCompetition(comp)) return 0;
  return typeof videoAttemptCount === 'number' ? videoAttemptCount : 0;
}

const publicCompetition = (comp, myScore = null, videoAttemptCount) => ({
  id: comp.id,
  name: comp.name,
  slug: comp.slug,
  type: comp.type,
  description: comp.description || '',
  details: comp.details || '',
  isOpen: comp.isOpen,
  duration: comp.duration,
  questionCount: comp.questionCount,
  requiresQr: Boolean(comp.requiresQr),
  hasEntryCode: Boolean(comp.entryCode),
  completed: Boolean(myScore),
  scoreHidden: Boolean(myScore),
  attemptCount: computeAttemptCount(comp, videoAttemptCount),
  ...publicCompetitionSchedule(comp),
});

// List competitions for teams
router.get('/', authenticateToken, requireRole(['team', 'admin']), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = req.user.role === 'team' ? { type: { not: 'schedule_only' } } : {};
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
    let videoAttemptCounts = [];
    if (req.user.role === 'team') {
      myScores = await prisma.score.findMany({
        where: { teamId: req.user.id },
      });
      videoAttemptCounts = await prisma.videoAttempt.groupBy({
        by: ['competitionId'],
        where: { teamId: req.user.id },
        _count: { id: true },
      });
    }
    const scoreByComp = Object.fromEntries(myScores.map((s) => [s.competitionId, s]));
    const attemptCountByComp = Object.fromEntries(videoAttemptCounts.map((v) => [v.competitionId, v._count.id]));

    res.json(paginatedResponse({ data: comps.map((c) => publicCompetition(c, scoreByComp[c.id], attemptCountByComp[c.id])), page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch competitions');
    res.status(500).json({ success: false, error: 'فشل في جلب المسابقات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const scanSchema = { params: { idOrSlug: zSlug }, body: { qrCode: zString('QR المسابقة', { min: 1, max: 200 }) } };
router.post('/:idOrSlug/scan', authenticateToken, requireRole(['team']), validate(scanSchema), async (req, res) => {
  try {
    const competition = await prisma.competition.findFirst({ where: { OR: [{ id: req.params.idOrSlug }, { slug: req.params.idOrSlug }] } });
    if (!competition) return res.status(404).json({ error: 'المسابقة غير موجودة' });
    if (competition.type === 'schedule_only') return res.status(400).json({ error: 'هذه فعالية زمنية وليست مسابقة دخول' });
    const expectedQr = String(competition.qrCode || `scout-qr-${competition.slug}`).trim();
    let scannedQr = String(req.body.qrCode || '').trim();
    try {
      const parsedUrl = new URL(scannedQr);
      scannedQr = parsedUrl.searchParams.get('qr') || parsedUrl.searchParams.get('code') || scannedQr;
    } catch {}

    scannedQr = decodeURIComponent(scannedQr).trim();
    const validQrs = [
      expectedQr.toLowerCase(),
      `scout-qr-${competition.slug}`.toLowerCase(),
      `scout-qr-${competition.slug.replace(/_/g, '-')}`.toLowerCase(),
      `scout-qr-${competition.slug.replace(/-/g, '_')}`.toLowerCase(),
    ];

    if (!validQrs.includes(scannedQr.toLowerCase())) {
      return res.status(403).json({ error: 'رمز الـ QR الممسوح غير صحيح أو غير تابع لهذه المسابقة' });
    }
    await prisma.competitionAccess.upsert({
      where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } },
      create: { teamId: req.user.id, competitionId: competition.id },
      update: { grantedAt: new Date() },
    });
    const score = await prisma.score.findUnique({ where: { competitionId_teamId: { competitionId: competition.id, teamId: req.user.id } } });
    return res.json({ success: true, competition: publicCompetition(competition, score), scanned: true, canStart: canStartCompetition(competition), state: getCompetitionState(competition) });
  } catch (err) {
    req.log.error({ err }, 'failed to scan competition QR');
    return res.status(500).json({ success: false, error: 'فشل في التحقق من QR', requestId: req.requestId, timestamp: new Date().toISOString() });
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
    if (competition.type === 'schedule_only') return res.status(400).json({ error: 'هذه فعالية زمنية وليست مسابقة دخول' });
    const state = getCompetitionState(competition);
    if (state !== 'active') {
      return res.status(400).json({ error: state === 'scheduled' ? 'المسابقة لم تبدأ بعد' : 'المسابقة مغلقة حالياً', state });
    }
    if (competition.requiresQr && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) {
      return res.status(403).json({ error: 'يجب مسح QR الخاص بالمسابقة أولاً' });
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

    let existing = await prisma.score.findUnique({
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
        scoreHidden: true,
      });
    }

    let videoAttemptCount = 0;
    if (req.user.role === 'team' && isVideoCompetition(competition)) {
      videoAttemptCount = await prisma.videoAttempt.count({
        where: { competitionId: competition.id, teamId: req.user.id },
      });
    }

    const sessionInfo = {};
    if (competition.type === 'auto_digital') {
      const result = await startDigitalSession({
        teamId: req.user.id,
        competitionId: competition.id,
        deviceId: req.user.deviceId,
        entryCode,
      });
      if (result.finalized || result.kind === 'finalized') {
        existing = result.score;
        sessionInfo.completed = true;
        sessionInfo.myTotal = result.score.total;
      } else {
        sessionInfo.sessionId = result.session.id;
        sessionInfo.remainingSeconds = Math.max(0, Math.floor((new Date(result.session.expiresAt) - Date.now()) / 1000));
      }
    }
    res.json({
      ok: true,
      competition: publicCompetition(competition, existing, videoAttemptCount),
      ...sessionInfo,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message, requestId: req.requestId, timestamp: new Date().toISOString() });
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
    if (competition.type === 'schedule_only') return res.status(400).json({ error: 'هذه فعالية زمنية وليست مسابقة دخول' });
    const state = getCompetitionState(competition);
    if (state === 'closed') return res.status(400).json({ error: 'المسابقة مغلقة حالياً', state });
    if (state === 'scheduled') return res.status(400).json({ error: 'المسابقة لم تبدأ بعد', state });
    if (competition.requiresQr && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) {
      return res.status(403).json({ error: 'يجب مسح QR الخاص بالمسابقة أولاً' });
    }
    if (competition.entryCode && !await prisma.competitionAccess.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } })) {
      return res.status(403).json({ error: 'يجب إدخال كود المسابقة أولاً' });
    }

    let session = null;
    let expired = false;
    if (competition.type === 'auto_digital') {
      session = await prisma.quizSession.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } }, include: { draftAnswers: { select: { questionId: true } } } });
      if (!session) return res.status(409).json({ error: 'يجب بدء جلسة المسابقة أولاً', sessionRequired: true });
      if (session.deviceId !== req.user.deviceId) return res.status(403).json({ error: 'المسابقة مقفلة على جهاز آخر' });
      if (session.isCompleted) return res.status(409).json({ error: 'انتهت جلسة المسابقة', completed: true });
      expired = new Date() >= session.expiresAt;
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
        scoreHidden: true,
      });
    }

    if (isVideoCompetition(competition)) {
      const [attempts, videoAttemptCount] = await Promise.all([
        prisma.videoAttempt.findMany({
          where: { competitionId: competition.id, teamId: req.user.id },
          orderBy: { attemptNumber: 'asc' },
        }),
        prisma.videoAttempt.count({
          where: { competitionId: competition.id, teamId: req.user.id },
        }),
      ]);
      return res.json({
        competition: publicCompetition(competition, existing, videoAttemptCount),
        attempts: attempts.map((a) => ({
          id: a.id,
          prompt: a.prompt,
          videoUrl: a.videoUrl,
          videoStatus: a.videoStatus,
          at: a.createdAt.toISOString(),
        })),
        maxAttempts: MAX_ATTEMPTS,
      });
    }

    // two_truths / genius / generic auto
    const order = session ? (() => {
      const parsed = parseJson(session.questionOrder, []);
      return Array.isArray(parsed) ? parsed : [];
    })() : competition.questions.map(question => question.id);
    const byId = new Map(competition.questions.map(question => [question.id, question]));
    const questions = order.map(id => byId.get(id)).filter(Boolean).map((q) => {
      const options = parseJson(q.options, []);
      return {
        id: q.id,
        text: q.text,
        category: q.category || '',
        options: options.map((opt) => typeof opt === 'string' ? opt : opt.text || ''),
        points: q.points,
        questionType: q.questionType,
        mediaUrl: q.mediaUrl,
        mediaAlt: q.mediaAlt,
      };
    });

    res.json({
      competition: publicCompetition(competition, existing),
      questions,
      ...(session && {
        sessionId: session.id,
        remainingSeconds: expired ? 0 : Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)),
        attemptedCount: session.attemptedCount,
        correctCount: session.correctCount,
        answeredQuestionIds: session.draftAnswers.map(answer => answer.questionId),
        expired,
      }),
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ err }, 'failed to load competition content');
    res.status(500).json({ success: false, error: 'فشل في تحميل محتوى المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

async function createVideoAttempt({ competitionId, teamId, prompt, videoUrl, videoStatus }) {
  const MAX_RETRIES = 3;
  for (let i = 0; i < MAX_RETRIES; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await prisma.$transaction(async (tx) => {
        const count = await tx.videoAttempt.count({ where: { competitionId, teamId } });
        if (count >= MAX_ATTEMPTS) {
          throw Object.assign(new Error('تم استنفاد الحد الأقصى (3 محاولات)'), { status: 400 });
        }
        await tx.videoAttempt.create({
          data: { competitionId, teamId, attemptNumber: count + 1, prompt, videoUrl, videoStatus },
        });
        const score = await tx.score.upsert({
          where: { competitionId_teamId: { competitionId, teamId } },
          create: { competitionId, teamId, total: 0, values: JSON.stringify({ mode: 'video' }), judgeId: null },
          update: {},
        });
        const attempts = await tx.videoAttempt.findMany({
          where: { competitionId, teamId },
          orderBy: { attemptNumber: 'asc' },
        });
        return { attempts, remaining: Math.max(0, MAX_ATTEMPTS - attempts.length), scoreId: score.id };
      });
    } catch (err) {
      if (err.status === 400) throw err;
      if (err.code !== 'P2002' || i === MAX_RETRIES - 1) throw err;
      // P2002 on the unique constraint means a concurrent insert won the race; retry.
    }
  }
  throw Object.assign(new Error('تم استنفاد الحد الأقصى (3 محاولات)'), { status: 400 });
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

// Submit auto-digital answers (server grades from drafts; geography still accepts client answers)
router.post('/:idOrSlug/submit', authenticateToken, requireRole(['team']), enforceNotFrozen, validate(submitSchema), idempotent('competition:submit'), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { answers } = req.body || {};

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

    // Unified path for non-geography auto-digital competitions: grade from server-side drafts.
    if (competition.type === 'auto_digital' && competition.slug !== 'geography') {
      const session = await prisma.quizSession.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } });
      if (!session) return res.status(409).json({ error: 'يجب بدء جلسة المسابقة أولاً', sessionRequired: true });
      const result = await finalizeDigitalSession(session.id, req.user.id, req.user.deviceId);
      clearLeaderboardCache();
      await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
      return res.json({ success: true, total: result.totalScore, scoreId: result.score.id });
    }

    // Geography path: client submits answers in one batch (text answers are not saved as drafts).
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'الإجابات مطلوبة' });
    }
    const answerValidationError = validateSubmissionAnswers(answers, competition);
    if (answerValidationError) return res.status(400).json({ error: answerValidationError });
    const expectedAnswerCount = await prisma.geographyCountry.count();
    if (answers.length > expectedAnswerCount) return res.status(400).json({ error: 'Answer count exceeds competition question count' });

    let detail = [];
    let score;
    try {
      score = await prisma.$transaction(async tx => {
        const current = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId: competition.id, teamId: req.user.id } } });
        if (current) return current;

        const session = await tx.quizSession.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } });
        if (!session) throw Object.assign(new Error('يجب بدء جلسة المسابقة أولاً'), { status: 409 });
        if (session.deviceId !== req.user.deviceId) throw Object.assign(new Error('المسابقة مقفلة على جهاز آخر'), { status: 403 });
        if (session.isCompleted) throw Object.assign(new Error('انتهت جلسة المسابقة'), { status: 409 });
        if (new Date() >= session.expiresAt) throw Object.assign(new Error('انتهى وقت المسابقة'), { status: 409 });

        const countries = await tx.geographyCountry.findMany();
        const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
        let computed = 0;
        detail = [];
        for (const item of answers) {
          const country = byId[item.countryId];
          if (!country) continue;
          const correct = normalizeArabicText(item.answer) === normalizeArabicText(country.name);
          const points = correct ? 1 : 0;
          computed += points;
          detail.push({ countryId: item.countryId, correct, points });
        }
        const maxScore = getCompetitionMaxScore(competition);
        if (computed > maxScore) throw Object.assign(new Error(`نتيجة المسابقة تجاوزت الحد الأقصى (${maxScore} نقطة)`), { status: 400 });
        const created = await tx.score.create({
          data: { competitionId: competition.id, teamId: req.user.id, total: computed, values: JSON.stringify({ mode: 'geography', sessionId: session.id, detail }), judgeId: null },
        });
        await tx.quizSession.update({ where: { id: session.id }, data: { isCompleted: true, completedAt: new Date() } });
        await recalculateTeamStanding(req.user.id, tx);
        return created;
      });
    } catch (error) {
      if (error.status || error.statusCode) throw error;
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
    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? err.message : 'فشل في تسجيل النتيجة';
    res.status(status).json({ success: false, error: message, requestId: req.requestId, timestamp: new Date().toISOString() });
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

    const result = await createVideoAttempt({
      competitionId: competition.id,
      teamId: req.user.id,
      prompt: cleanPrompt,
      videoUrl: videoUrl || null,
      videoStatus: videoUrl ? 'generated' : 'pending',
    });

    res.json({
      success: true,
      attempts: result.attempts.map((a) => ({
        id: a.id,
        prompt: a.prompt,
        videoUrl: a.videoUrl,
        videoStatus: a.videoStatus,
        at: a.createdAt.toISOString(),
      })),
      remaining: result.remaining,
      scoreId: result.scoreId,
    });
  } catch (err) {
    req.log.error({ err }, 'failed to save video attempt');
    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? err.message : 'فشل في حفظ محاولة الفيديو';
    res.status(status).json({ success: false, error: message, requestId: req.requestId, timestamp: new Date().toISOString() });
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

    const attempt = await prisma.videoAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt || attempt.competitionId !== competition.id || attempt.teamId !== req.user.id) {
      return res.status(404).json({ error: 'المحاولة غير موجودة' });
    }

    const updated = await prisma.videoAttempt.update({
      where: { id: attemptId },
      data: {
        videoUrl: videoUrl || attempt.videoUrl,
        videoStatus: videoUrl ? 'generated' : attempt.videoStatus,
      },
    });

    const attempts = await prisma.videoAttempt.findMany({
      where: { competitionId: competition.id, teamId: req.user.id },
      orderBy: { attemptNumber: 'asc' },
    });

    res.json({
      success: true,
      attempts: attempts.map((a) => ({
        id: a.id,
        prompt: a.prompt,
        videoUrl: a.videoUrl,
        videoStatus: a.videoStatus,
        at: a.createdAt.toISOString(),
      })),
      attempt: updated,
    });
  } catch (err) {
    req.log.error({ err }, 'failed to update video attempt');
    const status = err.status || err.statusCode || 500;
    const message = status < 500 ? err.message : 'فشل تحديث الفيديو';
    res.status(status).json({ success: false, error: message, requestId: req.requestId, timestamp: new Date().toISOString() });
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
