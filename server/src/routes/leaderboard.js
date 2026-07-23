import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * Helper to calculate anonymous leaderboard with Speed Tie-Breaker
 * When scores are equal, team with earlier submission time / faster completion ranks higher!
 */
export async function getAnonymousLeaderboard() {
  const teams = await prisma.team.findMany({
    include: { scores: true }
  });

  // Calculate totals and last submission timestamp for tie-breaking
  const teamTotals = teams.map(team => {
    const totalScore = team.scores.reduce((acc, curr) => acc + (curr.total || 0), 0);
    // Find latest submission timestamp as tie-breaker (earlier timestamp = faster)
    const latestSubmission = team.scores.reduce((latest, curr) => {
      const time = new Date(curr.submittedAt).getTime();
      return time > latest ? time : latest;
    }, 0);

    return { id: team.id, totalScore, latestSubmission };
  });

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

  return leaderboard;
}

// GET /api/leaderboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const leaderboard = await getAnonymousLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الترتيب العام' });
  }
});

export default router;
