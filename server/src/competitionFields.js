export const OFFICIAL_FIELDS = [
  'المجال الديني',
  'المجال الفني',
  'المجال الثقافي',
  'المجال الكشفي',
  'المجال العلمي',
  'مجال الخدمة العامة',
];

const FIELD_BY_SLUG = {
  // المجال الديني
  report_surah_al_kahf: 'المجال الديني',
  report_quran: 'المجال الديني',
  report_hadith: 'المجال الديني',
  report_prophets: 'المجال الديني',
  report_worksheet: 'المجال الديني',
  report_tilawa: 'المجال الديني',
  report_tilawa_festival: 'المجال الديني',
  quran: 'المجال الديني',
  hadith: 'المجال الديني',

  // المجال الفني
  report_campfire: 'المجال الفني',
  report_closing_night: 'المجال الفني',
  report_poster: 'المجال الفني',
  report_exhibition: 'المجال الفني',
  report_art_workshop: 'المجال الفني',
  art_workshop: 'المجال الفني',

  // المجال العلمي
  report_scientific_research: 'المجال العلمي',
  report_science_ideas: 'المجال العلمي',
  report_ai_models: 'المجال العلمي',
  report_smart_scout: 'المجال العلمي',
  report_smart_detector: 'المجال العلمي',
  innovation: 'المجال العلمي',
  video: 'المجال العلمي',

  // المجال الثقافي
  report_video: 'المجال الثقافي',
  report_carnival: 'المجال الثقافي',
  report_comedy_scout: 'المجال الثقافي',
  genius: 'المجال الثقافي',
  two_truths: 'المجال الثقافي',
  geography: 'المجال الثقافي',
  video_design: 'المجال الثقافي',
  king_ciphers: 'المجال الثقافي',

  // المجال الكشفي
  report_earth_magazine: 'المجال الكشفي',
  report_scout_magazine: 'المجال الكشفي',
  report_scout_model: 'المجال الكشفي',
  report_reels: 'المجال الكشفي',
  report_knots: 'المجال الكشفي',
  report_model_presentation: 'المجال الكشفي',
  scout_model: 'المجال الكشفي',

  // مجال الخدمة العامة
  sports: 'مجال الخدمة العامة',
  sports_1: 'مجال الخدمة العامة',
  sports_2: 'مجال الخدمة العامة',
  report_community_vision: 'مجال الخدمة العامة',
  schedule_28: 'مجال الخدمة العامة',
};

export function getCompetitionField(competition) {
  if (!competition) return 'غير مصنف';
  const slug = competition.slug || '';
  const normSlug = slug.replace(/-/g, '_').toLowerCase();
  
  if (FIELD_BY_SLUG[normSlug]) return FIELD_BY_SLUG[normSlug];
  if (FIELD_BY_SLUG[slug]) return FIELD_BY_SLUG[slug];
  if (competition.field && competition.field !== 'غير مصنف') return competition.field;

  const name = competition.name || '';
  if (name.includes('ديني') || name.includes('قرآن') || name.includes('أحاديث') || name.includes('تلاوة') || name.includes('الكهف')) return 'المجال الديني';
  if (name.includes('فني') || name.includes('سمر') || name.includes('ملصق') || name.includes('معرض') || name.includes('ورشة')) return 'المجال الفني';
  if (name.includes('كشفي') || name.includes('مجلة') || name.includes('نموذج') || name.includes('ريلز') || name.includes('عقد') || name.includes('ربطات')) return 'المجال الكشفي';
  if (name.includes('علمي') || name.includes('ذكاء') || name.includes('كاشف') || name.includes('بحث') || name.includes('ابتكار')) return 'المجال العلمي';
  if (name.includes('ثقافي') || name.includes('شفرات') || name.includes('كرنفال') || name.includes('كود') || name.includes('محقق') || name.includes('رحال') || name.includes('فيديو')) return 'المجال الثقافي';
  if (name.includes('خدمة') || name.includes('رياضي') || name.includes('مجتمعي') || name.includes('مسعف')) return 'مجال الخدمة العامة';

  return 'غير مصنف';
}

export const COMPETITION_FIELD_MAP = FIELD_BY_SLUG;

