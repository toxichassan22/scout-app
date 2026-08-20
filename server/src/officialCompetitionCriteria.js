const c = (items) => JSON.stringify(items.map(([key, label, maxScore]) => ({ key, label, maxScore })));

export const OFFICIAL_CRITERIA_BY_SLUG = {
  report_quran: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت الحضور', 1], ['memorization', 'حفظ', 10], ['tajweed', 'تجويد', 3], ['recitation', 'ترتيل', 3], ['values', 'صحة القيم', 10]]),
  report_hadith: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت حضور', 1], ['hadithCount', 'عدد أحاديث', 5], ['memorization', 'حفظ', 5], ['documentation', 'سند وتوثيق', 1], ['requirements', 'توافق الشروط', 5]]),
  report_prophets: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت حضور', 1], ['presentationTime', 'توقيت عرض', 1], ['purpose', 'تحقيق الغرض', 5], ['content', 'محتوى', 5], ['requirements', 'شروط الورقة', 5]]),
  report_tilawa_festival: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت حضور', 1], ['memorization', 'حفظ', 5], ['tajweed', 'تجويد', 5], ['recitation', 'ترتيل', 6], ['duration', 'مدة التلاوة', 5]]),
  tilawa: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت حضور', 1], ['memorization', 'حفظ', 5], ['tajweed', 'تجويد', 5], ['recitation', 'ترتيل', 6], ['duration', 'مدة التلاوة', 5]]),
  report_campfire: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['timing', 'توقيت', 1], ['traditions', 'تقاليد', 3], ['vocal', 'أداء صوتي جماعي', 10], ['movement', 'أداء حركي جماعي', 10], ['entertainment', 'إمتاع', 5], ['extras', 'إضافات', 3]]),
  report_poster: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['timing', 'توقيت', 1], ['requirements', 'شروط', 10], ['editing', 'إخراج', 10], ['idea', 'وضوح الفكرة', 25], ['extras', 'إضافات', 1]]),
  report_exhibition: c([['participation', 'مشاركة', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['corners', 'عدد أركان', 5], ['pieces', 'عدد القطع', 15], ['artEnvironment', 'ركني الفني والبيئي', 10], ['presenter', 'تميز العارض', 1], ['appearance', 'الشكل العام', 3], ['quality', 'جودة القطع', 1], ['extras', 'إضافات', 2]]),
  report_art_workshop: c([['participation', 'مشاركة', 1], ['members', 'عدد (1 فرد)', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['attendance', 'توقيت حضور', 1], ['workshopTime', 'توقيت الورشة', 5], ['usage', 'استخدام', 10], ['innovation', 'شرط الابتكار', 10], ['quality', 'إخراج وجودة', 10], ['extras', 'إضافات', 5]]),
  report_carnival: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['timing', 'توقيت', 1], ['governorate', 'شرط المحافظة', 5], ['food', 'أكلة مشهورة', 5], ['heritage', 'صحة التراث', 10], ['uniform', 'زي المحافظة', 10], ['song', 'أغنية المهرجان', 5], ['groupPerformance', 'أداء جماعي', 10], ['entertainment', 'إمتاع', 0], ['extras', 'إضافات', 2]]),
  report_scout_magazine: c([['participation', 'مشاركة', 1], ['count', 'عدد', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['attendance', 'توقيت الحضور', 1], ['executionTime', 'توقيت التنفيذ', 5], ['spaceRequirements', 'مساحة وشروط', 5], ['skill', 'صحة المهارة', 10], ['editing', 'الإخراج', 10], ['presentation', 'مهارة العرض', 10], ['extras', 'الإضافات', 5]]),
  report_knots: c([['participation', 'مشاركة', 1], ['uniform', 'زي', 1], ['attendance', 'توقيت حضور', 1], ['skill', 'صحة المهارة', 40], ['speed', 'السرعة', 7]]),
  report_scout_model: c([['participation', 'مشاركة', 1], ['count', 'عدد', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['attendance', 'توقيت حضور', 1], ['executionTime', 'توقيت تنفيذ', 4], ['modelUsage', 'استخدام النموذج', 10], ['cycles', 'صحة الدورات', 10], ['durability', 'متانة', 10], ['multiplicity', 'تعدد', 5], ['units', 'الالتزام بعدد الوحدات', 10], ['storage', 'تشوين ونظافة', 5], ['extras', 'إضافات', 1]]),
  report_reels: c([['participation', 'مشاركة', 1], ['count', 'عدد', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['attendance', 'توقيت حضور', 1], ['presentationTime', 'توقيت عرض', 10], ['purpose', 'تحقيق الهدف', 10], ['comedy', 'مهارة العرض الكوميدي', 20], ['extras', 'الإضافات', 5]]),
  report_science_ideas: c([['participation', 'مشاركة', 1], ['uniform', 'زي', 1], ['delivery', 'توقيت تسليم', 1], ['report', 'تقرير', 1], ['count', 'عدد', 1], ['presentationTime', 'توقيت عرض', 5], ['researchRules', 'شروط وأسلوب البحث العلمي', 10], ['scientificContent', 'محتوى ومادة علمية', 10], ['writing', 'صياغة وإخراج', 10], ['references', 'المراجع', 10], ['tool', 'الوسيلة', 5], ['presentation', 'مهارة العرض', 5], ['feasibility', 'واقعية وقابلية التنفيذ', 5], ['extras', 'إضافات', 5]]),
  report_model_presentation: c([['participation', 'مشاركة', 1], ['count', 'عدد', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['timing', 'توقيت', 1], ['presentationTime', 'توقيت عرض', 10], ['quality', 'جودة وإخراج', 10], ['content', 'محتوى وشروط', 15], ['presentation', 'مهارة العرض', 5], ['extras', 'إضافة', 5]]),
  report_smart_detector: c([['participation', 'مشاركة', 1], ['count', 'عدد', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['participationTime', 'توقيت المشاركة', 1], ['innovation', 'الابتكار', 30], ['scientificContent', 'المادة العلمية', 25]]),
  report_video: c([['participation', 'مشاركة', 1], ['uniform', 'زي', 1], ['report', 'تقرير', 1], ['attendance', 'توقيت حضور', 2], ['videoTime', 'توقيت الفيديو', 5], ['editing', 'إخراج', 5], ['idea', 'وضوح الفكرة', 40]]),
  report_closing_night: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['timing', 'توقيت', 1], ['traditions', 'تقاليد', 3], ['vocal', 'أداء صوتي جماعي', 10], ['movement', 'أداء حركي جماعي', 10], ['entertainment', 'إمتاع', 5], ['extras', 'إضافات', 3]]),
  closing_night: c([['participation', 'مشاركة', 1], ['report', 'تقرير', 1], ['uniform', 'زي', 1], ['timing', 'توقيت', 1], ['traditions', 'تقاليد', 3], ['vocal', 'أداء صوتي جماعي', 10], ['movement', 'أداء حركي جماعي', 10], ['entertainment', 'إمتاع', 5], ['extras', 'إضافات', 3]]),
  video_design: c([['participation', 'مشاركة', 5], ['quality', 'جودة', 5], ['editing', 'إخراج', 5], ['timing', 'توقيت', 5], ['likes', 'لايك', 5], ['comments', 'تعليق', 5], ['views', 'مشاهدة', 5]]),
  sports_1: c([['score', 'الدرجة النهائية', 100]]),
  sports_2: c([['score', 'الدرجة النهائية', 100]]),
  king_ciphers: c([['score', 'الدرجة النهائية', 100]]),
};

// Older seeded competitions use shorter slugs. Keep them tied to the same
// official distributions instead of falling back to questionCount (often 100).
Object.assign(OFFICIAL_CRITERIA_BY_SLUG, {
  quran: OFFICIAL_CRITERIA_BY_SLUG.report_quran,
  report_surah_al_kahf: OFFICIAL_CRITERIA_BY_SLUG.report_quran,
  hadith: OFFICIAL_CRITERIA_BY_SLUG.report_hadith,
  worksheet: OFFICIAL_CRITERIA_BY_SLUG.report_prophets,
  report_worksheet: OFFICIAL_CRITERIA_BY_SLUG.report_prophets,
  report_scientific_research: OFFICIAL_CRITERIA_BY_SLUG.report_science_ideas,
  report_ai_models: OFFICIAL_CRITERIA_BY_SLUG.report_science_ideas,
  report_smart_scout: OFFICIAL_CRITERIA_BY_SLUG.report_smart_detector,
  report_earth_magazine: OFFICIAL_CRITERIA_BY_SLUG.report_scout_magazine,
  report_tilawa: OFFICIAL_CRITERIA_BY_SLUG.report_tilawa_festival,
  report_comedy_scout: OFFICIAL_CRITERIA_BY_SLUG.report_reels,
  campfire: OFFICIAL_CRITERIA_BY_SLUG.report_campfire,
  music: OFFICIAL_CRITERIA_BY_SLUG.report_campfire,
  poster: OFFICIAL_CRITERIA_BY_SLUG.report_poster,
  exhibition: OFFICIAL_CRITERIA_BY_SLUG.report_exhibition,
  art_workshop: OFFICIAL_CRITERIA_BY_SLUG.report_art_workshop,
  knots: OFFICIAL_CRITERIA_BY_SLUG.report_knots,
  report_knots: OFFICIAL_CRITERIA_BY_SLUG.report_knots,
  scout_model: OFFICIAL_CRITERIA_BY_SLUG.report_scout_model,
  innovation: OFFICIAL_CRITERIA_BY_SLUG.report_science_ideas,
  model_presentation: OFFICIAL_CRITERIA_BY_SLUG.report_model_presentation,
  magazine: OFFICIAL_CRITERIA_BY_SLUG.report_scout_magazine,
  detector: OFFICIAL_CRITERIA_BY_SLUG.report_smart_detector,
  carnival: OFFICIAL_CRITERIA_BY_SLUG.report_carnival,
  comedy: OFFICIAL_CRITERIA_BY_SLUG.report_reels,
  closing_night: OFFICIAL_CRITERIA_BY_SLUG.report_closing_night,
  calligraphy: OFFICIAL_CRITERIA_BY_SLUG.report_prophets,
  planes: OFFICIAL_CRITERIA_BY_SLUG.report_model_presentation,
  schedule_6: OFFICIAL_CRITERIA_BY_SLUG.sports_1,
  schedule_11: OFFICIAL_CRITERIA_BY_SLUG.sports_2,
  schedule_23: OFFICIAL_CRITERIA_BY_SLUG.king_ciphers,
});

export function getOfficialCriteria(competition) {
  if (!competition) return null;
  const slug = String(competition.slug || '').toLowerCase().replaceAll('-', '_');
  if (OFFICIAL_CRITERIA_BY_SLUG[slug]) return OFFICIAL_CRITERIA_BY_SLUG[slug];

  const name = String(competition.name || '').trim();
  if (name.includes('المجال الرياضي')) return OFFICIAL_CRITERIA_BY_SLUG.sports_1;
  if (name.includes('كينج الشفرات')) return OFFICIAL_CRITERIA_BY_SLUG.king_ciphers;
  if (name.includes('نشر الفيديو')) return OFFICIAL_CRITERIA_BY_SLUG.report_video;
  if (name.includes('نصب المعرض')) return OFFICIAL_CRITERIA_BY_SLUG.report_exhibition;
  if (name.includes('القرآن') || name.includes('الكهف')) return OFFICIAL_CRITERIA_BY_SLUG.report_quran;
  if (name.includes('الأحاديث') || name.includes('حديث')) return OFFICIAL_CRITERIA_BY_SLUG.report_hadith;
  if (name.includes('الأنبياء') || name.includes('ورقة عمل')) return OFFICIAL_CRITERIA_BY_SLUG.report_prophets;
  if (name.includes('التلاوة')) return OFFICIAL_CRITERIA_BY_SLUG.report_tilawa_festival;
  if (name.includes('الكرنفال')) return OFFICIAL_CRITERIA_BY_SLUG.report_carnival;
  if (name.includes('الختام') || name.includes('السمر')) return OFFICIAL_CRITERIA_BY_SLUG.report_campfire;
  if (name.includes('الملصق')) return OFFICIAL_CRITERIA_BY_SLUG.report_poster;
  if (name.includes('المعرض') && !name.includes('مجلة')) return OFFICIAL_CRITERIA_BY_SLUG.report_exhibition;
  if (name.includes('الورشة')) return OFFICIAL_CRITERIA_BY_SLUG.report_art_workshop;
  if (name.includes('المجلة')) return OFFICIAL_CRITERIA_BY_SLUG.report_scout_magazine;
  if (name.includes('العقد') || name.includes('الربطات')) return OFFICIAL_CRITERIA_BY_SLUG.report_knots;
  if (name.includes('النموذج')) return OFFICIAL_CRITERIA_BY_SLUG.report_scout_model;
  if (name.includes('ريلز') || name.includes('كوميدي') || name.includes('تحضيرات')) return OFFICIAL_CRITERIA_BY_SLUG.report_reels;
  if (name.includes('البحث العلمي') || name.includes('ابتكار') || name.includes('أفكار')) return OFFICIAL_CRITERIA_BY_SLUG.report_science_ideas;
  if (name.includes('عرض') || name.includes('طائرات')) return OFFICIAL_CRITERIA_BY_SLUG.report_model_presentation;
  if (name.includes('الكاشف') || name.includes('كاشف')) return OFFICIAL_CRITERIA_BY_SLUG.report_smart_detector;
  if (name.includes('الفيديو')) return OFFICIAL_CRITERIA_BY_SLUG.report_video;

  return null;
}

