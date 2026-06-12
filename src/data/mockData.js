export const STORAGE_KEYS = {
  teams: 'dsc_teams',
  teamLogins: 'dsc_team_logins',
  authUser: 'dsc_auth_user',
  competitions: 'dsc_competitions',
  submissions: 'dsc_submissions',
  deviceLocks: 'dsc_device_locks',
  news: 'dsc_news',
  geography: 'dsc_geography',
  questions: 'dsc_questions',
  deviceId: 'dsc_device_id',
};

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

export const MOCK_TEAMS = [
  'الفريق الأول',
  'الفريق الثاني',
  'الفريق الثالث',
  'الفريق الرابع',
  'الفريق الخامس',
];

export const MOCK_COMPETITIONS = [
  { id: 1, name: 'حقيقتين وكذبة', type: 'two_truths', duration: 300, qrCode: 'comp_1', isOpen: false, startTime: null, password: '123' },
  { id: 2, name: 'عبقرينو', type: 'genius', duration: 300, qrCode: 'comp_2', isOpen: false, startTime: null, password: '123' },
  { id: 3, name: 'الجغرافيا', type: 'geography', duration: 1800, qrCode: 'comp_3', isOpen: false, startTime: null, password: '123' },
  { id: 4, name: 'تصميم الفيديو', type: 'video', duration: null, qrCode: 'comp_4', isOpen: false, startTime: null, password: '123' },
];

export const GEOGRAPHY_COUNTRIES = [
  { id: 1, name: 'مصر', capital: 'القاهرة', currency: 'الجنيه المصري', systemOfGovernment: 'جمهوري', flag: '🇪🇬', continent: 'أفريقيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Egypt+Map' },
  { id: 2, name: 'السعودية', capital: 'الرياض', currency: 'الريال السعودي', systemOfGovernment: 'ملكي', flag: '🇸🇦', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=KSA+Map' },
  { id: 3, name: 'الإمارات', capital: 'أبو ظبي', currency: 'الدرهم الإماراتي', systemOfGovernment: 'اتحادي', flag: '🇦🇪', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=UAE+Map' },
  { id: 4, name: 'الأردن', capital: 'عمان', currency: 'الدينار الأردني', systemOfGovernment: 'ملكي', flag: '🇯🇴', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Jordan+Map' },
  { id: 5, name: 'المغرب', capital: 'الرباط', currency: 'الدرهم المغربي', systemOfGovernment: 'ملكي', flag: '🇲🇦', continent: 'أفريقيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Morocco+Map' },
  { id: 6, name: 'الكويت', capital: 'الكويت', currency: 'الدينار الكويتي', systemOfGovernment: 'أميري', flag: '🇰🇼', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Kuwait+Map' },
  { id: 7, name: 'قطر', capital: 'الدوحة', currency: 'الريال القطري', systemOfGovernment: 'أميري', flag: '🇶🇦', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Qatar+Map' },
  { id: 8, name: 'عمان', capital: 'مسقط', currency: 'الريال العماني', systemOfGovernment: 'سلطاني', flag: '🇴🇲', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Oman+Map' },
  { id: 9, name: 'البحرين', capital: 'المنامة', currency: 'الدينار البحريني', systemOfGovernment: 'ملكي', flag: '🇧🇭', continent: 'آسيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Bahrain+Map' },
  { id: 10, name: 'الجزائر', capital: 'الجزائر', currency: 'الدينار الجزائري', systemOfGovernment: 'جمهوري', flag: '🇩🇿', continent: 'أفريقيا', map: 'https://placehold.co/600x400/eaf4ef/2D6A4F?text=Algeria+Map' },
];

export const TWO_TRUTHS_QUESTIONS = [
  {
    id: 1,
    question: 'اختر العبارة الكاذبة عن الحركة الكشفية.',
    options: [
      { text: 'تأسست الكشافة العالمية عام 1907', isLie: false },
      { text: 'مؤسس الكشافة هو بادن باول', isLie: false },
      { text: 'أول مخيم كشفي أقيم في فرنسا', isLie: true },
    ],
  },
  {
    id: 2,
    question: 'اختر العبارة الكاذبة عن مهارات الكشاف.',
    options: [
      { text: 'العقدة الوتدية تستخدم للتثبيت', isLie: false },
      { text: 'البوصلة تساعد على تحديد الاتجاهات', isLie: false },
      { text: 'إشعال النار قرب الخيام دائماً هو التصرف الأكثر أماناً', isLie: true },
    ],
  },
  {
    id: 3,
    question: 'اختر العبارة الكاذبة عن العمل الجماعي.',
    options: [
      { text: 'تقسيم الأدوار يساعد الفريق على الإنجاز', isLie: false },
      { text: 'القائد الناجح يستمع لأعضاء الفريق', isLie: false },
      { text: 'أفضل فريق هو الذي يعمل كل فرد فيه منفرداً', isLie: true },
    ],
  },
];

export const GENIUS_QUESTIONS = [
  { id: 1, question: 'ما هو أسرع حيوان بري؟', options: ['الأسد', 'الفهد', 'الغزال', 'الحصان'], answer: 'الفهد' },
  { id: 2, question: 'ما هي عاصمة اليابان؟', options: ['سيول', 'بكين', 'طوكيو', 'بانكوك'], answer: 'طوكيو' },
  { id: 3, question: 'كم عدد ألوان قوس قزح؟', options: ['5', '6', '7', '8'], answer: '7' },
  { id: 4, question: 'أي كوكب يعرف بالكوكب الأحمر؟', options: ['المريخ', 'الزهرة', 'زحل', 'عطارد'], answer: 'المريخ' },
  { id: 5, question: 'ما العنصر الأساسي في عملية التنفس؟', options: ['النيتروجين', 'الأكسجين', 'الهيدروجين', 'الهيليوم'], answer: 'الأكسجين' },
  { id: 6, question: 'ما أكبر محيط في العالم؟', options: ['الأطلسي', 'الهندي', 'الهادئ', 'المتجمد الشمالي'], answer: 'الهادئ' },
  { id: 7, question: 'ما لغة صفحات الويب الأساسية؟', options: ['HTML', 'SQL', 'Python', 'C++'], answer: 'HTML' },
  { id: 8, question: 'كم دقيقة في الساعة؟', options: ['30', '45', '60', '90'], answer: '60' },
];

export const INITIAL_QUESTIONS = {
  two_truths: TWO_TRUTHS_QUESTIONS,
  genius: GENIUS_QUESTIONS,
};

export const INITIAL_NEWS = [];

export const FESTIVAL_DETAILS = {
  name: 'المخيم الرقمي',
  subtitle: 'كشفية بفكر ديجيتال',
  location: 'مركز شباب منشية التحرير - القاهرة',
  schedule: 'اليوم الأول: تسجيل وافتتاح، اليوم الثاني: مسابقات رقمية، اليوم الثالث: تكريم الفرق',
  info: 'تجربة كشفية رقمية تجمع بين روح الفريق، المعرفة، والإبداع التقني داخل بيئة آمنة ومحلية.',
  slogan: 'كشفية بفكر رقمي',
  startDate: '2026-08-21T09:00:00',
  startDateLabel: '21 أغسطس 2026',
  logo: '/festival-logo.png',
};
