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

const item = ({ id, period, order, title, type, zoneId, startTime, endTime, competitionId = null, locationNote = '', description = '' }) => ({
    id,
    period,
    order,
    title,
    type,
    zoneId,
    competitionId,
    locationNote,
    startTime,
    endTime,
    description,
    isVisible: true,
    isStarted: false,
    isClosed: false
});

// This is the initial official schedule. After the one-time sync, the database is
// the source of truth and the admin can edit it without this file overwriting changes.
export const OFFICIAL_AGENDA = [
    item({ id: 'agenda-official-1', period: 'before', order: 1, title: 'تجمع واستقبال الوفود', type: 'ceremony', zoneId: zone.camp, startTime: '08:00', endTime: '09:00', description: 'استقبال الفرق والوفود' }),
    item({ id: 'agenda-official-2', period: 'before', order: 2, title: 'تحية العلم وافتتاح المهرجان', type: 'ceremony', zoneId: zone.camp, startTime: '09:00', endTime: '10:00', description: 'الافتتاح الرسمي' }),
    item({ id: 'agenda-official-3', period: 'before', order: 3, title: 'اجتماع القادة وتسليم الأعمال الجاهزة', type: 'workshop', zoneId: zone.administration, startTime: '10:00', endTime: '10:30', description: 'مكان الاجتماع يحدد بعد التأكيد' }),

    item({ id: 'agenda-official-5-quran', period: 'period-1', order: 5, title: 'تسميع القرآن', type: 'competition', zoneId: zone.mosque, startTime: '10:30', endTime: '11:30', competitionId: 'comp-report-catalog-12', description: 'تسميع القرآن الكريم' }),
    item({ id: 'agenda-official-5-hadith', period: 'period-1', order: 6, title: 'الأحاديث', type: 'competition', zoneId: zone.mosque, startTime: '10:30', endTime: '11:30', competitionId: 'comp-report-catalog-13', description: 'تسميع الأحاديث' }),
    item({ id: 'agenda-official-6', period: 'period-1', order: 7, title: 'المجال الرياضي', type: 'competition', zoneId: zone.field, startTime: '10:30', endTime: '11:30', competitionId: 'comp-schedule-6' }),
    item({ id: 'agenda-official-7', period: 'period-1', order: 8, title: 'الملصق', type: 'competition', zoneId: zone.behindMosque, startTime: '10:30', endTime: '11:30', competitionId: 'comp-report-catalog-08' }),
    item({ id: 'agenda-official-8', period: 'period-1', order: 9, title: 'رحالة العالم الذكي', type: 'competition', zoneId: zone.secondFloor, startTime: '10:30', endTime: '11:30', competitionId: 'comp-digital-3', locationNote: 'الدور الثاني' }),
    item({ id: 'agenda-official-9', period: 'period-1', order: 10, title: 'الفيديو (تصميم فيديو دقيقتين)', type: 'competition', zoneId: zone.secondFloor, startTime: '10:30', endTime: '11:30', competitionId: 'comp-video-1', locationNote: 'الدور الثالث' }),
    item({ id: 'agenda-official-10', period: 'period-1', order: 11, title: 'عقد وربطات', type: 'competition', zoneId: zone.camp, startTime: '10:30', endTime: '11:30', competitionId: 'comp-report-catalog-17' }),

    item({ id: 'agenda-official-11', period: 'period-2', order: 12, title: 'تكملة المجال الرياضي', type: 'competition', zoneId: zone.field, startTime: '11:30', endTime: '13:00', competitionId: 'comp-schedule-11' }),
    item({ id: 'agenda-official-12', period: 'period-2', order: 13, title: 'الورشة الفنية', type: 'competition', zoneId: zone.behindMosque, startTime: '11:30', endTime: '13:00', competitionId: 'comp-report-catalog-10' }),
    item({ id: 'agenda-official-13', period: 'period-2', order: 14, title: 'ورقة عمل على خطى الأنبياء', type: 'competition', zoneId: zone.secondFloor, startTime: '11:30', endTime: '13:00', competitionId: 'comp-report-catalog-14', locationNote: 'الدور الثاني' }),
    item({ id: 'agenda-official-14', period: 'period-2', order: 15, title: 'بحث ثلاث أفكار لمبتكرات علمية', type: 'competition', zoneId: zone.secondFloor, startTime: '11:30', endTime: '13:00', competitionId: 'comp-report-catalog-01', locationNote: 'الدور الثالث' }),
    item({ id: 'agenda-official-15', period: 'period-2', order: 16, title: 'النموذج الكشفي', type: 'competition', zoneId: zone.camp, startTime: '11:30', endTime: '13:00', competitionId: 'comp-report-catalog-05' }),
    item({ id: 'agenda-official-16', period: 'period-2', order: 17, title: 'صلاة الجمعة', type: 'ceremony', zoneId: zone.mosque, startTime: '13:00', endTime: '14:00' }),

    item({ id: 'agenda-official-17', period: 'period-3', order: 18, title: 'عرض تطيير الطائرات', type: 'ceremony', zoneId: zone.field, startTime: '14:00', endTime: '16:00' }),
    item({ id: 'agenda-official-19', period: 'period-3', order: 19, title: 'الكرنفال', type: 'competition', zoneId: zone.fountain, startTime: '14:00', endTime: '16:00', competitionId: 'comp-report-catalog-16' }),
    item({ id: 'agenda-official-23', period: 'period-3', order: 20, title: 'كينج الشفرات', type: 'competition', zoneId: zone.camp, startTime: '14:00', endTime: '16:00', competitionId: 'comp-schedule-23' }),
    item({ id: 'agenda-official-21-smart-detector', period: 'period-3', order: 21, title: 'أحد موديلات الذكاء الاصطناعي', type: 'competition', zoneId: zone.secondFloor, startTime: '14:00', endTime: '16:00', competitionId: 'comp-report-catalog-02', locationNote: 'الدور الثالث' }),
    item({ id: 'agenda-official-20', period: 'period-3', order: 22, title: 'المحقق الذكي', type: 'competition', zoneId: zone.secondFloor, startTime: '14:00', endTime: '16:00', competitionId: 'comp-digital-2', locationNote: 'الدور الثاني' }),
    item({ id: 'agenda-official-18', period: 'period-3', order: 23, title: 'نصب المعرض', type: 'competition', zoneId: zone.fountain, startTime: '15:00', endTime: '16:00', competitionId: 'comp-report-catalog-09' }),
    item({ id: 'agenda-official-24', period: 'period-3', order: 24, title: 'المجلة الأرضية', type: 'competition', zoneId: zone.camp, startTime: '15:00', endTime: '16:00', competitionId: 'comp-report-catalog-04' }),
    item({ id: 'agenda-official-22', period: 'period-3', order: 25, title: 'الكاشف الذكي', type: 'competition', zoneId: zone.behindMosque, startTime: '14:00', endTime: '16:00', competitionId: 'comp-report-catalog-03', locationNote: 'خلف المسجد' }),

    item({ id: 'agenda-official-28', period: 'period-4', order: 26, title: 'الخدمة العامة', type: 'workshop', zoneId: zone.camp, startTime: '16:00', endTime: '17:30' }),
    item({ id: 'agenda-official-27', period: 'period-4', order: 27, title: 'ريلز', type: 'competition', zoneId: zone.secondFloor, startTime: '16:00', endTime: '17:30', competitionId: 'comp-report-catalog-06', locationNote: 'الدور الثالث' }),
    item({ id: 'agenda-official-26', period: 'period-4', order: 28, title: 'من سيربح الكود', type: 'competition', zoneId: zone.secondFloor, startTime: '16:00', endTime: '17:30', competitionId: 'comp-digital-1', locationNote: 'الدور الثاني' }),
    item({ id: 'agenda-official-29-video', period: 'period-4', order: 29, title: 'الاستعداد للختام', type: 'ceremony', zoneId: zone.camp, startTime: '16:00', endTime: '17:30', locationNote: 'الاستعداد للختام' }),
    item({ id: 'agenda-official-25', period: 'period-4', order: 30, title: 'مهرجان التلاوة', type: 'competition', zoneId: zone.radio, startTime: '16:00', endTime: '17:30', competitionId: 'comp-report-catalog-15' }),

    item({ id: 'agenda-official-closing', period: 'closing', order: 31, title: 'حفل الختام والسمر', type: 'ceremony', zoneId: zone.camp, startTime: '17:30', endTime: '20:30', competitionId: 'comp-report-catalog-07' })
];

export const OFFICIAL_AGENDA_IDS = OFFICIAL_AGENDA.map((item) => item.id);
export const PERIOD_LABELS = {
    before: 'قبل الفترة الأولى',
    'period-1': 'الفترة الأولى 10:30 - 11:30',
    'period-2': 'الفترة الثانية 11:30 - 13:00',
    'period-3': 'الفترة الثالثة 14:00 - 16:00',
    'period-4': 'الفترة الرابعة 16:00 - 17:30',
    closing: 'الختام 17:30 - 20:30'
};

export function getAgendaStatus(item, now = new Date(), festivalDate = process.env.FESTIVAL_DATE || '2026-08-21') {
    if (item.isClosed) return 'finished';
    if (item.isStarted) return 'active';
    try {
        const start = new Date(`${festivalDate}T${String(item.startTime || '').slice(0, 5)}:00+03:00`);
        const end = new Date(`${festivalDate}T${String(item.endTime || '').slice(0, 5)}:00+03:00`);
        if (now >= start && now < end) return 'active';
        if (now >= end) return 'finished';
    } catch {
        // invalid date
    }
    return 'upcoming';
}
