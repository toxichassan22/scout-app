import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { recalculateTeamStanding } from '../../teamStanding.js';
import { validate, zString, zId } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';
import { getOfficialCriteria } from '../../officialCompetitionCriteria.js';
import { ensureJudgeCompetitionAssignment } from '../../judgeAccess.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeJudgeSelect = { id: true, name: true, username: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, questionCount: true, criteria: true, createdAt: true };

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
    res.status(500).json({ success: false, error: 'فشل في جلب تعيينات المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.get('/scores/breakdown', async (req, res) => {
  try {
    const [scores, teams, competitions] = await Promise.all([
      prisma.score.findMany({ include: { team: { select: safeTeamSelect }, competition: { select: safeCompetitionSelect }, judgeScores: { include: { judge: { select: { id: true, name: true, username: true } } } }, audits: { orderBy: { createdAt: 'asc' } } } }),
      prisma.team.findMany({ orderBy: { label: 'asc' }, select: safeTeamSelect }),
      prisma.competition.findMany({ orderBy: { name: 'asc' }, select: safeCompetitionSelect }),
    ]);

    // Some older deployments contain the same competition twice under
    // different records. Keep one visible competition per name, preferring
    // the record that already has submitted scores.
    const cleanCompName = name => String(name || '').replace(/\s*\(.*?\)\s*/g, '').replace(/المعرض الكشفي/g, '').trim();
    const scoreCountByCompetition = new Map();
    for (const score of scores) scoreCountByCompetition.set(score.competitionId, (scoreCountByCompetition.get(score.competitionId) || 0) + 1);
    const uniqueCompetitions = [...competitions].sort((a, b) => {
      const scoreDelta = (scoreCountByCompetition.get(b.id) || 0) - (scoreCountByCompetition.get(a.id) || 0);
      return scoreDelta || String(a.createdAt).localeCompare(String(b.createdAt));
    }).filter((competition, index, list) => list.findIndex(item => cleanCompName(item.name) === cleanCompName(competition.name)) === index);

    // Return a complete team x competition matrix for the admin screen. Missing
    // combinations are display-only zeroes; no Score row is created, so a judge
    // can still submit the team's first real result normally.
    const scoreByKey = new Map(scores.map(score => [`${score.teamId}:${score.competitionId}`, score]));
    const rows = [];
    for (const team of teams) {
      for (const competition of uniqueCompetitions) {
        const existing = scoreByKey.get(`${team.id}:${competition.id}`);
        if (existing) {
          const officialCriteria = getOfficialCriteria(existing.competition);
          if (officialCriteria) existing.competition.criteria = officialCriteria;
          rows.push(existing);
          continue;
        }
        const displayCompetition = { ...competition, ...(getOfficialCriteria(competition) ? { criteria: getOfficialCriteria(competition) } : {}) };
        rows.push({
          id: null,
          teamId: team.id,
          competitionId: competition.id,
          team,
          competition: displayCompetition,
          total: 0,
          isFinal: true,
          isVirtual: true,
          values: '{}',
          judgeScores: [],
          audits: [],
        });
      }
    }

    res.json(paginatedResponse({ data: rows, page: 1, limit: Math.max(rows.length, 1), total: rows.length }));
  } catch (err) {
    req.log.error({ err }, 'admin scores breakdown failed');
    res.status(500).json({ success: false, error: 'فشل في جلب تفاصيل الدرجات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
const judgeAssignmentSchema = { params: { judgeId: zId('المحكم') }, body: { competitionId: zId('المسابقة') } };
router.post('/judges/:judgeId/assignments', validate(judgeAssignmentSchema), async (req, res) => {
  try {
    const { competitionId } = req.body;
    const { judgeId } = req.params;
    const result = await ensureJudgeCompetitionAssignment(prisma, competitionId, judgeId);
    res.status(result.created ? 201 : 200).json({ ...result.assignment, assignmentCount: result.count, maxAssignments: 2 });
  } catch (err) {
    req.log.error({ err }, 'admin assign judge failed');
    res.status(err.status || 500).json({ success: false, error: err.status ? err.message : 'فشل في تعيين المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.delete('/judges/:judgeId/assignments/:competitionId', validate({ params: { judgeId: zId('المحكم'), competitionId: zId('المسابقة') } }), async (req, res) => {
  try {
    await prisma.$transaction([
      prisma.judgeCompetition.deleteMany({ where: { judgeId: req.params.judgeId, competitionId: req.params.competitionId } }),
      prisma.judgeTeamClaim.deleteMany({ where: { judgeId: req.params.judgeId, competitionId: req.params.competitionId } }),
    ]);
    req.io?.to('judge').emit('judge:team:released', { competitionId: req.params.competitionId, judgeId: req.params.judgeId });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin remove judge assignment failed');
    res.status(500).json({ success: false, error: 'فشل في إزالة تعيين المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Score finalization controls
const scoreUnlockSchema = { params: { id: zId('النتيجة') }, body: {} };
router.post('/scores/:id/unlock', validate(scoreUnlockSchema), async (req, res) => {
  try {
    const score = await prisma.score.findUnique({ where: { id: req.params.id } }); if (!score) return res.status(404).json({ success: false, error: 'النتيجة غير موجودة', requestId: req.requestId, timestamp: new Date().toISOString() });
    await prisma.$transaction(async tx => {
      await tx.score.update({ where: { id: score.id }, data: { isFinal: false, unlockedAt: new Date(), unlockedByAdminId: req.user.id, unlockReason: null } });
      await tx.scoreAudit.create({ data: { scoreId: score.id, competitionId: score.competitionId, teamId: score.teamId, adminId: req.user.id, action: 'unlock', previousData: JSON.stringify(score) } });
      await recalculateTeamStanding(score.teamId, tx);
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin unlock score failed');
    res.status(500).json({ success: false, error: 'فشل في فتح القفل', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.post('/scores/:id/lock', validate({ params: { id: zId('النتيجة') } }), async (req, res) => {
  try {
    const score = await prisma.$transaction(async tx => {
      const updated = await tx.score.update({ where: { id: req.params.id }, data: { isFinal: true } });
      await recalculateTeamStanding(updated.teamId, tx);
      return updated;
    });
    res.json(score);
  } catch (err) {
    req.log.error({ err }, 'admin lock score failed');
    res.status(500).json({ success: false, error: 'فشل في قفل النتيجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});



export default router;
