import { error } from '../response.js';
import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();

// GET /api/news
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [newsList, total] = await Promise.all([
      prisma.news.findMany({ orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.news.count(),
    ]);
    const visible = req.user.role === 'team' ? newsList.filter(item => {
      try { const ids = JSON.parse(item.targetTeamIds || '[]'); return !Array.isArray(ids) || ids.length === 0 || ids.includes(req.user.id); }
      catch { return true; }
    }) : newsList;
    res.json(paginatedResponse({ data: visible.map(item => ({ ...item, targetTeamIds: (() => { try { return JSON.parse(item.targetTeamIds || '[]'); } catch { return []; } })() })), page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch news');
    error(res, 'فشل في جلب الأخبار', 500);
  }
});

export default router;
