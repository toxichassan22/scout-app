import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { OFFICIAL_ZONES, getAgendaStatus } from '../agendaCanonical.js';
import { parsePagination } from '../pagination.js';

const router = Router();
const LEGACY_ZONE_ALIASES = {
  'zone-mosque': 'zone-3', 'zone-field': 'zone-6', 'zone-behind-mosque': 'zone-2',
  'zone-new-building': 'zone-4', 'zone-camp': 'zone-5', 'zone-fountain': 'zone-7',
  'zone-radio': 'zone-8', 'zone-online': 'zone-2'
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    // The database is the source of truth. Do not filter by the old canonical ID
    // list, otherwise events added or renamed by the admin disappear from teams.
    const where = { isVisible: true };
    const [allItems, total] = await Promise.all([
      prisma.agendaItem.findMany({
        where,
        include: { zone: true },
        orderBy: [{ order: 'asc' }, { startTime: 'asc' }, { id: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.agendaItem.count({ where }),
    ]);
    const competitionIds = [...new Set(allItems.map(item => item.competitionId).filter(Boolean))];
    const linkedCompetitions = await prisma.competition.findMany({
      where: { id: { in: competitionIds } },
      select: { id: true, name: true, slug: true, type: true, description: true, details: true, isOpen: true, duration: true, criteria: true },
    });
    const competitionById = new Map(linkedCompetitions.map(competition => [competition.id, competition]));
    const storedZones = await prisma.zone.findMany({ orderBy: { order: 'asc' } });
    const storedById = new Map(storedZones.map((zone) => [zone.id, zone]));
    const zones = OFFICIAL_ZONES.map((official) => ({ ...storedById.get(official.id), ...official }));
    const zoneById = new Map(zones.map((zone) => [zone.id, zone]));
    const agenda = allItems.map((item) => {
      const zoneId = LEGACY_ZONE_ALIASES[item.zoneId] || item.zoneId;
      const linkedCompetition = competitionById.get(item.competitionId) || null;
      let scheduleStatus = 'upcoming';
      if (item.isClosed) {
        scheduleStatus = 'closed';
      } else if (item.isStarted || linkedCompetition?.isOpen === true) {
        scheduleStatus = 'active';
      } else if (linkedCompetition?.isOpen === false) {
        scheduleStatus = 'closed';
      } else {
        scheduleStatus = getAgendaStatus(item);
      }

      return {
        ...item,
        title: linkedCompetition?.name || item.title,
        zoneId,
        zone: zoneById.get(zoneId) || item.zone,
        locationLabel: item.locationNote || zoneById.get(zoneId)?.name || item.zone?.name || '',
        competition: linkedCompetition,
        status: scheduleStatus,
        canOpen: scheduleStatus === 'active',
      };
    });
    const totalPages = Math.ceil(total / limit) || 1;
    res.json({ success: true, zones, agenda, festivalDate: process.env.FESTIVAL_DATE || '2026-08-21', pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 }, timestamp: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, 'failed to fetch agenda');
    res.status(500).json({ success: false, error: 'فشل في جلب الجدول والمناطق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
