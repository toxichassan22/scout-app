import { error } from '../../response.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { validate, zString, zId } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeJudgeSelect = { id: true, name: true, username: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, criteria: true, createdAt: true };

const router = Router();

// Judge assignments
router.get('/judges/:judgeId/assignments', validate({ params: { judgeId: zId('المحكم') } }), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { judgeId: req.params.judgeId };
    const [rows, total] = await Promise.all([
      prisma.judgeCompetition.findMany({ where, include: { competition: true }, skip, take: limit }),
      prisma.judgeCompetition.count({ where }),
    ]);
    res.json(paginatedResponse({ data: rows, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin judge assignments failed');
    error(res, 'فشل في جلب تعيينات المحكم', 500);
  }
});
router.get('/scores/breakdown', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
      prisma.score.findMany({ include: { team: { select: safeTeamSelect }, competition: { select: safeCompetitionSelect }, judgeScores: { include: { judge: { select: { id: true, name: true, username: true } } } }, audits: { orderBy: { createdAt: 'asc' } } }, skip, take: limit }),
      prisma.score.count(),
    ]);
    res.json(paginatedResponse({ data: rows, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin scores breakdown failed');
    error(res, 'فشل في جلب تفاصيل الدرجات', 500);
  }
});
const judgeAssignmentSchema = { params: { judgeId: zId('المحكم') }, body: { competitionId: zId('المسابقة') } };
router.post('/judges/:judgeId/assignments', validate(judgeAssignmentSchema), async (req, res) => {
  try {
    const { competitionId } = req.body;
    const row = await prisma.judgeCompetition.upsert({ where: { judgeId_competitionId: { judgeId: req.params.judgeId, competitionId } }, create: { judgeId: req.params.judgeId, competitionId }, update: {} });
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, 'admin assign judge failed');
    error(res, 'فشل في تعيين المحكم', 500);
  }
});
router.delete('/judges/:judgeId/assignments/:competitionId', validate({ params: { judgeId: zId('المحكم'), competitionId: zId('المسابقة') } }), async (req, res) => {
  try {
    await prisma.judgeCompetition.deleteMany({ where: { judgeId: req.params.judgeId, competitionId: req.params.competitionId } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin remove judge assignment failed');
    error(res, 'فشل في إزالة تعيين المحكم', 500);
  }
});
const judgeUpdateSchema = { params: { id: zId('المحكم') }, body: { name: zString('الاسم', { min: 1, max: 120 }).optional(), username: zString('اسم المستخدم', { min: 1, max: 80 }).optional(), password: zString('كلمة السر', { min: 12, max: 256 }).optional() } };
router.patch('/judges/:id', validate(judgeUpdateSchema), async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (username !== undefined) data.username = username.trim();
    if (password !== undefined) { data.passwordHash = await bcrypt.hash(password, 12); data.authVersion = { increment: 1 }; }
    res.json(await prisma.judge.update({ where: { id: req.params.id }, data, select: safeJudgeSelect }));
  } catch (err) {
    req.log.error({ err }, 'admin update judge failed');
    error(res, 'فشل في تحديث المحكم', 400);
  }
});

// Score finalization controls
const scoreUnlockSchema = { params: { id: zId('النتيجة') }, body: { reason: zString('السبب', { min: 1, max: 500 }) } };
router.post('/scores/:id/unlock', validate(scoreUnlockSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const score = await prisma.score.findUnique({ where: { id: req.params.id } }); if (!score) return error(res, 'النتيجة غير موجودة', 404);
    await prisma.$transaction([prisma.score.update({ where: { id: score.id }, data: { isFinal: false, unlockedAt: new Date(), unlockedByAdminId: req.user.id, unlockReason: reason } }), prisma.scoreAudit.create({ data: { scoreId: score.id, competitionId: score.competitionId, teamId: score.teamId, adminId: req.user.id, action: 'unlock', reason, previousData: JSON.stringify(score) } })]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin unlock score failed');
    error(res, 'فشل في فتح القفل', 500);
  }
});
router.post('/scores/:id/lock', validate({ params: { id: zId('النتيجة') } }), async (req, res) => {
  try {
    const score = await prisma.score.update({ where: { id: req.params.id }, data: { isFinal: true } });
    res.json(score);
  } catch (err) {
    req.log.error({ err }, 'admin lock score failed');
    error(res, 'فشل في قفل النتيجة', 500);
  }
});



export default router;
