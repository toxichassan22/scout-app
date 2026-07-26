import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/news
router.get('/', authenticateToken, async (req, res) => {
  try {
    const newsList = await prisma.news.findMany({ orderBy: { createdAt: 'desc' } });
    const visible = req.user.role === 'team' ? newsList.filter(item => {
      try { const ids = JSON.parse(item.targetTeamIds || '[]'); return !Array.isArray(ids) || ids.length === 0 || ids.includes(req.user.id); }
      catch { return true; }
    }) : newsList;
    res.json(visible.map(item => ({ ...item, targetTeamIds: (() => { try { return JSON.parse(item.targetTeamIds || '[]'); } catch { return []; } })() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الأخبار' });
  }
});

export default router;
