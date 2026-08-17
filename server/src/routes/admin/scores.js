import { emitLeaderboardUpdate } from '../../realtime.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from '../leaderboard.js';
import { recalculateTeamStanding } from '../../teamStanding.js';
import { validateScoreLimit } from '../../scoreRules.js';
import { requestDataBackup } from '../../backupScheduler.js';
import { validate, zId, zNumber } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// Score Override (Admin-controlled; no unlock or explanation is required)
const scoreOverrideSchema = {
  params: { id: zId('النتيجة') },
  body: { total: zNumber('المجموع', { min: 0 }), values: z.union([z.string(), z.record(z.unknown())]).optional() },
};
router.patch('/scores/:id', validate(scoreOverrideSchema), async (req, res) => {
  try {
    const { total, values } = req.body;
    const adminId = req.user.id;
    const existing = await prisma.score.findUnique({ where: { id: req.params.id }, include: { competition: true } });
    if (!existing) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    const numericTotal = Number(total);
    const scoreCheck = validateScoreLimit(numericTotal, existing.competition);
    if (!scoreCheck.valid) return res.status(400).json({ error: scoreCheck.error });

    const score = await prisma.$transaction(async tx => {
      const updated = await tx.score.update({ where: { id: existing.id }, data: { total: numericTotal, ...(values !== undefined && { values: typeof values === 'string' ? values : JSON.stringify(values) }), editedByAdminId: adminId, editedAt: new Date() } });
      await tx.scoreAudit.create({ data: { scoreId: existing.id, competitionId: existing.competitionId, teamId: existing.teamId, adminId, action: 'admin_correction', previousData: JSON.stringify(existing), newData: JSON.stringify(updated) } });
      await recalculateTeamStanding(existing.teamId, tx);
      return updated;
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);

    res.json(score);
  } catch (err) {
    req.log.error({ err }, 'admin score override failed');
    res.status(500).json({ success: false, error: 'فشل في تعديل الدرجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/scores/:id', validate({ params: { id: zId('النتيجة') } }), async (req, res) => {
  try {
    const existing = await prisma.score.findUnique({
      where: { id: req.params.id },
      include: { competition: { select: { id: true, type: true, isOpen: true } } },
    });
    if (!existing) return res.status(404).json({ success: false, error: 'النتيجة غير موجودة', requestId: req.requestId, timestamp: new Date().toISOString() });

    await prisma.$transaction(async tx => {
      await tx.score.delete({ where: { id: existing.id } });
      await recalculateTeamStanding(existing.teamId, tx);
      if (existing.competition?.type === 'manual_judged' && existing.competition.isOpen === false) {
        await tx.competition.update({ where: { id: existing.competitionId }, data: { isOpen: true } });
      }
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    req.io?.to('admin').emit('admin:score:deleted', { scoreId: existing.id, teamId: existing.teamId, competitionId: existing.competitionId });
    requestDataBackup({ reason: 'admin-score-deleted' });

    res.json({ success: true, message: 'تم حذف الدرجة وأصبح الفريق متاحاً للتقييم من جديد' });
  } catch (err) {
    req.log.error({ err }, 'admin score delete failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الدرجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
