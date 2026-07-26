import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();

const LEADERBOARD_CACHE_TTL_MS = Number(process.env.LEADERBOARD_CACHE_TTL_MS) || 2000;
let leaderboardCache = null;
let leaderboardCacheExpiry = 0;

export function clearLeaderboardCache() {
  leaderboardCache = null;
  leaderboardCacheExpiry = 0;
}

/**
 * Helper to calculate anonymous leaderboard with Speed Tie-Breaker
 * When scores are equal, team with earlier submission time / faster completion ranks higher!
 */
export async function getAnonymousLeaderboard() {
  const now = Date.now();
  if (leaderboardCache && now < leaderboardCacheExpiry) {
    return leaderboardCache;
  }

  const [teams, teamScores] = await Promise.all([
    prisma.team.findMany({ select: { id: true } }),
    prisma.score.groupBy({
      by: ['teamId'],
      _sum: { total: true },
      _max: { submittedAt: true },
    }),
  ]);

  const totals = new Map(teams.map(t => [t.id, { totalScore: 0, latestSubmission: Infinity }]));
  for (const row of teamScores) {
    totals.set(row.teamId, {
      totalScore: Number(row._sum.total || 0),
      latestSubmission: row._max.submittedAt ? new Date(row._max.submittedAt).getTime() : Infinity,
    });
  }

  const teamTotals = [...totals.entries()].map(([id, data]) => ({ id, totalScore: data.totalScore, latestSubmission: data.latestSubmission }));

  // Sort descending by totalScore, then ascending by submission time (speed tie-breaker)
  teamTotals.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // Tie-breaker: earlier submission wins!
    return a.latestSubmission - b.latestSubmission;
  });

  // Map to anonymous structure with ranks and gap to next
  const leaderboard = teamTotals.map((item, index) => {
    const rank = index + 1;
    const points = Math.round(item.totalScore * 10) / 10;
    const gapToNext = index > 0 ? Math.round((teamTotals[index - 1].totalScore - item.totalScore) * 10) / 10 : 0;

    return {
      rank,
      points,
      gapToNext
    };
  });

  leaderboardCache = leaderboard;
  leaderboardCacheExpiry = now + LEADERBOARD_CACHE_TTL_MS;
  return leaderboard;
}

// GET /api/leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const all = await getAnonymousLeaderboard();
    const data = all.slice(skip, skip + limit);
    res.json(paginatedResponse({ data, page, limit, total: all.length }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch leaderboard');
    res.status(500).json({ success: false, error: 'فشل في جلب الترتيب العام', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
