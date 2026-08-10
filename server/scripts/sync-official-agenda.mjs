import 'dotenv/config';
import prisma, { databaseReady } from '../src/db.js';
import { OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, OFFICIAL_ZONES } from '../src/agendaCanonical.js';

const SYNC_KEY = 'official_agenda_version';
const SYNC_VERSION = '20260810-program-v3-catalog';
const explicitlyAllowed = process.env.SYNC_OFFICIAL_AGENDA === 'true';
const festivalDate = process.env.FESTIVAL_DATE || '2026-08-21';

if (!explicitlyAllowed) {
  console.log('[agenda-sync] skipped; set SYNC_OFFICIAL_AGENDA=true for the one-time official schedule sync.');
  process.exit(0);
}

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
const competitionSlugs = {
  'comp-digital-1': 'genius',
  'comp-digital-2': 'two_truths',
  'comp-digital-3': 'geography',
  'comp-video-1': 'video_design',
};
const autoDigitalIds = new Set(['comp-digital-1', 'comp-digital-2', 'comp-digital-3']);
const standaloneCompetitions = [
  { id: 'comp-digital-1', name: 'مسابقة عبقرينو', slug: 'genius', type: 'auto_digital', description: 'مسابقة معرفية من بنك الأسئلة.', details: 'مسابقة رقمية تلقائية.' },
];

const toFestivalDateTime = time => time ? new Date(`${festivalDate}T${String(time).slice(0, 5)}:00+03:00`) : null;
const scheduleCompetitionId = item => item.competitionId || `comp-schedule-${item.id.replace(/^agenda-official-/, '')}`;
const scheduleSlug = item => `schedule-${item.id.replace(/^agenda-official-/, '').replace(/[^A-Za-z0-9_-]/g, '-')}`;

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

    for (const base of standaloneCompetitions) {
      await tx.competition.upsert({
        where: { id: base.id },
        update: { name: base.name },
        create: { ...base, isOpen: false, duration: 900, questionCount: 50, criteria: JSON.stringify([{ key: 'score', label: 'الدرجة الصحيحة', maxScore: 50 }]) },
      });
    }

    for (const item of OFFICIAL_AGENDA) {
      const competitionId = scheduleCompetitionId(item);
      const scheduleOnly = !item.competitionId;
      const name = competitionNames[item.competitionId] || item.title;
      const type = scheduleOnly ? 'schedule_only' : autoDigitalIds.has(item.competitionId) ? 'auto_digital' : 'manual_judged';
      await tx.competition.upsert({
        where: { id: competitionId },
        update: {
          ...(item.competitionId ? { name } : {}),
          startsAt: toFestivalDateTime(item.startTime),
          endsAt: toFestivalDateTime(item.endTime),
        },
        create: {
          id: competitionId,
          name,
          slug: competitionSlugs[competitionId] || scheduleSlug(item),
          type,
          description: scheduleOnly ? 'فعالية زمنية ضمن برنامج المهرجان وليست مسابقة دخول إلكترونية.' : '',
          details: scheduleOnly ? 'يتم التحكم في وقتها ومكانها من إدارة البرنامج.' : '',
          isOpen: false,
          startsAt: toFestivalDateTime(item.startTime),
          endsAt: toFestivalDateTime(item.endTime),
          duration: null,
          questionCount: 0,
          criteria: '[]',
        },
      });

      await tx.agendaItem.upsert({
        where: { id: item.id },
        update: {
          title: item.title,
          type: item.type,
          period: item.period,
          order: item.order,
          zoneId: item.zoneId,
          competitionId,
          locationNote: item.locationNote,
          startTime: item.startTime,
          endTime: item.endTime,
          description: item.description,
          isVisible: item.isVisible,
        },
        create: { ...item, competitionId },
      });
    }

    await tx.agendaItem.updateMany({
      where: { id: { startsWith: 'agenda-official-', notIn: OFFICIAL_AGENDA_IDS } },
      data: { isVisible: false },
    });

    await tx.systemSetting.upsert({
      where: { key: SYNC_KEY },
      update: { value: SYNC_VERSION },
      create: { key: SYNC_KEY, value: SYNC_VERSION },
    });
  });

  console.log(`[agenda-sync] applied ${SYNC_VERSION}: ${OFFICIAL_AGENDA.length} agenda rows and a complete admin competition catalog.`);
} finally {
  await prisma.$disconnect();
}
