import { emitLeaderboardUpdate } from '../../realtime.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from '../leaderboard.js';
import { recalculateAllTeamStandings } from '../../teamStanding.js';
import { validate, zString } from '../../middleware/validate.js';

const router = Router();

// Admin Clean Slate (Reset Test Data before Event)
const cleanSlateSchema = { body: { confirmPassword: zString('كلمة السر', { min: 1, max: 256 }) } };
router.post('/clean-slate', validate(cleanSlateSchema), async (req, res) => {
  try {
    const { confirmPassword } = req.body;
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });

    if (!admin) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const valid = await bcrypt.compare(confirmPassword || '', admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'كلمة السر غير صحيحة لتأكيد التصفير' });
    }

    // Wipe scores, draft answers, quiz sessions, and test reports
    await prisma.$transaction(async tx => {
      await tx.draftAnswer.deleteMany({});
      await tx.quizSession.deleteMany({});
      await tx.score.deleteMany({});
      await tx.report.deleteMany({});
      await tx.activityParticipant.deleteMany({});
      await tx.activitySession.deleteMany({});
      await tx.walletTransaction.deleteMany({});
      await tx.purchase.deleteMany({});
      await tx.teamWallet.deleteMany({});
      await tx.teamStanding.deleteMany({});
      await recalculateAllTeamStandings(tx);
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    req.io?.to('admin').emit('system:clean-slate');

    res.json({ success: true, message: 'تم تصفير كافة درجات وتجارب الاختبار بنجاح!' });
  } catch (err) {
    req.log.error({ err }, 'admin clean slate failed');
    res.status(500).json({ success: false, error: 'فشل في تصفير البيانات التجريبية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
