import 'dotenv/config';
import prisma, { databaseReady } from '../src/db.js';
import { OFFICIAL_AGENDA, OFFICIAL_AGENDA_IDS, OFFICIAL_ZONES } from '../src/agendaCanonical.js';
import { syncOfficialCompetitionAgendaLinks, syncOfficialReportCatalog } from '../src/reportCatalog.js';

const SYNC_KEY = 'official_agenda_version';
const SYNC_VERSION = '20260820-final-program-v2';
const explicitlyAllowed = process.env.SYNC_OFFICIAL_AGENDA === 'true';
const festivalDate = process.env.FESTIVAL_DATE || '2026-08-21';

if (!explicitlyAllowed) {
  console.log('[agenda-sync] skipped; set SYNC_OFFICIAL_AGENDA=true for the one-time official schedule sync.');
  process.exit(0);
}

const competitionNames = {
  'comp-digital-2': 'المحقق الذكي',
  'comp-digital-3': 'رحال العالم الذكي',
  'comp-video-1': 'تصميم فيديو دقيقتين بالـ AI',
  'comp-report-12': 'عرض ثلاث مبتكرات علمية',
  'comp-report-13': 'بحث على خطى الأنبياء',
  'comp-report-17': 'عرض تقديمي عن أحد الموديلات',
  'comp-report-18': 'المجلة الأرضية',
  'comp-report-19': 'الكشاف الذكي',
  'comp-report-21': 'عرض تقديمي كوميدي عن مهارة',
  'comp-report-catalog-09': 'نصب المعرض',
  'comp-report-catalog-11': 'نشر الفيديو التوثيقي',
  'comp-schedule-6': 'المجال الرياضي',
  'comp-schedule-11': 'المجال الرياضي',
  'comp-schedule-23': 'كينج الشفرات',
};
const competitionSlugs = {
  'comp-digital-1': 'genius',
  'comp-digital-2': 'two_truths',
  'comp-digital-3': 'geography',
  'comp-video-1': 'video_design',
};
const autoDigitalIds = new Set(['comp-digital-1', 'comp-digital-2', 'comp-digital-3']);
const standaloneCompetitions = [
  { id: 'comp-digital-1', name: 'من سيربح الكود', slug: 'genius', type: 'auto_digital', description: 'مسابقة معرفية من بنك الأسئلة.', details: 'مسابقة رقمية تلقائية.' },
];
const criteriaById = {
  'comp-digital-1': [{ key: 'score', label: 'الدرجة الصحيحة', maxScore: 50 }],
  'comp-digital-2': [{ key: 'score', label: 'الدرجة الصحيحة', maxScore: 50 }],
  'comp-digital-3': [{ key: 'score', label: 'الدرجة الصحيحة', maxScore: 50 }],
  'comp-video-1': [
    { key: 'creativity', label: 'الابتكار والفكرة', maxScore: 30 },
    { key: 'editing', label: 'جودة المونتاج والإخراج', maxScore: 40 },
    { key: 'sound', label: 'الهندسة الصوتية والمؤثرات', maxScore: 30 },
  ],
  'comp-schedule-6': [{ key: 'score', label: 'الدرجة النهائية', maxScore: 100 }],
  'comp-schedule-11': [{ key: 'score', label: 'الدرجة النهائية', maxScore: 100 }],
  'comp-schedule-23': [{ key: 'score', label: 'الدرجة النهائية', maxScore: 100 }],
  'comp-report-5': [
    { key: 'memorization', label: 'حسن الحفظ والتثبت', maxScore: 50 },
    { key: 'tajweed', label: 'التجويد والأداء الصوتي', maxScore: 30 },
    { key: 'confidence', label: 'الثقة والأداء أمام اللجنة', maxScore: 20 },
  ],
  'comp-report-6': [
    { key: 'memorization', label: 'حسن الحفظ', maxScore: 50 },
    { key: 'understanding', label: 'فهم المعنى والشرح', maxScore: 30 },
    { key: 'presentation', label: 'الأداء والثقة', maxScore: 20 },
  ],
  'comp-report-8': [
    { key: 'design', label: 'التصميم والجاذبية البصرية', maxScore: 40 },
    { key: 'message', label: 'وضوح الرسالة والفكرة', maxScore: 30 },
    { key: 'creativity', label: 'الإبداع والتنفيذ', maxScore: 30 },
  ],
  'comp-report-9': [
    { key: 'mastery', label: 'إتقان العقد بشكل صحيح', maxScore: 50 },
    { key: 'speed', label: 'السرعة والمهارة', maxScore: 25 },
    { key: 'usage', label: 'معرفة الاستخدامات العملية', maxScore: 25 },
  ],
  'comp-report-10': [
    { key: 'output', label: 'جودة المخرج الفني', maxScore: 40 },
    { key: 'teamwork', label: 'التعاون الجماعي', maxScore: 30 },
    { key: 'documentation', label: 'توثيق خطوات الورشة', maxScore: 30 },
  ],
  'comp-report-11': [
    { key: 'model', label: 'جودة النموذج والتنفيذ', maxScore: 40 },
    { key: 'idea', label: 'فكرة النموذج والفائدة', maxScore: 30 },
    { key: 'presentation', label: 'جودة العرض والشرح', maxScore: 30 },
  ],
  'comp-report-12': [
    { key: 'ideas', label: 'جودة الأفكار والإبداع', maxScore: 40 },
    { key: 'research', label: 'عمق البحث والمصادر', maxScore: 30 },
    { key: 'presentation', label: 'جودة العرض والتنفيذ', maxScore: 30 },
  ],
  'comp-report-13': [
    { key: 'content', label: 'محتوى الورقة والقيمة التربوية', maxScore: 40 },
    { key: 'design', label: 'تصميم الورقة وتنظيمها', maxScore: 30 },
    { key: 'applicability', label: 'قابلية التطبيق في الفترة الكشفية', maxScore: 30 },
  ],
  'comp-report-15': [
    { key: 'participation', label: 'مستوى المشاركة والتنظيم', maxScore: 40 },
    { key: 'creativity', label: 'الإبداع في العرض', maxScore: 30 },
    { key: 'impact', label: 'التأثير والتفاعل', maxScore: 30 },
  ],
  'comp-report-17': [
    { key: 'content', label: 'جودة المحتوى والشرح', maxScore: 40 },
    { key: 'presentation', label: 'جودة العرض التقديمي', maxScore: 30 },
    { key: 'engagement', label: 'التفاعل وإيصال الفكرة', maxScore: 30 },
  ],
  'comp-report-18': [
    { key: 'content', label: 'تنوع وجودة المحتوى', maxScore: 40 },
    { key: 'design', label: 'التصميم والتنسيق', maxScore: 30 },
    { key: 'creativity', label: 'الإبداع في العرض', maxScore: 30 },
  ],
  'comp-report-19': [
    { key: 'innovation', label: 'الفكرة والابتكار', maxScore: 40 },
    { key: 'execution', label: 'التنفيذ والعملية', maxScore: 30 },
    { key: 'presentation', label: 'جودة العرض والشرح', maxScore: 30 },
  ],
  'comp-report-21': [
    { key: 'humor', label: 'الفكاهة والإبداع', maxScore: 40 },
    { key: 'message', label: 'وضوح الرسالة الكشفية', maxScore: 30 },
    { key: 'performance', label: 'الأداء والتمثيل', maxScore: 30 },
  ],
  'comp-report-23': [
    { key: 'recitation', label: 'جودة التلاوة والتجويد', maxScore: 50 },
    { key: 'voice', label: 'الأداء الصوتي والخشوع', maxScore: 30 },
    { key: 'presence', label: 'الحضور والثقة', maxScore: 20 },
  ],
  'comp-report-24': [
    { key: 'participation', label: 'مستوى المشاركة', maxScore: 40 },
    { key: 'performance', label: 'جودة الأداء الفني', maxScore: 30 },
    { key: 'teamwork', label: 'التعاون والروح الجماعية', maxScore: 30 },
  ],
};

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
        create: { ...base, isOpen: false, duration: 900, questionCount: 50, criteria: JSON.stringify(criteriaById[base.id] || []) },
      });
      if (criteriaById[base.id]) {
        await tx.competition.updateMany({ where: { id: base.id, criteria: '[]' }, data: { criteria: JSON.stringify(criteriaById[base.id]) } });
      }
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
          criteria: JSON.stringify(criteriaById[competitionId] || []),
        },
      });
      if (criteriaById[competitionId]) {
        await tx.competition.updateMany({ where: { id: competitionId, criteria: '[]' }, data: { criteria: JSON.stringify(criteriaById[competitionId]) } });
      }

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

    // v4 briefly created a standalone schedule-only record for this item before it
    // was correctly linked to the real digital competition. Remove only that generated
    // empty record, never a competition that has scores, reports or assignments.
    await tx.competition.deleteMany({
      where: {
        id: { in: ['comp-schedule-26'] },
        scores: { none: {} },
        reports: { none: {} },
        judgeAssignments: { none: {} },
        judgeScores: { none: {} },
        teamAccess: { none: {} },
      },
    });

    await tx.systemSetting.upsert({
      where: { key: SYNC_KEY },
      update: { value: SYNC_VERSION },
      create: { key: SYNC_KEY, value: SYNC_VERSION },
    });
  });

  await syncOfficialReportCatalog(prisma);
  await syncOfficialCompetitionAgendaLinks(prisma);
  console.log(`[agenda-sync] applied ${SYNC_VERSION}: ${OFFICIAL_AGENDA.length} agenda rows and a complete admin competition catalog.`);
} finally {
  await prisma.$disconnect();
}
