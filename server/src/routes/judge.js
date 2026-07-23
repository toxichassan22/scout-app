import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getAnonymousLeaderboard } from './leaderboard.js';

const router = Router();

// Apply judge authentication to all judge endpoints
router.use(authenticateToken);
router.use(requireRole(['judge']));

// Anti-Bruteforce Rate Limiter for Judge Passcodes (Memory Store)
const failedAttempts = new Map();

// Unlock competition with passcode (Protected against brute-force)
router.post('/unlock', async (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const attempts = failedAttempts.get(clientIp) || { count: 0, resetAt: 0 };

    // Check rate limit block
    if (attempts.count >= 5 && Date.now() < attempts.resetAt) {
      const waitSeconds = Math.ceil((attempts.resetAt - Date.now()) / 1000);
      return res.status(429).json({
        error: `تم حظر المحاولات مؤقتاً لحماية النظام. يُرجى الانتظار ${waitSeconds} ثانية.`
      });
    }

    const { passcode } = req.body;
    if (!passcode) {
      return res.status(400).json({ error: 'كود المسابقة مطلوب' });
    }

    const competition = await prisma.competition.findFirst({
      where: { passcode, isOpen: true, type: 'manual_judged' }
    });

    if (!competition) {
      // Record failed attempt
      const newCount = attempts.count + 1;
      failedAttempts.set(clientIp, {
        count: newCount,
        resetAt: Date.now() + 60000 // 1 minute lockout after 5 failed attempts
      });
      return res.status(404).json({ error: 'كود المسابقة غير صحيح أو المسابقة مغلقة حالياً' });
    }

    // Reset attempts on successful unlock
    failedAttempts.delete(clientIp);

    let criteria = [];
    try {
      criteria = JSON.parse(competition.criteria);
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
    console.error(err);
    res.status(500).json({ error: 'خطأ في التحقق من كود المسابقة' });
  }
});

// Get teams for evaluation
router.get('/teams/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;
    const teams = await prisma.team.findMany({
      orderBy: { label: 'asc' },
      include: {
        scores: {
          where: { competitionId }
        }
      }
    });

    // Format list with submission status
    const formattedTeams = teams.map(t => ({
      id: t.id,
      label: t.label,
      hasSubmitted: t.scores.length > 0,
      existingScore: t.scores[0] ? t.scores[0].total : null
    }));

    res.json(formattedTeams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب قائمة الفرق' });
  }
});

// Submit score
router.post('/scores', async (req, res) => {
  try {
    const { competitionId, teamId, values, total } = req.body;
    const judgeId = req.user.id;

    if (!competitionId || !teamId || total === undefined) {
      return res.status(400).json({ error: 'البيانات غير مكتملة' });
    }

    // Verify competition is open
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId }
    });

    if (!competition || !competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة أو غير موجودة' });
    }

    // Check if score already exists
    const existingScore = await prisma.score.findFirst({
      where: { competitionId, teamId }
    });

    let scoreRecord;
    if (existingScore) {
      scoreRecord = await prisma.score.update({
        where: { id: existingScore.id },
        data: {
          judgeId,
          values: typeof values === 'string' ? values : JSON.stringify(values),
          total: parseFloat(total),
          submittedAt: new Date()
        }
      });
    } else {
      scoreRecord = await prisma.score.create({
        data: {
          competitionId,
          teamId,
          judgeId,
          values: typeof values === 'string' ? values : JSON.stringify(values),
          total: parseFloat(total)
        }
      });
    }

    // Broadcast socket updates if req.io is available
    if (req.io) {
      const leaderboardData = await getAnonymousLeaderboard();
      req.io.emit('leaderboard:update', leaderboardData);
      req.io.to('admin').emit('admin:score:new', { scoreRecord, teamId, competitionId });
    }

    res.json({ success: true, score: scoreRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في حفظ التقييم' });
  }
});

export default router;
