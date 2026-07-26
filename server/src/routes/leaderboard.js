import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();

export function clearLeaderboardCache() {
  // Cache removed; TeamStanding is now the single source of truth.
}

async function fetchAllStandings() {
  const [standings, teams] = await Promise.all([
    prisma.teamStanding.findMany(),
    prisma.team.findMany({ select: { id: true } }),
  ]);

  const standingIds = new Set(standings.map((s) => s.teamId));
  const missing = teams
    .filter((t) => !standingIds.has(t.id))
    .map((t) => ({
      id: t.id,
      totalScore: 0,
      latestSubmission: 0,
    }));

  const teamTotals = [
    ...standings.map((s) => ({
      id: s.teamId,
      totalScore: Number(s.totalScore || 0),
      latestSubmission: s.latestSubmitted ? new Date(s.latestSubmitted).getTime() : 0,
    })),
    ...missing,
  ];

  // Sort descending by totalScore, then ascending by submission time (speed tie-breaker)
  teamTotals.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.latestSubmission - b.latestSubmission;
  });

  return teamTotals.map((item, index) => {
    const rank = index + 1;
    const points = Math.round(item.totalScore * 10) / 10;
    const gapToNext = index > 0 ? Math.round((teamTotals[index - 1].totalScore - item.totalScore) * 10) / 10 : 0;
    return { rank, points, gapToNext };
  });
}

/**
 * Helper to calculate anonymous leaderboard from the TeamStanding table.
 * The standings are maintained inside the same transactions that write scores,
 * so the leaderboard is always up to date and indexed for fast reads.
 */
export async function getAnonymousLeaderboard() {
  return fetchAllStandings();
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
