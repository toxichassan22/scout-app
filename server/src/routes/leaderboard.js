import { error } from '../response.js';
import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

function formatStandingRow(item, previous) {
  const points = Math.round(Number(item.totalScore || 0) * 10) / 10;
  const gapToNext = previous
    ? Math.round((Number(previous.totalScore || 0) - points) * 10) / 10
    : 0;
  return { points, gapToNext };
}

const router = Router();

export function clearLeaderboardCache() {
  // Cache removed; TeamStanding is now the single source of truth.
}

async function fetchStandingsPage(skip, limit) {
  const includePrev = skip > 0;
  const offset = includePrev ? skip - 1 : 0;
  const sqlLimit = includePrev ? limit + 1 : limit;
  const rows = await prisma.$queryRaw`
    SELECT t.id as teamId, COALESCE(s.totalScore, 0) as totalScore, s.latestSubmitted
    FROM Team t
    LEFT JOIN TeamStanding s ON t.id = s.teamId
    ORDER BY totalScore DESC,
             CASE WHEN s.latestSubmitted IS NULL THEN 1 ELSE 0 END ASC,
             s.latestSubmitted ASC
    LIMIT ${sqlLimit} OFFSET ${offset}
  `;
  const start = includePrev ? 1 : 0;
  const dataRows = rows.slice(start);
  const prevRow = includePrev ? rows[0] : null;
  const data = dataRows.map((item, index) => {
    const rank = skip + index + 1;
    const previous = index === 0 ? prevRow : dataRows[index - 1];
    const { points, gapToNext } = formatStandingRow(item, previous);
    return { rank, points, gapToNext };
  });
  const total = await prisma.team.count();
  return { data, total };
}

/**
 * Helper to calculate anonymous leaderboard from the TeamStanding table.
 * The standings are maintained inside the same transactions that write scores,
 * so the leaderboard is always up to date and indexed for fast reads.
 * Broadcasts are limited to the top N entries to avoid full-table reads.
 */
export async function getAnonymousLeaderboard(limit = Number(process.env.LEADERBOARD_BROADCAST_LIMIT) || 50) {
  const { data } = await fetchStandingsPage(0, limit);
  return data;
}

/**
 * Return the full rank for every team. Used to emit each team's own
 * standing to its private `team:{teamId}` room during live broadcasts.
 */
export async function getTeamRanks() {
  const rows = await prisma.$queryRaw`
    SELECT
      t.id as teamId,
      COALESCE(s.totalScore, 0) as totalScore,
      RANK() OVER (
        ORDER BY COALESCE(s.totalScore, 0) DESC,
                 CASE WHEN s.latestSubmitted IS NULL THEN 1 ELSE 0 END ASC,
                 s.latestSubmitted ASC
      ) as rank,
      COALESCE(
        LAG(s.totalScore) OVER (
          ORDER BY COALESCE(s.totalScore, 0) DESC,
                   CASE WHEN s.latestSubmitted IS NULL THEN 1 ELSE 0 END ASC,
                   s.latestSubmitted ASC
        ),
        0
      ) - COALESCE(s.totalScore, 0) as gapToNext
    FROM Team t
    LEFT JOIN TeamStanding s ON t.id = s.teamId
  `;

  return rows.map((item) => ({
    teamId: item.teamId,
    rank: Number(item.rank),
    points: Math.round(Number(item.totalScore || 0) * 10) / 10,
    gapToNext: Math.round(Number(item.gapToNext || 0) * 10) / 10,
  }));
}

// GET /api/leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { data, total } = await fetchStandingsPage(skip, limit);
    res.json(paginatedResponse({ data, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch leaderboard');
    error(res, 'فشل في جلب الترتيب العام', 500);
  }
});

export default router;
