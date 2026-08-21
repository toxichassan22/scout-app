import { Router } from 'express';
import prisma from '../db.js';
import { createMemoryRateLimiter } from '../security.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from './leaderboard.js';
import { emitLeaderboardUpdate } from '../realtime.js';
import { recalculateTeamStanding } from '../teamStanding.js';
import { getCompetitionMaxScore } from '../scoreRules.js';
import { getOfficialCriteria } from '../officialCompetitionCriteria.js';
import { requestDataBackup } from '../backupScheduler.js';
import { idempotent } from '../middleware/idempotent.js';
import { validate, zString, zId, zNumber } from '../middleware/validate.js';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '../pagination.js';
import { ensureJudgeCompetitionAssignment } from '../judgeAccess.js';

const router = Router();

const unlockSchema = { body: { passcode: zString('كود المسابقة', { min: 1, max: 100 }) } };
const teamsSchema = { params: { competitionId: zId('المسابقة') } };
const claimSchema = { params: { competitionId: zId('المسابقة'), teamId: zId('الفريق') } };
const JUDGE_CLAIM_TTL_MS = Math.max(60_000, Number(process.env.JUDGE_CLAIM_TTL_MS) || 10 * 60 * 1000);
const scoreSchema = {
  body: {
    competitionId: zId('المسابقة'),
    teamId: zId('الفريق'),
    values: z.union([z.string(), z.record(z.unknown())]).optional(),
    total: zNumber('المجموع', { min: 0, max: 100000 }),
  },
};

router.use(authenticateToken);
router.use(requireRole(['judge']));
router.use(createMemoryRateLimiter({
  windowMs: Number(process.env.MUTATION_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.JUDGE_MUTATION_RATE_MAX) || 30,
  keyGenerator: req => req.user?.id || 'anonymous',
  message: 'طلبات التعديل كثيرة؛ حاول مرة أخرى لاحقاً',
}));

const failedAttempts = new Map();

router.post('/unlock', validate(unlockSchema), async (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const attempts = failedAttempts.get(clientIp) || { count: 0, resetAt: 0 };

    if (attempts.count >= 5 && Date.now() < attempts.resetAt) {
      const waitSeconds = Math.ceil((attempts.resetAt - Date.now()) / 1000);
      return res.status(429).json({
        error: `تم حظر المحاولات مؤقتاً لحماية النظام. يُرجى الانتظار ${waitSeconds} ثانية.`
      });
    }

    const { passcode } = req.body;
    if (!passcode) return res.status(400).json({ error: 'كود المسابقة مطلوب' });

    const competition = await prisma.competition.findFirst({
      where: { passcode, isOpen: true, type: 'manual_judged' }
    });

    if (!competition) {
      const newCount = attempts.count + 1;
      failedAttempts.set(clientIp, { count: newCount, resetAt: Date.now() + 60000 });
      return res.status(404).json({ error: 'كود المسابقة غير صحيح أو المسابقة مغلقة حالياً' });
    }

    await ensureJudgeCompetitionAssignment(prisma, competition.id, req.user.id);

    failedAttempts.delete(clientIp);

    let criteria = [];
    try {
      criteria = JSON.parse(getOfficialCriteria(competition) || competition.criteria || '[]');
    } catch (e) {
      criteria = [];
    }

    res.json({
      competition: {
        id: competition.id,
        name: competition.name,
        criteria
      }
    });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ success: false, error: err.message, code: err.code });
    req.log.error({ err }, 'judge unlock failed');
    res.status(500).json({ success: false, error: 'خطأ في التحقق من كود المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.get('/teams/:competitionId', validate(teamsSchema), async (req, res) => {
  try {
    const { competitionId } = req.params;
    const competition = await prisma.competition.findFirst({
      where: { id: competitionId, isOpen: true, judgeAssignments: { some: { judgeId: req.user.id } } }
    });
    if (!competition) return res.status(403).json({ success: false, error: 'المسابقة مغلقة أو غير متاحة للتحكيم حالياً', requestId: req.requestId, timestamp: new Date().toISOString() });

    const now = new Date();
    await prisma.judgeTeamClaim.deleteMany({ where: { competitionId, expiresAt: { lte: now } } });
    const teamWhere = {
      judgeTeamClaims: {
        none: { competitionId, judgeId: { not: req.user.id }, expiresAt: { gt: now } },
      },
    };
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 100, maxLimit: 200 });
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        where: teamWhere,
        orderBy: { label: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          label: true,
          scores: { where: { competitionId }, select: { id: true, total: true, isFinal: true } },
          reports: { where: { competitionId }, orderBy: { uploadedAt: 'desc' }, take: 1, select: { id: true, title: true, content: true, fileUrl: true, fileName: true, uploadedAt: true } },
          videoAttempts: { where: { competitionId }, orderBy: { attemptNumber: 'desc' }, select: { id: true, attemptNumber: true, prompt: true, videoUrl: true, videoStatus: true, createdAt: true } },
        }
      }),
      prisma.team.count({ where: teamWhere }),
    ]);

    const formattedTeams = teams.map(t => {
      const compReport = t.reports[0] || null;
      const latestVideoAttempt = t.videoAttempts?.[0] || null;
      const finalized = Boolean(t.scores[0]?.isFinal);
      return {
        id: t.id,
        label: t.label,
        hasSubmitted: t.scores.some(s => s.isFinal) || t.reports.length > 0 || (t.videoAttempts && t.videoAttempts.length > 0),
        isFinal: finalized,
        existingScore: finalized ? null : (t.scores[0] ? t.scores[0].total : null),
        report: !finalized && compReport ? { id: compReport.id, title: compReport.title, content: compReport.content, fileUrl: compReport.fileUrl, fileName: compReport.fileName, createdAt: compReport.uploadedAt } : null,
        videoAttempt: !finalized && latestVideoAttempt ? { id: latestVideoAttempt.id, attemptNumber: latestVideoAttempt.attemptNumber, prompt: latestVideoAttempt.prompt, videoUrl: latestVideoAttempt.videoUrl, videoStatus: latestVideoAttempt.videoStatus, createdAt: latestVideoAttempt.createdAt } : null,
        videoAttempts: !finalized && t.videoAttempts ? t.videoAttempts : [],
      };
    });

    res.json(paginatedResponse({ data: formattedTeams, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch judge teams');
    res.status(500).json({ success: false, error: 'فشل في جلب قائمة الفرق والتقارير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.post('/teams/:competitionId/:teamId/claim', validate(claimSchema), async (req, res) => {
  const { competitionId, teamId } = req.params;
  const judgeId = req.user.id;
  try {
    const competition = await prisma.competition.findFirst({
      where: { id: competitionId, isOpen: true, judgeAssignments: { some: { judgeId } } },
      select: { id: true },
    });
    if (!competition) return res.status(403).json({ success: false, error: 'المسابقة مغلقة أو غير متاحة للتحكيم' });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + JUDGE_CLAIM_TTL_MS);
    const claim = await prisma.$transaction(async tx => {
      const score = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId, teamId } }, select: { isFinal: true } });
      if (score?.isFinal) throw Object.assign(new Error('تم اعتماد تقييم هذا الفريق بالفعل'), { status: 409, code: 'TEAM_ALREADY_SCORED' });
      await tx.judgeTeamClaim.deleteMany({ where: { competitionId, teamId, expiresAt: { lte: now } } });
      const existing = await tx.judgeTeamClaim.findUnique({ where: { competitionId_teamId: { competitionId, teamId } } });
      if (existing && existing.judgeId !== judgeId) throw Object.assign(new Error('الفريق مفتوح الآن عند محكم آخر'), { status: 409, code: 'TEAM_CLAIMED' });
      if (existing) return tx.judgeTeamClaim.update({ where: { id: existing.id }, data: { expiresAt } });
      return tx.judgeTeamClaim.create({ data: { competitionId, teamId, judgeId, expiresAt } });
    });

    req.io?.to('judge').emit('judge:team:claimed', { competitionId, teamId, judgeId, expiresAt: claim.expiresAt });
    res.json({ success: true, claim: { teamId, competitionId, expiresAt: claim.expiresAt } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, error: err.message, code: err.code });
    req.log.error({ err, competitionId, teamId }, 'judge team claim failed');
    res.status(500).json({ success: false, error: 'فشل في حجز الفريق للتقييم' });
  }
});

router.delete('/teams/:competitionId/:teamId/claim', validate(claimSchema), async (req, res) => {
  const { competitionId, teamId } = req.params;
  try {
    const result = await prisma.judgeTeamClaim.deleteMany({ where: { competitionId, teamId, judgeId: req.user.id } });
    if (result.count > 0) req.io?.to('judge').emit('judge:team:released', { competitionId, teamId, judgeId: req.user.id });
    res.json({ success: true, released: result.count > 0 });
  } catch (err) {
    req.log.error({ err, competitionId, teamId }, 'judge team claim release failed');
    res.status(500).json({ success: false, error: 'فشل في إلغاء حجز الفريق' });
  }
});

router.post('/scores', enforceNotFrozen, validate(scoreSchema), idempotent('judge:score'), async (req, res) => {
  try {
    const { competitionId, teamId, values, total } = req.body;
    const judgeId = req.user.id;

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId, judgeAssignments: { some: { judgeId } } }
    });

    if (!competition || !competition.isOpen) return res.status(400).json({ error: 'المسابقة مغلقة أو غير موجودة' });

    let parsedValues;
    try { parsedValues = typeof values === 'string' ? JSON.parse(values) : values; } catch { return res.status(400).json({ error: 'قيم التقييم ليست JSON صالحاً' }); }
    if (!parsedValues || typeof parsedValues !== 'object' || Array.isArray(parsedValues)) return res.status(400).json({ error: 'قيم التقييم غير صالحة' });
    
    let criteria = [];
    try { criteria = JSON.parse(getOfficialCriteria(competition) || competition.criteria || '[]'); } catch { return res.status(400).json({ error: 'معايير المسابقة غير صالحة' }); }
    
    const expected = new Set(criteria.map(c => String(c.key)));
    if (expected.size && (Object.keys(parsedValues).length !== expected.size || Object.keys(parsedValues).some(k => !expected.has(k)))) return res.status(400).json({ error: 'يجب إرسال جميع معايير المسابقة فقط' });
    
    let calculated = 0;
    for (const criterion of criteria) { 
        const n = Number(parsedValues[criterion.key]); 
        const max = Number(criterion.maxScore); 
        if (!Number.isFinite(n) || n < 0 || !Number.isFinite(max) || n > max) return res.status(400).json({ error: `قيمة المعيار ${criterion.key} غير صالحة` }); 
        calculated += n; 
    }
    const maxScore = getCompetitionMaxScore(competition);
    if (calculated > maxScore) return res.status(400).json({ error: `المجموع لا يمكن أن يتجاوز ${maxScore} نقطة` });
    if (Math.abs(calculated - Number(total)) > 0.0001) return res.status(400).json({ error: 'المجموع لا يطابق قيم المعايير' });

    const serializedValues = JSON.stringify(parsedValues);
    const scoreRecord = await prisma.$transaction(async tx => {
      const existingScore = await tx.score.findUnique({ where: { competitionId_teamId: { competitionId, teamId } } });
      if (existingScore?.isFinal) throw Object.assign(new Error('تم اعتماد التقييم نهائياً ولا يمكن تعديله'), { status: 409 });
      const claim = await tx.judgeTeamClaim.findUnique({ where: { competitionId_teamId: { competitionId, teamId } } });
      if (!claim || claim.judgeId !== judgeId || claim.expiresAt <= new Date()) throw Object.assign(new Error('انتهى حجز الفريق؛ افتحه مرة أخرى قبل الحفظ'), { status: 409, code: 'TEAM_CLAIM_EXPIRED' });

      let score;
      if (existingScore) {
        score = await tx.score.update({
          where: { id: existingScore.id },
          data: { judgeId, values: serializedValues, total: calculated, isFinal: true },
        });
      } else {
        score = await tx.score.create({
          data: { competitionId, teamId, judgeId, values: serializedValues, total: calculated, isFinal: true },
        });
      }
      await tx.judgeTeamClaim.deleteMany({ where: { competitionId, teamId, judgeId } });
      await tx.judgeScore.create({ data: { scoreId: score.id, competitionId, teamId, judgeId, values: serializedValues, total: calculated } });
      await tx.scoreAudit.create({ data: { scoreId: score.id, competitionId, teamId, judgeId, action: 'judge_submit', newData: JSON.stringify({ values: parsedValues, total: calculated }) } });
      await recalculateTeamStanding(teamId, tx);
      
      return { score, competitionClosed: false };
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    req.io?.to('admin').emit('admin:score:new', { scoreRecord: scoreRecord.score, teamId, competitionId });
    requestDataBackup({ reason: 'judge-score-finalised' });

    res.json({ success: true, score: scoreRecord.score, competitionClosed: false });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'تم تسجيل تقييم لهذا الفريق بالفعل', requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ err }, 'judge score submission failed');
    res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'فشل في حفظ التقييم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
