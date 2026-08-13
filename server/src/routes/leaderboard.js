import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';
import { getCompetitionField } from '../competitionFields.js';

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

async function isLeaderboardVisible() {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'LEADERBOARD_REVEALED' }, select: { value: true } });
  return setting?.value === 'true';
}

async function fetchStandingsPage(skip, limit) {
  const includePrev = skip > 0;
  const offset = includePrev ? skip - 1 : 0;
  const sqlLimit = includePrev ? limit + 1 : limit;
  const revealed = await isLeaderboardVisible();
  const rows = await prisma.$queryRaw`
    SELECT t.id as teamId, t.label as teamLabel, COALESCE(s.totalScore, 0) as totalScore, s.latestSubmitted
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
    return { rank, points, gapToNext, teamName: revealed ? item.teamLabel : null };
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
router.get('/', authenticateToken, requireRole(['admin', 'team', 'judge']), async (req, res) => {
  try {
    const revealed = await isLeaderboardVisible();
    const { page, limit, skip } = parsePagination(req.query);
    const { data, total } = await fetchStandingsPage(skip, limit);

    let myRank = null;
    let myPoints = null;
    if (req.user?.role === 'team') {
      const allTeams = await prisma.team.findMany({
        select: {
          id: true,
          label: true,
          standing: { select: { totalScore: true, latestSubmitted: true } },
          scores: { where: { isFinal: true }, select: { total: true } },
        },
      });

      const rankedTeams = allTeams.map((t) => {
        const totalFromStanding = t.standing?.totalScore !== undefined && t.standing?.totalScore !== null ? Number(t.standing.totalScore) : null;
        const totalFromScores = t.scores.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const score = totalFromStanding !== null ? totalFromStanding : totalFromScores;
        return {
          id: String(t.id),
          score: Math.round(score * 10) / 10,
          latestSubmitted: t.standing?.latestSubmitted || new Date(0),
        };
      }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.latestSubmitted).getTime() - new Date(b.latestSubmitted).getTime();
      });

      const myIndex = rankedTeams.findIndex((t) => t.id === String(req.user.id));
      if (myIndex !== -1) {
        myRank = myIndex + 1;
        myPoints = rankedTeams[myIndex].score;
      }
    }

    res.json(paginatedResponse({ data, page, limit, total, revealed, myRank, myPoints }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch leaderboard');
    res.status(500).json({ success: false, error: 'فشل في جلب الترتيب العام', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.get('/fields', authenticateToken, requireRole(['admin', 'team', 'judge']), async (req, res) => {
  try {
    const revealed = await isLeaderboardVisible();
    const teams = await prisma.team.findMany({
      orderBy: { label: 'asc' },
      select: { id: true, label: true, scores: { where: { isFinal: true }, select: { total: true, competition: { select: { slug: true } } } } },
    });
    const fields = new Map();
    teams.forEach(team => team.scores.forEach(score => {
      const field = getCompetitionField(score.competition);
      if (!fields.has(field)) fields.set(field, []);
      const row = fields.get(field).find(item => item.teamId === team.id);
      if (row) row.points += Number(score.total || 0);
      else fields.get(field).push({ teamId: team.id, teamName: revealed ? team.label : null, points: Number(score.total || 0) });
    }));
    const data = [...fields.entries()].map(([field, rows]) => ({ field, rankings: rows.sort((a, b) => b.points - a.points).map((row, index) => ({ ...row, rank: index + 1, points: Math.round(row.points * 10) / 10 })) }));
    res.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, 'failed to fetch field leaderboards');
    res.status(500).json({ success: false, error: 'فشل في جلب ترتيب المجالات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
