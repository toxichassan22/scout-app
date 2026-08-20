import { getOfficialCriteria } from './officialCompetitionCriteria.js';
import { OFFICIAL_AGENDA } from './agendaCanonical.js';

const catalogEntry = (id, slug, name, field, description) => ({
  id,
  slug,
  name,
  field,
  type: 'manual_judged',
  description,
  details: `تقرير ${name} ضمن ${field}.`,
  isOpen: true,
  passcode: null,
  entryCode: null,
  qrCode: null,
  requiresQr: false,
  duration: null,
  questionCount: 0,
  leaderboardVisible: false,
  criteria: getOfficialCriteria({ slug, name }) || '[]',
});

export const OFFICIAL_REPORT_CATALOG = [
  catalogEntry('comp-report-catalog-01', 'report-scientific-research', 'بحث ثلاث أفكار لمبتكرات علمية', 'المجال العلمي', 'بحث وتقديم ثلاث أفكار لمبتكرات علمية.'),
  catalogEntry('comp-report-catalog-02', 'report-ai-models', 'أحد موديلات الذكاء الاصطناعي', 'المجال العلمي', 'عرض أحد موديلات الذكاء الاصطناعي.'),
  catalogEntry('comp-report-catalog-03', 'report-smart-scout', 'الكاشف الذكي', 'المجال العلمي', 'فكرة أو نموذج ذكي يخدم العمل الكشفي.'),
  catalogEntry('comp-report-catalog-04', 'report-earth-magazine', 'المجلة الأرضية', 'المجال الكشفي', 'توثيق المجلة الأرضية ومحتواها الكشفي.'),
  catalogEntry('comp-report-catalog-05', 'report-scout-model', 'النموذج الكشفي', 'المجال الكشفي', 'تنفيذ وعرض نموذج كشفي.'),
  catalogEntry('comp-report-catalog-06', 'report-reels', 'عرض تقديمي كوميدي عن مهارة كشفية', 'المجال الكشفي', 'عرض تقديمي كوميدي عن مهارة كشفية.'),
  catalogEntry('comp-report-catalog-07', 'report-campfire', 'حفل الختام والسمر', 'المجال الفني', 'حفل الختام والسمر.'),
  catalogEntry('comp-report-catalog-08', 'report-poster', 'الملصق', 'المجال الفني', 'تصميم ملصق فني مرتبط بالكشافة.'),
  catalogEntry('comp-report-catalog-09', 'report-exhibition', 'نصب المعرض', 'المجال الفني', 'مسابقة تجهيز ونصب المعرض الفني.'),
  catalogEntry('comp-report-catalog-10', 'report-art-workshop', 'الورشة الفنية', 'المجال الفني', 'تقرير ومخرجات الورشة الفنية.'),
  catalogEntry('comp-report-catalog-16', 'report-carnival', 'الكرنفال', 'المجال الثقافي', 'تقرير مشاركة الفريق في الكرنفال.'),
  catalogEntry('comp-report-catalog-12', 'report-surah-al-kahf', 'تسميع القرآن', 'المجال الديني', 'تسميع وحفظ سورة الكهف.'),
  catalogEntry('comp-report-catalog-13', 'report-hadith', 'الأحاديث', 'المجال الديني', 'تقرير حفظ وتسميع الأحاديث.'),
  catalogEntry('comp-report-catalog-14', 'report-worksheet', 'ورقة عمل على خطى الأنبياء', 'المجال الديني', 'ورقة عمل على خطى الأنبياء.'),
  catalogEntry('comp-report-catalog-15', 'report-tilawa', 'مهرجان التلاوة', 'المجال الديني', 'مشاركة الفريق في مهرجان التلاوة.'),
  catalogEntry('comp-report-catalog-17', 'report-knots', 'عقد وربطات', 'المجال الكشفي', 'إتقان العقد والربطات الكشفية.'),
  catalogEntry('comp-schedule-6', 'sports-1', 'المجال الرياضي', 'المجال الرياضي', 'مسابقة المجال الرياضي في الفترة الأولى.'),
  catalogEntry('comp-schedule-11', 'sports-2', 'تكملة المجال الرياضي', 'المجال الرياضي', 'تكملة مسابقة المجال الرياضي في الفترة الثانية.'),
  catalogEntry('comp-schedule-23', 'king-ciphers', 'كينج الشفرات', 'المجال الثقافي', 'مسابقة حل الشفرات الكشفية.'),
];

const OFFICIAL_REPORT_ID_BY_IDENTIFIER = new Map(
  OFFICIAL_REPORT_CATALOG.flatMap(report => [[report.id, report.id], [report.slug, report.id]]),
);
Object.entries({
  'comp-report-9': 'comp-report-catalog-17',
  knots: 'comp-report-catalog-17',
  report_knots: 'comp-report-catalog-17',
  'comp-report-10': 'comp-report-catalog-10',
  'comp-report-11': 'comp-report-catalog-05',
  'comp-report-12': 'comp-report-catalog-01',
  'comp-report-13': 'comp-report-catalog-14',
  'comp-report-15': 'comp-report-catalog-16',
  'comp-report-17': 'comp-report-catalog-02',
  report_model_presentation: 'comp-report-catalog-02',
  'comp-report-18': 'comp-report-catalog-04',
  'comp-report-19': 'comp-report-catalog-03',
  'comp-report-21': 'comp-report-catalog-06',
  'comp-report-23': 'comp-report-catalog-15',
  'comp-report-24': 'comp-report-catalog-07',
}).forEach(([legacyId, canonicalId]) => OFFICIAL_REPORT_ID_BY_IDENTIFIER.set(legacyId, canonicalId));

export const OFFICIAL_REPORT_IDS = OFFICIAL_REPORT_CATALOG.map(report => report.id);

export function resolveOfficialReportId(identifier) {
  const value = String(identifier ?? '').trim();
  return OFFICIAL_REPORT_ID_BY_IDENTIFIER.get(value) || value;
}

export async function syncOfficialReportCatalog(prisma) {
  for (const report of OFFICIAL_REPORT_CATALOG) {
    const data = { ...report };
    delete data.field;
    const { id, ...competitionData } = data;
    const officialCriteria = getOfficialCriteria({ slug: competitionData.slug, name: competitionData.name }) || competitionData.criteria;
    const update = {
      name: competitionData.name,
      slug: competitionData.slug,
      type: competitionData.type,
      description: competitionData.description,
      details: competitionData.details,
      duration: competitionData.duration,
      questionCount: competitionData.questionCount,
      criteria: officialCriteria,
    };
    await prisma.competition.upsert({
      where: { id },
      update,
      create: { id, ...competitionData, criteria: officialCriteria },
    });
  }
}

const OFFICIAL_PROGRAM_SYNC_KEY = 'official_program_version';
export const OFFICIAL_PROGRAM_VERSION = '20260820-final-program-v2';
const FESTIVAL_DATE = () => process.env.FESTIVAL_DATE || '2026-08-21';
const toFestivalDateTime = time => time ? new Date(`${FESTIVAL_DATE()}T${String(time).slice(0, 5)}:00+03:00`) : null;
const scheduleCompetitionId = item => item.competitionId || `comp-schedule-${item.id.replace(/^agenda-official-/, '')}`;
const scheduleSlug = item => `schedule-${item.id.replace(/^agenda-official-/, '').replace(/[^A-Za-z0-9_-]/g, '-')}`;

export async function syncOfficialProgramSchedule(prisma, { force = false } = {}) {
  if (!prisma?.agendaItem?.updateMany || !prisma?.competition?.upsert || !prisma?.$transaction) return false;
  const current = prisma.systemSetting?.findUnique
    ? await prisma.systemSetting.findUnique({ where: { key: OFFICIAL_PROGRAM_SYNC_KEY } })
    : null;
  if (!force && current?.value === OFFICIAL_PROGRAM_VERSION) return false;

  await prisma.$transaction(async tx => {
    for (const item of OFFICIAL_AGENDA) {
      const competitionId = scheduleCompetitionId(item);
      const startsAt = toFestivalDateTime(item.startTime);
      const endsAt = toFestivalDateTime(item.endTime);
      if (!item.competitionId) {
        await tx.competition.upsert({
          where: { id: competitionId },
          update: {
            name: item.title,
            slug: scheduleSlug(item),
            type: 'schedule_only',
            description: 'فعالية زمنية ضمن برنامج المهرجان وليست مسابقة تحكيم.',
            details: 'يتم التحكم في وقتها ومكانها من إدارة البرنامج.',
            isOpen: false,
            startsAt,
            endsAt,
            questionCount: 0,
            criteria: '[]',
          },
          create: {
            id: competitionId,
            name: item.title,
            slug: scheduleSlug(item),
            type: 'schedule_only',
            description: 'فعالية زمنية ضمن برنامج المهرجان وليست مسابقة تحكيم.',
            details: 'يتم التحكم في وقتها ومكانها من إدارة البرنامج.',
            isOpen: false,
            startsAt,
            endsAt,
            duration: null,
            questionCount: 0,
            criteria: '[]',
          },
        });
      } else {
        await tx.competition.updateMany({ where: { id: competitionId }, data: { name: item.title, startsAt, endsAt } });
      }

      await tx.agendaItem.updateMany({
        where: { id: item.id },
        data: {
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
      });
    }

    await tx.competition.updateMany({
      where: { id: 'comp-report-catalog-11' },
      data: {
        type: 'schedule_only',
        isOpen: false,
        passcode: null,
        entryCode: null,
        criteria: '[]',
      },
    });

    await tx.systemSetting.upsert({
      where: { key: OFFICIAL_PROGRAM_SYNC_KEY },
      update: { value: OFFICIAL_PROGRAM_VERSION },
      create: { key: OFFICIAL_PROGRAM_SYNC_KEY, value: OFFICIAL_PROGRAM_VERSION },
    });
  });
  return true;
}

export async function syncOfficialCompetitionAgendaLinks(prisma) {
  return syncOfficialProgramSchedule(prisma);
}


