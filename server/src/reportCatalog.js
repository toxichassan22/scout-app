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
  catalogEntry('comp-report-catalog-01', 'report-scientific-research', 'البحث العلمي', 'المجال العلمي', 'بحث علمي موثق بالمصادر والنتائج.'),
  catalogEntry('comp-report-catalog-02', 'report-ai-models', 'موديلات الذكاء الاصطناعي', 'المجال العلمي', 'عرض أو تطبيق لنموذج من نماذج الذكاء الاصطناعي.'),
  catalogEntry('comp-report-catalog-03', 'report-smart-scout', 'الكاشف الذكي', 'المجال العلمي', 'فكرة أو نموذج ذكي يخدم العمل الكشفي.'),
  catalogEntry('comp-report-catalog-04', 'report-earth-magazine', 'المجلة الأرضية', 'المجال الكشفي', 'توثيق المجلة الأرضية ومحتواها الكشفي.'),
  catalogEntry('comp-report-catalog-05', 'report-scout-model', 'النموذج', 'المجال الكشفي', 'تنفيذ وعرض نموذج كشفي.'),
  catalogEntry('comp-report-catalog-06', 'report-reels', 'ريلز', 'المجال الكشفي', 'فيديو قصير يوثق فكرة أو نشاطاً كشفياً.'),
  catalogEntry('comp-report-catalog-07', 'report-campfire', 'السمر', 'المجال الفني', 'تقرير ومخرجات فقرة السمر.'),
  catalogEntry('comp-report-catalog-08', 'report-poster', 'الملصق', 'المجال الفني', 'تصميم ملصق فني مرتبط بالكشافة.'),
  catalogEntry('comp-report-catalog-09', 'report-exhibition', 'المعرض', 'المجال الفني', 'توثيق وتجهيز المعرض الفني.'),
  catalogEntry('comp-report-catalog-10', 'report-art-workshop', 'الورشة الفنية', 'المجال الفني', 'تقرير ومخرجات الورشة الفنية.'),
  catalogEntry('comp-report-catalog-11', 'report-video', 'الفيديو', 'المجال الثقافي', 'فيديو ثقافي موثق من الفريق.'),
  catalogEntry('comp-report-catalog-16', 'report-carnival', 'الكرنفال', 'المجال الثقافي', 'تقرير مشاركة الفريق في الكرنفال.'),
  catalogEntry('comp-report-catalog-12', 'report-surah-al-kahf', 'سورة الكهف', 'المجال الديني', 'تقرير تسميع وحفظ سورة الكهف.'),
  catalogEntry('comp-report-catalog-13', 'report-hadith', 'أحاديث', 'المجال الديني', 'تقرير حفظ وتسميع الأحاديث.'),
  catalogEntry('comp-report-catalog-14', 'report-worksheet', 'ورقة عمل', 'المجال الديني', 'ورقة عمل دينية موثقة ومنظمة.'),
  catalogEntry('comp-report-catalog-15', 'report-tilawa', 'دولة التلاوة', 'المجال الديني', 'تقرير مشاركة الفريق في دولة التلاوة.'),
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


