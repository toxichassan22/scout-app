import { error } from '../../response.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };

const router = Router();

// Full Leaderboard (with internal team labels)
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
      const totalScore = team.scores.reduce((acc, curr) => acc + (curr.total || 0), 0);
      return {
        id: team.id,
        label: team.label,
        username: team.username,
        totalScore: Math.round(totalScore * 10) / 10,
        scores: team.scores
      };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    res.json(paginatedResponse({ data: leaderboard, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin leaderboard failed');
    error(res, 'فشل في جلب الترتيب التفصيلي', 500);
  }
});

export default router;
