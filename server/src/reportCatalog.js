import { getOfficialCriteria } from './officialCompetitionCriteria.js';

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
  catalogEntry('comp-report-catalog-01', 'report_scientific_research', 'البحث العلمي', 'المجال العلمي', 'بحث علمي موثق بالمصادر والنتائج.'),
  catalogEntry('comp-report-catalog-02', 'report_ai_models', 'موديلات الذكاء الاصطناعي', 'المجال العلمي', 'عرض أو تطبيق لنموذج من نماذج الذكاء الاصطناعي.'),
  catalogEntry('comp-report-catalog-03', 'report_smart_detector', 'الكاشف الذكي', 'المجال العلمي', 'فكرة أو نموذج ذكي يخدم العمل الكشفي.'),
  catalogEntry('comp-report-catalog-04', 'report_scout_magazine', 'المجلة الأرضية', 'المجال الكشفي', 'توثيق المجلة الأرضية ومحتواها الكشفي.'),
  catalogEntry('comp-report-catalog-05', 'report_scout_model', 'النموذج الكشفي', 'المجال الكشفي', 'تنفيذ وعرض نموذج كشفي.'),
  catalogEntry('comp-report-catalog-06', 'report_reels', 'فيديو التحضيرات', 'المجال الكشفي', 'فيديو قصير يوثق فكرة أو نشاطاً كشفياً.'),
  catalogEntry('comp-report-catalog-07', 'report_campfire', 'حفل الختام والسمر', 'المجال الفني', 'تقرير ومخرجات فقرة السمر والختام.'),
  catalogEntry('comp-report-catalog-08', 'report_poster', 'الملصق الفني', 'المجال الفني', 'تصميم ملصق فني مرتبط بالكشافة.'),
  catalogEntry('comp-report-catalog-09', 'report_exhibition', 'المعرض', 'المجال الفني', 'توثيق وتجهيز المعرض الفني.'),
  catalogEntry('comp-report-catalog-10', 'report_art_workshop', 'الورشة الفنية', 'المجال الفني', 'تقرير ومخرجات الورشة الفنية.'),
  catalogEntry('comp-report-catalog-11', 'report_video', 'الفيديو', 'المجال الثقافي', 'فيديو ثقافي موثق من الفريق.'),
  catalogEntry('comp-report-catalog-12', 'report_quran', 'تسميع القرآن الكريم', 'المجال الديني', 'تقرير تسميع وحفظ سورة الكهف والقرآن الكريم.'),
  catalogEntry('comp-report-catalog-13', 'report_hadith', 'تسميع الأحاديث النبوية', 'المجال الديني', 'تقرير حفظ وتسميع الأحاديث النبوية.'),
  catalogEntry('comp-report-catalog-14', 'report_prophets', 'بحث على خطى الأنبياء', 'المجال الديني', 'ورقة عمل دينية موثقة ومنظمة على خطى الأنبياء.'),
  catalogEntry('comp-report-catalog-15', 'report_tilawa_festival', 'دولة التلاوة', 'المجال الديني', 'تقرير مشاركة الفريق في دولة التلاوة.'),
  catalogEntry('comp-report-catalog-16', 'report_carnival', 'إقامة حفل الكرنفال', 'المجال الثقافي', 'تقرير مشاركة الفرقة في الكرنفال الكشفي.'),
];

export const OFFICIAL_REPORT_IDS = OFFICIAL_REPORT_CATALOG.map(report => report.id);

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

