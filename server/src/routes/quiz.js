import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * 1️⃣ POST /api/quiz/start
 * Starts or re-connects a team's digital quiz session with strict device lock.
 */
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { competitionId, deviceId } = req.body;
    const teamId = req.user.id;

    if (req.user.role !== 'team') {
      return res.status(403).json({ error: 'مسموح للفرق فقط بخوض المسابقات الرقمية' });
    }

    if (!competitionId || !deviceId) {
      return res.status(400).json({ error: 'المسابقة ومعرف الجهاز مطلوبان' });
    }

    // Check competition status
    const comp = await prisma.competition.findUnique({ where: { id: competitionId } });
    if (!comp || !comp.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً أو غير موجودة' });
    }

    // Check if score is already submitted and final
    const existingScore = await prisma.score.findUnique({
      where: { competitionId_teamId: { competitionId, teamId } }
    });

    if (existingScore) {
      return res.status(400).json({ error: 'لقد أكمل فريقك هذه المسابقة بالفعل!' });
    }

    // Check for active quiz session for this team & competition
    let session = await prisma.quizSession.findUnique({
      where: { teamId_competitionId: { teamId, competitionId } },
      include: { draftAnswers: true }
    });

    const now = new Date();

    if (session) {
      // Check device lock
      if (session.deviceId !== deviceId) {
        return res.status(409).json({
          error: 'فريقك يقوم بحل هذه المسابقة حالياً من جهاز آخر! لا يمكن خوض المسابقة من جهازين في نفس الوقت.'
        });
      }

      // Check if session expired
      if (now > session.expiresAt && !session.isCompleted) {
        // Auto-finalize session draft answers
        await finalizeQuizSession(session.id);
        return res.status(400).json({ error: 'انتهى وقت المسابقة وتم حفظ إجاباتك تلقائياً.' });
      }
    } else {
      // Create new session with server-calculated timer
      const durationSeconds = comp.duration || 600; // default 10 mins
      const expiresAt = new Date(now.getTime() + durationSeconds * 1000);

      session = await prisma.quizSession.create({
        data: {
          teamId,
          competitionId,
          deviceId,
          startedAt: now,
          expiresAt
        },
        include: { draftAnswers: true }
      });
    }

    // Calculate remaining seconds
    const remainingSeconds = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));

    res.json({
      sessionId: session.id,
      remainingSeconds,
      isCompleted: session.isCompleted,
      draftAnswers: session.draftAnswers.reduce((acc, curr) => {
        acc[curr.questionId] = curr.selectedIndex;
        return acc;
      }, {})
    });

  } catch (err) {
    console.error('[Quiz Start Error]:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء بدء المسابقة' });
  }
});

/**
 * 2️⃣ POST /api/quiz/save-answer
 * Realtime Auto-Save for each question choice.
 */
router.post('/save-answer', authenticateToken, async (req, res) => {
  try {
    const { sessionId, questionId, selectedIndex, deviceId } = req.body;
    const teamId = req.user.id;

    if (!sessionId || !questionId || selectedIndex === undefined || !deviceId) {
      return res.status(400).json({ error: 'بيانات الإجابة غير مكتملة' });
    }

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { draftAnswers: true }
    });

    if (!session || session.teamId !== teamId) {
      return res.status(404).json({ error: 'جلسة المسابقة غير موجودة' });
    }

    if (session.deviceId !== deviceId) {
      return res.status(403).json({ error: 'غير مسموح بحفظ الإجابات من جهاز مغاير للجهاز الذي بدأ المسابقة' });
    }

    if (session.isCompleted || new Date() > session.expiresAt) {
      return res.status(400).json({ error: 'انتهت المسابقة، لا يمكن قبول المزيد من الإجابات' });
    }

    // Fetch question to check correctness
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) {
      return res.status(404).json({ error: 'السؤال غير موجود' });
    }

    const isCorrect = question.correctOption === selectedIndex;
    const pointsEarned = isCorrect ? question.points : 0;

    // Upsert draft answer
    const draft = await prisma.draftAnswer.upsert({
      where: {
        sessionId_questionId: { sessionId, questionId }
      },
      update: {
        selectedIndex,
        isCorrect,
        pointsEarned,
        savedAt: new Date()
      },
      create: {
        sessionId,
        questionId,
        selectedIndex,
        isCorrect,
        pointsEarned
      }
    });

    res.json({ success: true, draftId: draft.id });

  } catch (err) {
    console.error('[Quiz Auto-Save Error]:', err);
    res.status(500).json({ error: 'فشل في الحفظ اللحظي للإجابة' });
  }
});

/**
 * 3️⃣ POST /api/quiz/submit
 * Explicit submission & total calculation.
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { sessionId, deviceId } = req.body;
    const teamId = req.user.id;

    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId },
      include: { draftAnswers: true }
    });

    if (!session || session.teamId !== teamId) {
      return res.status(404).json({ error: 'جلسة المسابقة غير موجودة' });
    }

    if (session.deviceId !== deviceId) {
      return res.status(403).json({ error: 'غير مسموح بتقديم المسابقة من جهاز غير الجهاز الذي بدأ المسابقة' });
    }

    const result = await finalizeQuizSession(session.id);

    // Broadcast Leaderboard update via Socket.io
    if (req.io) {
      req.io.emit('leaderboard:update');
    }

    res.json({ success: true, totalScore: result.totalScore });

  } catch (err) {
    console.error('[Quiz Submit Error]:', err);
    res.status(500).json({ error: 'حدث خطأ أثناء إنهاء المسابقة' });
  }
});

/**
 * Helper function to finalize quiz score in the Score table
 */
export async function finalizeQuizSession(sessionId) {
  const session = await prisma.quizSession.findUnique({
    where: { id: sessionId },
    include: { draftAnswers: true }
  });

  if (!session) return { totalScore: 0 };

  // Calculate total score from draft answers
  const totalScore = session.draftAnswers.reduce((sum, item) => sum + (item.pointsEarned || 0), 0);

  // Upsert into main Score table
  await prisma.score.upsert({
    where: {
      competitionId_teamId: {
        competitionId: session.competitionId,
        teamId: session.teamId
      }
    },
    update: {
      total: totalScore,
      submittedAt: new Date()
    },
    create: {
      competitionId: session.competitionId,
      teamId: session.teamId,
      total: totalScore,
      submittedAt: new Date()
    }
  });

  // Mark session as completed
  await prisma.quizSession.update({
    where: { id: sessionId },
    data: {
      isCompleted: true,
      completedAt: new Date()
    }
  });

  return { totalScore };
}

export default router;
