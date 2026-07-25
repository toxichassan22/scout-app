export const OFFICIAL_ZONES = [
    { id: 'zone-1', numberLabel: '١', name: 'مبنى الإدارة', description: 'المقر الإداري واستقبال الوفود', colorHex: '#ef4444', order: 1 },
    { id: 'zone-2', numberLabel: '٢', name: 'خلف المسجد', description: 'موقع الورش والعروض الفنية', colorHex: '#10b981', order: 2 },
    { id: 'zone-3', numberLabel: '٣', name: 'المسجد', description: 'مكان الصلاة والتسميع', colorHex: '#f59e0b', order: 3 },
    { id: 'zone-4', numberLabel: '٤', name: 'المبنى الجديد', description: 'الدوران الثاني والثالث', colorHex: '#3b82f6', order: 4 },
    { id: 'zone-5', numberLabel: '٥', name: 'المخيم الكشفي للمجموعات', description: 'موقع فعاليات المجموعات', colorHex: '#8b5cf6', order: 5 },
    { id: 'zone-6', numberLabel: '٦', name: 'ملعب النجيلة بالمركز', description: 'المسابقات والعروض الرياضية', colorHex: '#06b6d4', order: 6 },
    { id: 'zone-7', numberLabel: '٧', name: 'أمام نافورة المركز', description: 'موقع العروض الميدانية', colorHex: '#ec4899', order: 7 },
    { id: 'zone-8', numberLabel: '٨', name: 'إذاعة المهرجان', description: 'البث الرسمي للمهرجان', colorHex: '#14b8a6', order: 8 }
];

const zone = {
    administration: 'zone-1', behindMosque: 'zone-2', mosque: 'zone-3',
    secondFloor: 'zone-4', camp: 'zone-5', field: 'zone-6', fountain: 'zone-7', radio: 'zone-8'
};

export const OFFICIAL_AGENDA = [
    ['before', 1, 'التجمع واستقبال الوفود', 'ceremony', zone.administration, '08:00', '09:00'],
    ['before', 2, 'تحية العلم وافتتاح المهرجان', 'ceremony', zone.camp, '09:00', '10:00'],
    ['before', 3, 'اجتماع القادة وتسليم الأعمال الجاهزة', 'workshop', zone.administration, '10:00', '10:30'],
    ['period-1', 5, 'تسميع القرآن الكريم والأحاديث', 'competition', zone.mosque, '10:30', '12:00'],
    ['period-1', 6, 'المجال الرياضي', 'competition', zone.field, '10:30', '12:00'],
    ['period-1', 7, 'الملصق الفني', 'competition', zone.behindMosque, '10:30', '12:00'],
    ['period-1', 8, 'رحالة العالم الذكي', 'competition', zone.secondFloor, '10:30', '12:00'],
    ['period-1', 9, 'تصميم فيديو دقيقتين بالـ AI', 'competition', zone.secondFloor, '10:30', '12:00'],
    ['period-1', 10, 'عقد وربطات', 'competition', zone.camp, '10:30', '12:00'],
    ['period-2', 11, 'تكملة المجال الرياضي', 'competition', zone.field, '12:00', '13:00'],
    ['period-2', 12, 'الورشة الفنية', 'workshop', zone.behindMosque, '12:00', '13:00'],
    ['period-2', 13, 'ورشة عمل على خطي الأنبياء', 'workshop', zone.secondFloor, '12:00', '13:00'],
    ['period-2', 14, 'عرض ثلاث مبتكرات علمية', 'workshop', zone.secondFloor, '12:00', '13:00'],
    ['period-2', 15, 'النموذج الكشفي', 'workshop', zone.camp, '12:00', '13:00'],
    ['period-2', 16, 'صلاة الجمعة', 'ceremony', zone.mosque, '12:00', '13:00'],
    ['period-3', 17, 'عرض تطير الطائرات', 'ceremony', zone.field, '14:00', '16:00'],
    ['period-3', 18, 'نصب المرصد', 'ceremony', zone.fountain, '14:00', '16:00'],
    ['period-3', 19, 'إقامة حفل الكرنفال', 'ceremony', zone.fountain, '14:00', '16:00'],
    ['period-3', 20, 'حقيقتين وكذبة', 'competition', zone.behindMosque, '14:00', '16:00'],
    ['period-3', 21, 'الكاشف الذكي', 'competition', zone.secondFloor, '14:00', '16:00'],
    ['period-3', 22, 'عرض تقديمي عن أحد الموديلات', 'competition', zone.secondFloor, '14:00', '16:00'],
    ['period-3', 23, 'كينج الشفرات', 'competition', zone.camp, '14:00', '16:00'],
    ['period-3', 24, 'المجلة الأرضية', 'competition', zone.camp, '14:00', '16:00'],
    ['period-4', 25, 'مهرجان التلاوة', 'ceremony', zone.radio, '16:00', '17:30'],
    ['period-4', 26, 'من سيربح الكود', 'competition', zone.secondFloor, '16:00', '17:30'],
    ['period-4', 27, 'عرض تقديمي كوميدي عن مهارة', 'ceremony', zone.secondFloor, '16:00', '17:30'],
    ['period-4', 28, 'مشروع الخدمة العامة', 'workshop', zone.camp, '16:00', '17:30'],
    ['closing', 29, 'حفل الختام والسمر', 'ceremony', zone.camp, '17:30', '18:30']
].map(([period, number, title, type, zoneId, startTime, endTime], index) => ({
    id: `agenda-official-${number}`,
    period,
    order: index + 1,
    title,
    type,
    zoneId,
    startTime,
    endTime,
    description: `الفعالية رقم ${number}`,
    isVisible: true,
    isStarted: false,
    isClosed: false
}));

export const OFFICIAL_AGENDA_IDS = OFFICIAL_AGENDA.map((item) => item.id);
export const PERIOD_LABELS = {
    before: 'قبل الفترة الأولى', 'period-1': 'الفترة الأولى 10:30 - 12:00',
    'period-2': 'الفترة الثانية 12:00 - 13:00', 'period-3': 'الفترة الثالثة 14:00 - 16:00',
    'period-4': 'الفترة الرابعة 16:00 - 17:30', closing: 'الختام 17:30 - 18:30'
};

export function getAgendaStatus(item, now = new Date(), festivalDate = process.env.FESTIVAL_DATE || '2026-08-21') {
    const start = new Date(`${festivalDate}T${item.startTime}:00+03:00`);
    const end = new Date(`${festivalDate}T${item.endTime}:00+03:00`);
    if (item.isClosed || now >= end) return 'finished';
    if (item.isStarted || now >= start) return 'active';
    return 'upcoming';
}
