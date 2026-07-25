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
      orderBy: { startTime: 'asc' }
    });

    const allZones = await prisma.zone.findMany({
      orderBy: { order: 'asc' }
    });

    // The database can contain both legacy zone-* rows and the current official
    // rows after schedule reseeding. Resolve the eight numbered locations once,
    // preferring their official IDs, so duplicate records never create extra pins.
    const officialZoneIds = [
      'zone-mosque',
      'zone-field',
      'zone-behind-mosque',
      'zone-new-building',
      'zone-camp',
      'zone-fountain',
      'zone-radio',
      'zone-online'
    ];
    const zonesByNumber = new Map(allZones.map((zone) => [zone.numberLabel, zone]));
    const zones = officialZoneIds.map((id, index) => (
      allZones.find((zone) => zone.id === id)
      || zonesByNumber.get(['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨'][index])
    )).filter(Boolean);

    res.json({ zones, agenda: allItems });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الجدول والمناطق' });
  }
});

export default router;
