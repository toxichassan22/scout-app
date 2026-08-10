import 'dotenv/config';
import prisma, { databaseReady } from '../src/db.js';
import { OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, OFFICIAL_ZONES } from '../src/agendaCanonical.js';

const SYNC_KEY = 'official_agenda_version';
const SYNC_VERSION = '20260810-program-v2';
const explicitlyAllowed = process.env.SYNC_OFFICIAL_AGENDA === 'true';

if (!explicitlyAllowed) {
  console.log('[agenda-sync] skipped; set SYNC_OFFICIAL_AGENDA=true for the one-time official schedule sync.');
  process.exit(0);
}

await databaseReady;
try {
  const current = await prisma.systemSetting.findUnique({ where: { key: SYNC_KEY } });
  if (current?.value === SYNC_VERSION) {
    console.log(`[agenda-sync] ${SYNC_VERSION} already applied; leaving admin edits untouched.`);
    process.exit(0);
  }

  await prisma.$transaction(async tx => {
    for (const zone of OFFICIAL_ZONES) {
      await tx.zone.upsert({
        where: { id: zone.id },
        update: { name: zone.name, description: zone.description, numberLabel: zone.numberLabel, colorHex: zone.colorHex, order: zone.order },
        create: zone,
      });
    }

    for (const item of OFFICIAL_AGENDA) {
      await tx.agendaItem.upsert({
        where: { id: item.id },
        update: {
          title: item.title,
          type: item.type,
          period: item.period,
          order: item.order,
          zoneId: item.zoneId,
          competitionId: item.competitionId,
          locationNote: item.locationNote,
          startTime: item.startTime,
          endTime: item.endTime,
          description: item.description,
          isVisible: item.isVisible,
        },
        create: item,
      });
    }

    // Old canonical rows that are no longer in the official sheet are hidden rather
    // than deleted, so an admin can recover them if the source sheet changes again.
    await tx.agendaItem.updateMany({
      where: { id: { startsWith: 'agenda-official-', notIn: OFFICIAL_AGENDA_IDS } },
      data: { isVisible: false },
    });

    const competitionNames = {
      'comp-digital-3': 'عواصم وعملات الدول العربية',
      'comp-video-1': 'تصميم فيديو دقيقتين بالـ AI',
      'comp-report-12': 'عرض ثلاث مبتكرات علمية',
      'comp-report-13': 'بحث على خطى الأنبياء',
      'comp-report-17': 'عرض تقديمي عن أحد الموديلات',
      'comp-report-18': 'المجلة الأرضية',
      'comp-report-19': 'الكشاف الذكي',
      'comp-report-21': 'عرض تقديمي كوميدي عن مهارة',
      'comp-digital-2': 'حقيقتين وكذبة',
    };
    for (const [id, name] of Object.entries(competitionNames)) {
      await tx.competition.updateMany({ where: { id }, data: { name } });
    }

    await tx.systemSetting.upsert({
      where: { key: SYNC_KEY },
      update: { value: SYNC_VERSION },
      create: { key: SYNC_KEY, value: SYNC_VERSION },
    });
  });

  console.log(`[agenda-sync] applied ${SYNC_VERSION}: ${OFFICIAL_AGENDA.length} agenda rows, stale canonical rows hidden.`);
} finally {
  await prisma.$disconnect();
}
