import { emitLeaderboardUpdate } from '../../realtime.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from '../leaderboard.js';
import { recalculateTeamStanding } from '../../teamStanding.js';
import { validate, zString, zId, zNumber } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// Score Override (Admin Audit; requires an explicit unlock first)
const scoreOverrideSchema = {
  params: { id: zId('النتيجة') },
  body: { total: zNumber('المجموع', { min: 0 }), values: z.union([z.string(), z.record(z.unknown())]).optional(), reason: zString('السبب', { min: 1, max: 500 }) },
};
router.patch('/scores/:id', validate(scoreOverrideSchema), async (req, res) => {
  try {
    const { total, values, reason } = req.body;
    const adminId = req.user.id;
    const existing = await prisma.score.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    if (existing.isFinal) return res.status(409).json({ error: 'يجب فتح قفل النتيجة أولاً' });
    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal) || !String(reason || '').trim()) return res.status(400).json({ error: 'الدرجة وسبب التصحيح مطلوبان' });
    const score = await prisma.$transaction(async tx => {
      const updated = await tx.score.update({ where: { id: existing.id }, data: { total: numericTotal, ...(values !== undefined && { values: typeof values === 'string' ? values : JSON.stringify(values) }), editedByAdminId: adminId, editedAt: new Date(), isFinal: true } });
      await tx.scoreAudit.create({ data: { scoreId: existing.id, competitionId: existing.competitionId, teamId: existing.teamId, adminId, action: 'admin_correction', reason: String(reason).trim(), previousData: JSON.stringify(existing), newData: JSON.stringify(updated) } });
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

export default router;
