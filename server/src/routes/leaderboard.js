import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();

export function clearLeaderboardCache() {
  // Cache removed; TeamStanding is now the single source of truth.
}

async function fetchAllStandings() {
  // Single DB query: all teams, left-joined with their standing, sorted by score then submission time.
  const rows = await prisma.$queryRaw`
    SELECT t.id as teamId, COALESCE(s.totalScore, 0) as totalScore, s.latestSubmitted
    FROM Team t
    LEFT JOIN TeamStanding s ON t.id = s.teamId
    ORDER BY totalScore DESC,
             CASE WHEN s.latestSubmitted IS NULL THEN 1 ELSE 0 END ASC,
             s.latestSubmitted ASC
  `;

  return rows.map((item, index) => {
    const rank = index + 1;
    const points = Math.round(Number(item.totalScore || 0) * 10) / 10;
    const gapToNext = index > 0
      ? Math.round((Number(rows[index - 1].totalScore || 0) - points) * 10) / 10
      : 0;
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
