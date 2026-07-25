import { Router } from 'express';
import prisma from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

const OFFICIAL_ZONES = [
  { id: 'zone-1', numberLabel: '١', name: 'مبنى الإدارة', description: 'المقر الإداري واستقبال الوفود', colorHex: '#ef4444', order: 1 },
  { id: 'zone-2', numberLabel: '٢', name: 'خلف المسجد', description: 'الموقع الرسمي للمسابقة الفنية', colorHex: '#10b981', order: 2 },
  { id: 'zone-3', numberLabel: '٣', name: 'المسجد', description: 'مكان الصلاة والتسميع', colorHex: '#f59e0b', order: 3 },
  { id: 'zone-4', numberLabel: '٤', name: 'المبنى الجديد', description: 'الدوران الثاني والثالث للمسابقات', colorHex: '#3b82f6', order: 4 },
  { id: 'zone-5', numberLabel: '٥', name: 'المخيم الكشفي للمجموعات', description: 'موقع المسابقات الكشفية للمجموعات', colorHex: '#8b5cf6', order: 5 },
  { id: 'zone-6', numberLabel: '٦', name: 'ملعب النجيلة بالمركز', description: 'المسابقات والعروض الرياضية', colorHex: '#06b6d4', order: 6 },
  { id: 'zone-7', numberLabel: '٧', name: 'أمام نافورة المركز', description: 'موقع العروض الميدانية', colorHex: '#ec4899', order: 7 },
  { id: 'zone-8', numberLabel: '٨', name: 'إذاعة المهرجان', description: 'البث الرسمي للمهرجان', colorHex: '#14b8a6', order: 8 }
];

const CANONICAL_COMPETITION_IDS = new Set([
  5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 20, 21, 22, 23, 24, 26
].map((number) => `agenda-competition-${number}`));

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
      where: {
        id: { in: [...CANONICAL_COMPETITION_IDS] },
        type: 'competition',
        isVisible: true
      },
      include: { zone: true },
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }]
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
