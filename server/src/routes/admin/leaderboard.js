import { Router } from 'express';
import prisma from '../../db.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';
import { validate, zBoolean } from '../../middleware/validate.js';
import { getCompetitionField, OFFICIAL_FIELDS } from '../../competitionFields.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };

const router = Router();

router.get('/leaderboard/reveal', async (req, res) => {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'LEADERBOARD_REVEALED' }, select: { value: true } });
  res.json({ visible: setting?.value === 'true' });
});

router.post('/leaderboard/reveal', validate({ body: { visible: zBoolean('إظهار النتائج') } }), async (req, res) => {
  const visible = Boolean(req.body.visible);
  await prisma.systemSetting.upsert({ where: { key: 'LEADERBOARD_REVEALED' }, update: { value: String(visible) }, create: { key: 'LEADERBOARD_REVEALED', value: String(visible) } });
  req.io?.emit('leaderboard:visibility', { visible });
  res.json({ success: true, visible });
});

// Full Leaderboard (with internal team labels and field breakdown)
router.get('/leaderboard', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        select: { ...safeTeamSelect, scores: { include: { competition: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.team.count(),
    ]);

    const leaderboard = teams.map(team => {
      const totalScore = team.scores.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
      
      const fieldTotals = {};
      OFFICIAL_FIELDS.forEach(f => {
        fieldTotals[f] = 0;
      });

      team.scores.forEach(score => {
        const field = getCompetitionField(score.competition);
        if (field && field !== 'غير مصنف') {
          fieldTotals[field] = Math.round(((fieldTotals[field] || 0) + (Number(score.total) || 0)) * 10) / 10;
        }
      });

      const formattedScores = team.scores.map(s => ({
        id: s.id,
        competitionId: s.competitionId,
        competitionName: s.competition?.name || 'مسابقة',
        competitionSlug: s.competition?.slug || '',
        field: getCompetitionField(s.competition),
        total: Number(s.total) || 0,
        isFinal: Boolean(s.isFinal),
      }));

      return {
        id: team.id,
        label: team.label,
        username: team.username,
        totalScore: Math.round(totalScore * 10) / 10,
        scores: formattedScores,
        fieldTotals,
      };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    res.json(paginatedResponse({ data: leaderboard, page, limit, total, fields: OFFICIAL_FIELDS }));
  } catch (err) {
    req.log.error({ err }, 'admin leaderboard failed');
    res.status(500).json({ success: false, error: 'فشل في جلب الترتيب التفصيلي', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
