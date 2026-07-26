import { error } from '../response.js';
import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { startDigitalSession, saveDigitalAnswer, finalizeDigitalSession } from '../quizService.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from './leaderboard.js';
import { emitLeaderboardUpdate } from '../realtime.js';
import { idempotent } from '../middleware/idempotent.js';
import { validate, zString, zId, zNumber } from '../middleware/validate.js';

const router = Router();
const teamOnly = [authenticateToken, requireRole(['team']), enforceNotFrozen];

const zSessionId = zString('معرف الجلسة', { min: 36, max: 36 });
const startSchema = { body: { competitionId: zId('المسابقة'), entryCode: zString('كود الدخول', { max: 100 }).optional() } };
const answerSchema = { body: { sessionId: zSessionId, questionId: zString('معرف السؤال', { min: 1, max: 100 }), selectedIndex: zNumber('الإجابة المختارة', { min: 0, max: 1000, int: true }) } };
const submitSchema = { body: { sessionId: zSessionId } };

router.post('/start', ...teamOnly, validate(startSchema), async (req, res) => {
  try {
    const { competitionId, entryCode } = req.body || {};
    if (!competitionId) return error(res, 'المسابقة مطلوبة', 400);
    const result = await startDigitalSession({ teamId: req.user.id, competitionId, deviceId: req.user.deviceId, entryCode });
    if (result.finalized || result.kind === 'finalized') {
      return res.json({ success: true, finalized: true, completed: true, totalScore: result.score.total, scoreId: result.score.id });
    }
    const session = result.session;
    res.json({ sessionId: session.id, remainingSeconds: Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)), isCompleted: session.isCompleted, draftAnswers: Object.fromEntries(session.draftAnswers.map(a => [a.questionId, a.selectedIndex])) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ error }, 'failed to start quiz session');
    error(res, 'حدث خطأ أثناء بدء المسابقة', 500);
  }
});

router.post('/save-answer', ...teamOnly, validate(answerSchema), async (req, res) => {
  try {
    const { sessionId, questionId, selectedIndex } = req.body || {};
    const answer = await saveDigitalAnswer({ sessionId, teamId: req.user.id, deviceId: req.user.deviceId, questionId, selectedIndex: Number(selectedIndex) });
    res.json({ success: true, draftId: answer.id });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ error }, 'failed to save quiz answer');
    error(res, 'فشل في الحفظ اللحظي للإجابة', 500);
  }
});

router.post('/submit', ...teamOnly, validate(submitSchema), idempotent('quiz:submit'), async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const result = await finalizeDigitalSession(sessionId, req.user.id, req.user.deviceId);
    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    res.json({ success: true, totalScore: result.totalScore, scoreId: result.score.id });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ error }, 'failed to submit quiz session');
    error(res, 'حدث خطأ أثناء إنهاء المسابقة', 500);
  }
});

export { finalizeDigitalSession };
export default router;
