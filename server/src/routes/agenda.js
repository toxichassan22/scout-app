import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const OFFICIAL_ZONES = [
  { id: 'zone-1', numberLabel: '١', name: 'مبنى الإدارة', description: 'المقر الإداري واستقبال الوفود', colorHex: '#ef4444', order: 1 },
  { id: 'zone-2', numberLabel: '٢', name: 'مبنى الأنشطة', description: 'منطقة الورش والمسابقات والأنشطة', colorHex: '#10b981', order: 2 },
  { id: 'zone-3', numberLabel: '٣', name: 'المسجد', description: 'مكان الصلاة والمصلى الرئيسي', colorHex: '#f59e0b', order: 3 },
  { id: 'zone-4', numberLabel: '٤', name: 'المبنى الجديد', description: 'قاعات المحاضرات والتقييمات', colorHex: '#3b82f6', order: 4 },
  { id: 'zone-5', numberLabel: '٥', name: 'المخيم الكشفي', description: 'أرض المخيم والأنشطة الكشفية', colorHex: '#8b5cf6', order: 5 },
  { id: 'zone-6', numberLabel: '٦', name: 'ملعب كرة القدم', description: 'ملعب كرة القدم والعروض الميدانية', colorHex: '#06b6d4', order: 6 },
  { id: 'zone-7', numberLabel: '٧', name: 'ملعب كرة السلة', description: 'ملعب كرة السلة والأنشطة الرياضية', colorHex: '#ec4899', order: 7 },
  { id: 'zone-8', numberLabel: '٨', name: 'ملعب الخماسي', description: 'ملعب الخماسي والألعاب الرياضية', colorHex: '#14b8a6', order: 8 }
];

// IDs from earlier schedule seeds are normalized only in this public response. The
// underlying rows remain available so existing admin-created agenda data is safe.
const LEGACY_ZONE_ALIASES = {
  'zone-mosque': 'zone-3',
  'zone-field': 'zone-6',
  'zone-behind-mosque': 'zone-2',
  'zone-new-building': 'zone-4',
  'zone-camp': 'zone-5',
  'zone-fountain': 'zone-6',
  'zone-radio': 'zone-2',
  'zone-online': 'zone-2'
};

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

    const storedZonesById = new Map(allZones.map((zone) => [zone.id, zone]));
    const zones = OFFICIAL_ZONES.map((officialZone) => ({
      ...storedZonesById.get(officialZone.id),
      ...officialZone
    }));
    const officialZonesById = new Map(zones.map((zone) => [zone.id, zone]));

    const agenda = allItems.map((item) => {
      const canonicalZoneId = LEGACY_ZONE_ALIASES[item.zoneId] || item.zoneId;
      const zone = officialZonesById.get(canonicalZoneId);

      return zone
        ? { ...item, zoneId: canonicalZoneId, zone }
        : item;
    });

    res.json({ zones, agenda });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الجدول والمناطق' });
  }
});

export default router;
