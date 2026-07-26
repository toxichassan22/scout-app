import { Router } from 'express';
import prisma from '../../db.js';

const router = Router();

// Seed missing competition agenda items
router.post('/seed-agenda', async (req, res) => {
  try {
    const zones = await prisma.zone.findMany();
    const zoneMap = {};
    zones.forEach(z => { zoneMap[z.numberLabel] = z.id; });

    const existing = await prisma.agendaItem.findMany();

    // Clear old agenda items to re-seed with expanded list
    if (existing.length > 0) {
      await prisma.agendaItem.deleteMany();
    }

    const items = [
      { title: 'تجمع واستقبال الوفود', type: 'ceremony', zoneId: zoneMap['١'], startTime: '08:00', endTime: '09:00', description: 'استقبال جميع الفرق والوفود المشاركة وتوزيع التعليمات التنظيمية', order: 1 },
      { title: 'تحية العلم وافتتاح المهرجان', type: 'ceremony', zoneId: zoneMap['٥'], startTime: '09:00', endTime: '10:00', description: 'مراسم رفع العلم الكشفي وافتتاح فعاليات المهرجان رسمياً', order: 2 },
      { title: 'اجتماع القادة وتسليم الأعمال الجاهزة', type: 'workshop', zoneId: zoneMap['١'], startTime: '10:00', endTime: '10:30', description: 'اجتماع فرق القادة وتسليم الأبحاث والعروض الكشفية الجاهزة', order: 3 },
      { title: 'تسميع القرآن الكريم', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة تسميع القرآن الكريم', order: 4 },
      { title: 'تسميع الأحاديث النبوية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة تسميع الأحاديث النبوية', order: 5 },
      { title: 'المجال الرياضي', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'تحديات رياضية ميدانية', order: 6 },
      { title: 'الموسيقى الفني', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'الموسيقى والإلقاء الفني', order: 7 },
      { title: 'عقد وربطات الكشفية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'عقد وربطات الكشفية', order: 8 },
      { title: 'تصميم فيديو كشفي', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'تصميم فيديو دقيقتين', order: 9 },
      { title: 'عواصم وعملات الدول العربية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة عواصم وعملات الدول العربية', order: 10 },
      { title: 'تكمية المجال الرياضي', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'تكمية المجال الرياضي', order: 11 },
      { title: 'الورشة الفنية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'الورشة الفنية', order: 12 },
      { title: 'النموذج الكشفي', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'النموذج الكشفي', order: 13 },
      { title: 'بحث ثلاث أفكار لمبتكرات علمية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'بحث ثلاث أفكار لمبتكرات علمية', order: 14 },
      { title: 'ورقة عمل على خطي الأبجية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'ورقة عمل على خطي الأبجية', order: 15 },
      { title: 'صلاة الجمعة', type: 'ceremony', zoneId: zoneMap['٣'], startTime: '01:00', endTime: '02:00', description: 'صلاة الجمعة الجماعية', order: 16 },
      { title: 'عرض تنظير الطائرات', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'طائرات ورقية', order: 17 },
      { title: 'الكرنفال الكشفي', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الكرنفال الاستعراضي', order: 18 },
      { title: 'كينج الشفرات', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'فك الشفرات', order: 19 },
      { title: 'عرض تقديمي عن الموديلات الكشفية', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الموديلات الكشفية', order: 20 },
      { title: 'حقيقتان وكذبة', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'تحدي الذكاء', order: 21 },
      { title: 'المجلة الأرضية', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'المجلة الأرضية والمعرض', order: 22 },
      { title: 'الكاشف الذكي', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الكاشف الذكي', order: 23 },
      { title: 'الخدمة العامة', type: 'workshop', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'مشروع الخدمة العامة', order: 24 },
      { title: 'عرض تقديمي كوميدي', type: 'competition', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'عرض كوميدي عن مهارة كشفية', order: 25 },
      { title: 'مهرجان التلاوة', type: 'competition', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'مهرجان التلاوة', order: 26 },
      { title: 'حفل الختام والسمر', type: 'ceremony', zoneId: zoneMap['٦'], startTime: '05:30', endTime: '08:30', description: 'حفل الختام والسمر الكشفي - التكريمات والجوائز', order: 27 },
    ];

    let added = 0;
    for (const item of items) {
      if (!item.zoneId) continue;
      await prisma.agendaItem.create({ data: item });
      added++;
    }

    // Seed competitions
    const existingComps = await prisma.competition.findMany();
    const existingCompSlugs = new Set(existingComps.map(e => e.slug));

    const competitions = [
      { name: 'مسابقة عبقرينو (من سيربح الكود)', slug: 'genius', type: 'auto_digital', description: 'مسابقة رقمية ذكية', passcode: '1001', duration: 900 },
      { name: 'مسابقة حقيقتان وكذبة', slug: 'two_truths', type: 'auto_digital', description: 'تحدي الذكاء', passcode: '1002', duration: 600 },
      { name: 'مسابقة الجغرافيا', slug: 'geography', type: 'auto_digital', description: 'مسابقة جغرافيا رقمية', passcode: '1003', duration: 600 },
      { name: 'مسابقة تصميم الفيديو الكشفي', slug: 'video', type: 'manual_judged', description: 'تصميم فيديو كشفي', passcode: '1234' },
      { name: 'تسميع القرآن الكريم', slug: 'quran', type: 'manual_judged', description: 'تسميع القرآن الكريم' },
      { name: 'تسميع الأحاديث النبوية', slug: 'hadith', type: 'manual_judged', description: 'تسميع الأحاديث النبوية' },
      { name: 'المجال الرياضي', slug: 'sports', type: 'manual_judged', description: 'تحديات رياضية ميدانية' },
      { name: 'الموسيقى الفني', slug: 'music', type: 'manual_judged', description: 'الموسيقى والإلقاء الفني' },
      { name: 'عقد وربطات الكشفية', slug: 'knots', type: 'manual_judged', description: 'عقد وربطات الكشفية' },
      { name: 'الورشة الفنية', slug: 'art_workshop', type: 'manual_judged', description: 'الورشة الفنية' },
      { name: 'النموذج الكشفي', slug: 'scout_model', type: 'manual_judged', description: 'النموذج الكشفي' },
      { name: 'بحث ثلاث أفكار لمبتكرات علمية', slug: 'innovation', type: 'manual_judged', description: 'مبتكرات علمية' },
      { name: 'ورقة عمل على خطي الأبجية', slug: 'calligraphy', type: 'manual_judged', description: 'خطي الأبجية' },
      { name: 'عرض تنظير الطائرات', slug: 'planes', type: 'manual_judged', description: 'طائرات ورقية' },
      { name: 'الكرنفال الكشفي', slug: 'carnival', type: 'manual_judged', description: 'الكرنفال الاستعراضي' },
      { name: 'كينج الشفرات', slug: 'ciphers', type: 'manual_judged', description: 'فك الشفرات' },
      { name: 'عرض تقديمي عن الموديلات الكشفية', slug: 'model_presentation', type: 'manual_judged', description: 'الموديلات الكشفية' },
      { name: 'المجلة الأرضية', slug: 'magazine', type: 'manual_judged', description: 'المجلة الأرضية والمعرض' },
      { name: 'الكاشف الذكي', slug: 'detector', type: 'manual_judged', description: 'الكاشف الذكي' },
      { name: 'الخدمة العامة', slug: 'service', type: 'manual_judged', description: 'مشروع الخدمة العامة' },
      { name: 'عرض تقديمي كوميدي', slug: 'comedy', type: 'manual_judged', description: 'عرض كوميدي عن مهارة كشفية' },
      { name: 'مهرجان التلاوة', slug: 'tilawa', type: 'manual_judged', description: 'مهرجان التلاوة' },
      { name: 'سهرة السمر والختام', slug: 'closing_night', type: 'manual_judged', description: 'سهرة السمر والختام' },
    ];

    let compsAdded = 0;
    for (const comp of competitions) {
      if (existingCompSlugs.has(comp.slug)) continue;
      await prisma.competition.create({ data: { ...comp, isOpen: true } });
      compsAdded++;
    }

    if (req.io) {
      req.io.emit('agenda:update', { action: 'seeded', agendaAdded: added });
      if (compsAdded > 0) req.io.emit('competition:update', { action: 'seeded', count: compsAdded });
    }
    res.json({ success: true, agendaAdded: added, compsAdded, totalAgenda: existing.length + added, totalComps: existingComps.length + compsAdded });
  } catch (err) {
    req.log.error({ err }, 'admin seed agenda failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة البيانات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
