import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { startDigitalSession, saveDigitalAnswer, finalizeDigitalSession } from '../quizService.js';

const router = Router();
const teamOnly = [authenticateToken, requireRole(['team']), enforceNotFrozen];

router.post('/start', ...teamOnly, async (req, res) => {
  try {
    const { competitionId, entryCode } = req.body || {};
    if (!competitionId) return res.status(400).json({ error: 'المسابقة مطلوبة' });
    const session = await startDigitalSession({ teamId: req.user.id, competitionId, deviceId: req.user.deviceId, entryCode });
    res.json({ sessionId: session.id, remainingSeconds: Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)), isCompleted: session.isCompleted, draftAnswers: Object.fromEntries(session.draftAnswers.map(a => [a.questionId, a.selectedIndex])) });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'حدث خطأ أثناء بدء المسابقة' });
  }
});

router.post('/save-answer', ...teamOnly, async (req, res) => {
  try {
    const { sessionId, questionId, selectedIndex } = req.body || {};
    const answer = await saveDigitalAnswer({ sessionId, teamId: req.user.id, deviceId: req.user.deviceId, questionId, selectedIndex: Number(selectedIndex) });
    res.json({ success: true, draftId: answer.id });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'فشل في الحفظ اللحظي للإجابة' });
  }
});

router.post('/submit', ...teamOnly, async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const session = await prisma.quizSession.findUnique({ where: { id: sessionId }, select: { teamId: true, deviceId: true } });
    if (!session || session.teamId !== req.user.id) return res.status(404).json({ error: 'جلسة المسابقة غير موجودة' });
    if (session.deviceId !== req.user.deviceId) return res.status(403).json({ error: 'الجهاز لا يطابق جلسة المسابقة' });
    const result = await finalizeDigitalSession(sessionId);
    req.io?.emit('leaderboard:update');
    res.json({ success: true, totalScore: result.totalScore, scoreId: result.score.id });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.status ? error.message : 'حدث خطأ أثناء إنهاء المسابقة' });
  }
});

export { finalizeDigitalSession };
export default router;
