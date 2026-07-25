import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// GET /api/agenda
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allItems = await prisma.agendaItem.findMany({
      where: { isVisible: true },
      include: { zone: true },
      orderBy: [{ startTime: 'asc' }, { order: 'asc' }]
    });

    const activeZoneIds = new Set(allItems.map((item) => item.zoneId).filter(Boolean));

    const zones = await prisma.zone.findMany({
      where: { id: { in: Array.from(activeZoneIds) } },
      orderBy: { order: 'asc' }
    });

    res.json({ zones, agenda: allItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الجدول والمناطق' });
  }
});

export default router;
