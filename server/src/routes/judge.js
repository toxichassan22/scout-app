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
      where: { passcode, isOpen: true, type: 'manual_judged', judgeAssignments: { some: { judgeId: req.user.id } } }
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

// Get teams for evaluation (including submitted report for this competition)
router.get('/teams/:competitionId', async (req, res) => {
  try {
    const { competitionId } = req.params;

    const competition = await prisma.competition.findFirst({
      where: { id: competitionId, judgeAssignments: { some: { judgeId: req.user.id } } }
    });
    if (!competition) return res.status(403).json({ error: 'المحكم غير مكلف بهذه المسابقة' });

    const teams = await prisma.team.findMany({
      orderBy: { label: 'asc' },
      include: {
        scores: {
          where: { competitionId }
        },
        reports: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    // Format list with submission status and matched competition report
    const formattedTeams = teams.map(t => {
      // Find report specifically for this competition ID or by matching title
      const compReport = (t.reports || []).find(
        r => r.competitionId === competitionId || (competition && r.title === competition.name)
      );

      const finalized = Boolean(t.scores[0]?.isFinal);
      return {
        id: t.id,
        label: t.label,
        hasSubmitted: t.scores.length > 0,
        isFinal: finalized,
        existingScore: finalized ? null : (t.scores[0] ? t.scores[0].total : null),
        report: !finalized && compReport ? {
          id: compReport.id,
          title: compReport.title,
          content: compReport.content,
          fileUrl: compReport.fileUrl,
          createdAt: compReport.uploadedAt
        } : null
      };
    });

    res.json(formattedTeams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب قائمة الفرق والتقارير' });
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

    // Verify assignment and competition is open
    const competition = await prisma.competition.findUnique({
      where: { id: competitionId, judgeAssignments: { some: { judgeId } } }
    });

    if (!competition || !competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة أو غير موجودة' });
    }

    let parsedValues;
    try { parsedValues = typeof values === 'string' ? JSON.parse(values) : values; } catch { return res.status(400).json({ error: 'قيم التقييم ليست JSON صالحاً' }); }
    if (!parsedValues || typeof parsedValues !== 'object' || Array.isArray(parsedValues)) return res.status(400).json({ error: 'قيم التقييم غير صالحة' });
    let criteria = []; try { criteria = JSON.parse(competition.criteria || '[]'); } catch { return res.status(400).json({ error: 'معايير المسابقة غير صالحة' }); }
    const expected = new Set(criteria.map(c => String(c.key)));
    if (expected.size && (Object.keys(parsedValues).length !== expected.size || Object.keys(parsedValues).some(k => !expected.has(k)))) return res.status(400).json({ error: 'يجب إرسال جميع معايير المسابقة فقط' });
    let calculated = 0;
    for (const criterion of criteria) { const n = Number(parsedValues[criterion.key]); const max = Number(criterion.maxScore); if (!Number.isFinite(n) || n < 0 || !Number.isFinite(max) || n > max) return res.status(400).json({ error: `قيمة المعيار ${criterion.key} غير صالحة` }); calculated += n; }
    if (Math.abs(calculated - Number(total)) > 0.0001) return res.status(400).json({ error: 'المجموع لا يطابق قيم المعايير' });

    // Check if score already exists
    const existingScore = await prisma.score.findFirst({
      where: { competitionId, teamId }
    });

    if (existingScore?.isFinal) return res.status(409).json({ error: 'تم اعتماد التقييم نهائياً ولا يمكن تعديله' });
    if (existingScore) return res.status(409).json({ error: 'لا يحق للمحكم تعديل نتيجة قائمة؛ التصحيح متاح للإدارة فقط' });
    const scoreRecord = await prisma.score.create({ data: { competitionId, teamId, judgeId, values: JSON.stringify(parsedValues), total: calculated, isFinal: true } });
    await prisma.$transaction([
      prisma.judgeScore.create({ data: { scoreId: scoreRecord.id, competitionId, teamId, judgeId, values: JSON.stringify(parsedValues), total: calculated } }),
      prisma.scoreAudit.create({ data: { scoreId: scoreRecord.id, competitionId, teamId, judgeId, action: 'judge_submit', newData: JSON.stringify({ values: parsedValues, total: calculated }) } })
    ]);

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
