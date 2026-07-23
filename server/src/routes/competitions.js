import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getAnonymousLeaderboard } from './leaderboard.js';

const router = Router();

const normalizeArabic = (value = '') =>
  String(value)
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ');

const parseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const publicCompetition = (comp, myScore = null) => ({
  id: comp.id,
  name: comp.name,
  slug: comp.slug,
  type: comp.type,
  description: comp.description || '',
  isOpen: comp.isOpen,
  duration: comp.duration,
  hasEntryCode: Boolean(comp.entryCode),
  completed: Boolean(myScore),
  myTotal: myScore ? myScore.total : null,
  attemptCount:
    myScore && myScore.values
      ? (parseJson(myScore.values, {}).attempts || []).length
      : 0,
});

// List competitions for teams
router.get('/', authenticateToken, requireRole(['team', 'admin']), async (req, res) => {
  try {
    const comps = await prisma.competition.findMany({
      orderBy: { createdAt: 'asc' },
    });

    let myScores = [];
    if (req.user.role === 'team') {
      myScores = await prisma.score.findMany({
        where: { teamId: req.user.id },
      });
    }
    const scoreByComp = Object.fromEntries(myScores.map((s) => [s.competitionId, s]));

    res.json(comps.map((c) => publicCompetition(c, scoreByComp[c.id])));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب المسابقات' });
  }
});

// Unlock / enter competition (optional entry code)
router.post('/:idOrSlug/enter', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { entryCode } = req.body || {};

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }

    if (competition.entryCode && competition.entryCode !== String(entryCode || '').trim()) {
      return res.status(403).json({ error: 'كود الدخول غير صحيح' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    // Video allows multiple attempts; others are one-shot
    if (existing && competition.slug !== 'video') {
      return res.status(400).json({
        error: 'تم تسجيل إجابتك مسبقاً في هذه المسابقة',
        completed: true,
        total: existing.total,
      });
    }

    res.json({
      ok: true,
      competition: publicCompetition(competition, existing),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في دخول المسابقة' });
  }
});

// Play pack: questions/countries WITHOUT answers
router.get('/:idOrSlug/play', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
      include: { questions: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    if (existing && competition.slug !== 'video') {
      return res.status(400).json({
        error: 'تم تسجيل إجابتك مسبقاً',
        completed: true,
        total: existing.total,
      });
    }

    if (competition.slug === 'geography') {
      const countries = await prisma.geographyCountry.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return res.json({
        competition: publicCompetition(competition, existing),
        countries: countries.map((c) => ({
          id: c.id,
          capital: c.capital,
          currency: c.currency,
          flag: c.flag,
          mapUrl: c.mapUrl,
          // name withheld for server-side grading
        })),
      });
    }

    if (competition.slug === 'video') {
      const values = existing ? parseJson(existing.values, {}) : {};
      return res.json({
        competition: publicCompetition(competition, existing),
        attempts: values.attempts || [],
        maxAttempts: 3,
      });
    }

    // two_truths / genius / generic auto
    const questions = competition.questions.map((q) => {
      const options = parseJson(q.options, []);
      const safeOptions = options.map((opt) => {
        if (typeof opt === 'string') return opt;
        return opt.text || '';
      });
      return {
        id: q.id,
        text: q.text,
        options: safeOptions,
        points: q.points,
      };
    });

    res.json({
      competition: publicCompetition(competition, existing),
      questions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في تحميل محتوى المسابقة' });
  }
});

async function upsertScore({ competitionId, teamId, total, values, judgeId = null }) {
  return prisma.score.upsert({
    where: {
      competitionId_teamId: { competitionId, teamId },
    },
    create: {
      competitionId,
      teamId,
      judgeId,
      total,
      values: typeof values === 'string' ? values : JSON.stringify(values || {}),
    },
    update: {
      judgeId,
      total,
      values: typeof values === 'string' ? values : JSON.stringify(values || {}),
      submittedAt: new Date(),
    },
  });
}

async function emitLeaderboard(req) {
  if (req.io) {
    const leaderboardData = await getAnonymousLeaderboard();
    req.io.emit('leaderboard:update', leaderboardData);
  }
}

// Submit auto-digital answers (server grades)
router.post('/:idOrSlug/submit', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { answers } = req.body || {};

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
      include: { questions: true },
    });

    if (!competition) {
      return res.status(404).json({ error: 'المسابقة غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }
    if (competition.type !== 'auto_digital' && competition.slug !== 'geography') {
      return res.status(400).json({ error: 'هذه المسابقة لا تُصحَّح تلقائياً' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });
    if (existing) {
      return res.status(400).json({ error: 'تم تسجيل إجابتك مسبقاً', total: existing.total });
    }

    let total = 0;
    const detail = [];

    if (competition.slug === 'geography') {
      const countries = await prisma.geographyCountry.findMany();
      const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
      const answerList = Array.isArray(answers) ? answers : [];

      for (const item of answerList) {
        const country = byId[item.countryId];
        if (!country) continue;
        const correct =
          normalizeArabic(item.answer) === normalizeArabic(country.name);
        const points = correct ? 10 : 0;
        total += points;
        detail.push({ countryId: item.countryId, correct, points });
      }
    } else {
      const byId = Object.fromEntries(competition.questions.map((q) => [q.id, q]));
      const answerList = Array.isArray(answers) ? answers : [];

      for (const item of answerList) {
        const q = byId[item.questionId];
        if (!q) continue;
        const selected = parseInt(item.selectedIndex, 10);
        const correct = selected === q.correctOption;
        const points = correct ? Number(q.points || 0) : 0;
        total += points;
        detail.push({ questionId: q.id, correct, points });
      }
    }

    const score = await upsertScore({
      competitionId: competition.id,
      teamId: req.user.id,
      total,
      values: { mode: 'auto', detail },
      judgeId: null,
    });

    await emitLeaderboard(req);

    res.json({
      success: true,
      total: score.total,
      scoreId: score.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في تسجيل النتيجة' });
  }
});

// Video attempt (max 3) — score stays 0 until judged
router.post('/:idOrSlug/video-attempt', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { prompt, videoUrl } = req.body || {};

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });

    if (!competition || competition.slug !== 'video') {
      return res.status(404).json({ error: 'مسابقة الفيديو غير موجودة' });
    }
    if (!competition.isOpen) {
      return res.status(400).json({ error: 'المسابقة مغلقة حالياً' });
    }
    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'البرومبت مطلوب' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });

    const values = existing ? parseJson(existing.values, {}) : {};
    const attempts = Array.isArray(values.attempts) ? values.attempts : [];

    if (attempts.length >= 3) {
      return res.status(400).json({ error: 'تم استنفاد الحد الأقصى (3 محاولات)' });
    }

    attempts.push({
      id: crypto.randomUUID(),
      prompt: String(prompt).trim(),
      videoUrl: videoUrl || null,
      videoStatus: videoUrl ? 'generated' : 'pending',
      at: new Date().toISOString(),
    });

    const score = await upsertScore({
      competitionId: competition.id,
      teamId: req.user.id,
      total: existing?.total || 0,
      values: { ...values, attempts },
      judgeId: existing?.judgeId || null,
    });

    res.json({
      success: true,
      attempts,
      remaining: Math.max(0, 3 - attempts.length),
      scoreId: score.id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في حفظ محاولة الفيديو' });
  }
});

// Update video URL on an attempt
router.patch('/:idOrSlug/video-attempt/:attemptId', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const key = req.params.idOrSlug;
    const { attemptId } = req.params;
    const { videoUrl } = req.body || {};

    const competition = await prisma.competition.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
    });
    if (!competition || competition.slug !== 'video') {
      return res.status(404).json({ error: 'مسابقة الفيديو غير موجودة' });
    }

    const existing = await prisma.score.findUnique({
      where: {
        competitionId_teamId: {
          competitionId: competition.id,
          teamId: req.user.id,
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ error: 'لا توجد محاولات محفوظة' });
    }

    const values = parseJson(existing.values, {});
    const attempts = Array.isArray(values.attempts) ? values.attempts : [];
    const idx = attempts.findIndex((a) => a.id === attemptId);
    if (idx < 0) {
      return res.status(404).json({ error: 'المحاولة غير موجودة' });
    }

    attempts[idx] = {
      ...attempts[idx],
      videoUrl: videoUrl || attempts[idx].videoUrl,
      videoStatus: videoUrl ? 'generated' : attempts[idx].videoStatus,
    };

    await upsertScore({
      competitionId: competition.id,
      teamId: req.user.id,
      total: existing.total,
      values: { ...values, attempts },
      judgeId: existing.judgeId,
    });

    res.json({ success: true, attempts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحديث الفيديو' });
  }
});

export default router;
