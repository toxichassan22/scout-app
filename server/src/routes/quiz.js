import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { enforceNotFrozen } from '../freeze.js';
import { startDigitalSession, saveDigitalAnswer, finalizeDigitalSession } from '../quizService.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from './leaderboard.js';
import { emitLeaderboardUpdate } from '../realtime.js';
import { idempotent } from '../middleware/idempotent.js';
import { validate, zString, zNumber } from '../middleware/validate.js';

const router = Router();
const teamOnly = [authenticateToken, requireRole(['team']), enforceNotFrozen];

const zSessionId = zString('معرف الجلسة', { min: 36, max: 36 });
const startSchema = { body: { competitionId: zString('المسابقة', { min: 1, max: 100 }), entryCode: zString('كود الدخول', { min: 0, max: 100, optional: true }) } };
const answerSchema = { body: { sessionId: zSessionId, questionId: zString('معرف السؤال', { min: 1, max: 100 }), selectedIndex: zNumber('الإجابة المختارة', { min: 0, max: 1000, int: true }) } };
const submitSchema = { body: { sessionId: zSessionId } };

router.post('/start', ...teamOnly, validate(startSchema), async (req, res) => {
  try {
    const { competitionId, entryCode } = req.body || {};
    if (!competitionId) return res.status(400).json({ error: 'المسابقة مطلوبة' });
    const result = await startDigitalSession({ teamId: req.user.id, competitionId, deviceId: req.user.deviceId, entryCode });
    if (result.finalized || result.kind === 'finalized') {
      return res.json({ success: true, finalized: true, completed: true, scoreHidden: true, scoreId: result.score.id });
    }
    const session = result.session;
    res.json({ sessionId: session.id, remainingSeconds: Math.max(0, Math.floor((new Date(session.expiresAt) - Date.now()) / 1000)), isCompleted: session.isCompleted, draftAnswers: Object.fromEntries(session.draftAnswers.map(a => [a.questionId, a.selectedIndex])) });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ error }, 'failed to start quiz session');
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء بدء المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
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
    res.status(500).json({ success: false, error: 'فشل في الحفظ اللحظي للإجابة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.post('/submit', ...teamOnly, validate(submitSchema), idempotent('quiz:submit'), async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    const result = await finalizeDigitalSession(sessionId, req.user.id, req.user.deviceId);
    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    res.json({ success: true, submitted: true, scoreHidden: true, scoreId: result.score.id });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, error: error.message, requestId: req.requestId, timestamp: new Date().toISOString() });
    req.log.error({ error }, 'failed to submit quiz session');
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء إنهاء المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export { finalizeDigitalSession };
export default router;
