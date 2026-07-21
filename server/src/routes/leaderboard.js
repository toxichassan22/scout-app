import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Helper to calculate anonymous leaderboard
export async function getAnonymousLeaderboard() {
  const teams = await prisma.team.findMany({
    include: { scores: true }
  });

  // Calculate totals
  const teamTotals = teams.map(team => {
    const totalScore = team.scores.reduce((acc, curr) => acc + (curr.total || 0), 0);
    return { id: team.id, totalScore };
  });

  // Sort descending
  teamTotals.sort((a, b) => b.totalScore - a.totalScore);

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
