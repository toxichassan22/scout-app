import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/news
router.get('/', authenticateToken, async (req, res) => {
  try {
    const newsList = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(newsList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الأخبار' });
  }
});

export default router;
