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

const router = Router();

const unlockSchema = { body: { passcode: zString('كود المسابقة', { min: 1, max: 100 }) } };
const teamsSchema = { params: { competitionId: zId('المسابقة') } };
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

    const existingAssignment = await prisma.judgeCompetition.findFirst({ where: { competitionId: competition.id } });
    if (existingAssignment && existingAssignment.judgeId !== req.user.id) {
      return res.status(409).json({ error: 'هذه المسابقة مفتوحة لمحكم آخر بالفعل' });
    }
    if (!existingAssignment) {
      await prisma.judgeCompetition.create({ data: { competitionId: competition.id, judgeId: req.user.id } });
    }

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
    req.log.error({ err }, 'judge unlock failed');
    res.status(500).json({ success: false, error: 'خطأ في التحقق من كود المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.get('/teams/:competitionId', validate(teamsSchema), async (req, res) => {
  try {
    const { competitionId } = req.params;
    const competition = await prisma.competition.findFirst({
      where: { id: competitionId, judgeAssignments: { some: { judgeId: req.user.id } } }
    });
    if (!competition) return res.status(403).json({ success: false, error: 'المحكم غير مكلف بهذه المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });

    const { page, limit, skip } = parsePagination(req.query);
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        orderBy: { label: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          label: true,
          scores: { where: { competitionId }, select: { total: true, isFinal: true } },
          reports: { where: { competitionId }, orderBy: { uploadedAt: 'desc' }, take: 1, select: { id: true, title: true, content: true, fileUrl: true, fileName: true, uploadedAt: true } }
        }
      }),
      prisma.team.count(),
    ]);

    const formattedTeams = teams.map(t => {
      const compReport = t.reports[0] || null;
      const finalized = Boolean(t.scores[0]?.isFinal);
      return {
        id: t.id,
        label: t.label,
        hasSubmitted: t.scores.length > 0,
        isFinal: finalized,
        existingScore: finalized ? null : (t.scores[0] ? t.scores[0].total : null),
        report: !finalized && compReport ? { id: compReport.id, title: compReport.title, content: compReport.content, fileUrl: compReport.fileUrl, fileName: compReport.fileName, createdAt: compReport.uploadedAt } : null
      };
    });

    res.json(paginatedResponse({ data: formattedTeams, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch judge teams');
    res.status(500).json({ success: false, error: 'فشل في جلب قائمة الفرق والتقارير', requestId: req.requestId, timestamp: new Date().toISOString() });
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
      if (existingScore) throw Object.assign(new Error('لا يحق للمحكم تعديل نتيجة قائمة؛ التصحيح متاح للإدارة فقط'), { status: 409 });

      const score = await tx.score.create({ data: { competitionId, teamId, judgeId, values: serializedValues, total: calculated, isFinal: true } });
      await tx.judgeScore.create({ data: { scoreId: score.id, competitionId, teamId, judgeId, values: serializedValues, total: calculated } });
      await tx.scoreAudit.create({ data: { scoreId: score.id, competitionId, teamId, judgeId, action: 'judge_submit', newData: JSON.stringify({ values: parsedValues, total: calculated }) } });
      await recalculateTeamStanding(teamId, tx);
      
      const [teamCount, completedCount] = await Promise.all([
        tx.team.count(),
        tx.score.count({ where: { competitionId, isFinal: true } }),
      ]);
      const competitionClosed = teamCount > 0 && completedCount >= teamCount;
      if (competitionClosed) await tx.competition.update({ where: { id: competitionId }, data: { isOpen: false } });
      return { score, competitionClosed };
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    req.io?.to('admin').emit('admin:score:new', { scoreRecord: scoreRecord.score, teamId, competitionId });
    if (scoreRecord.competitionClosed) req.io?.to(`competition:${competitionId}`).emit('judge:session:closed', { competitionId });
    requestDataBackup({ reason: 'judge-score-finalised' });

    res.json({ success: true, score: scoreRecord.score, competitionClosed: scoreRecord.competitionClosed });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'تم تسجيل تقييم لهذا الفريق بالفعل', requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ err }, 'judge score submission failed');
    res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'فشل في حفظ التقييم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
