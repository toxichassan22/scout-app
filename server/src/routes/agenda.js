import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { OFFICIAL_AGENDA_IDS, OFFICIAL_ZONES, getAgendaStatus } from '../agendaCanonical.js';

const router = Router();
const LEGACY_ZONE_ALIASES = {
  'zone-mosque': 'zone-3', 'zone-field': 'zone-6', 'zone-behind-mosque': 'zone-2',
  'zone-new-building': 'zone-4', 'zone-camp': 'zone-5', 'zone-fountain': 'zone-7',
  'zone-radio': 'zone-8', 'zone-online': 'zone-2'
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const allItems = await prisma.agendaItem.findMany({
      where: { id: { in: OFFICIAL_AGENDA_IDS }, isVisible: true },
      include: { zone: true },
      orderBy: [{ order: 'asc' }, { startTime: 'asc' }, { id: 'asc' }]
    });
    const storedZones = await prisma.zone.findMany({ orderBy: { order: 'asc' } });
    const storedById = new Map(storedZones.map((zone) => [zone.id, zone]));
    const zones = OFFICIAL_ZONES.map((official) => ({ ...storedById.get(official.id), ...official }));
    const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
    const agenda = allItems.map((item) => {
      const zoneId = LEGACY_ZONE_ALIASES[item.zoneId] || item.zoneId;
      return {
        ...item,
        zoneId,
        zone: zoneById.get(zoneId) || item.zone,
        status: getAgendaStatus(item),
        canOpen: getAgendaStatus(item) === 'active'
      };
    });
    res.json({ zones, agenda, festivalDate: process.env.FESTIVAL_DATE || '2026-08-21' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الجدول والمناطق' });
  }
});

export default router;
