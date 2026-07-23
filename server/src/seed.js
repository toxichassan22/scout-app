import bcrypt from 'bcryptjs';
import prisma from './db.js';

async function seed() {
  console.log('[Seed] Starting database seed...');

  // Create default Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword
    }
  });
  console.log('[Seed] Admin account created: admin / admin123');

  // Create sample Teams
  const sampleTeams = [
    { username: 'team1', label: 'الكتيبة الأولى', pass: 'team123' },
    { username: 'team2', label: 'فريق الصقور', pass: 'team123' },
    { username: 'team3', label: 'فريق النسر الفضي', pass: 'team123' },
    { username: 'team4', label: 'فريق الفرسان', pass: 'team123' },
    { username: 'team5', label: 'فريق الشعلة', pass: 'team123' }
  ];

  for (const t of sampleTeams) {
    const passwordHash = await bcrypt.hash(t.pass, 10);
    await prisma.team.upsert({
      where: { username: t.username },
      update: {},
      create: {
        username: t.username,
        passwordHash,
        label: t.label
      }
    });
  }
  console.log('[Seed] Sample teams created.');

  // Create sample Judge
  const judgePassword = await bcrypt.hash('judge123', 10);
  await prisma.judge.upsert({
    where: { username: 'judge1' },
    update: {},
    create: {
      name: 'د. أحمد المحكّم',
      username: 'judge1',
      passwordHash: judgePassword
    }
  });
  console.log('[Seed] Sample judge created: judge1 / judge123');

  // Create sample Competitions
  const comp1 = await prisma.competition.upsert({
    where: { id: 'comp-digital-1' },
    update: {},
    create: {
      id: 'comp-digital-1',
      name: 'المسابقة الثقافية الرقمية',
      slug: 'cultural-quiz',
      type: 'auto_digital',
      isOpen: true,
      criteria: JSON.stringify([])
    }
  });

  const comp2 = await prisma.competition.upsert({
    where: { id: 'comp-video-1' },
    update: {},
    create: {
      id: 'comp-video-1',
      name: 'مسابقة تصميم الفيديو الكشفي',
      slug: 'video-design',
      type: 'manual_judged',
      isOpen: true,
      passcode: '1234',
      criteria: JSON.stringify([
        { key: 'creativity', label: 'الابتكار والفكرة', maxScore: 30 },
        { key: 'editing', label: 'جودة المونتاج والإخراج', maxScore: 40 },
        { key: 'sound', label: 'الهندسة الصوتية والمؤثرات', maxScore: 30 }
      ])
    }
  });
  console.log('[Seed] Competitions created (Passcode for video judging: 1234)');

  // Create official 8 Zones from center map
  const officialZones = [
    { id: 'zone-1', numberLabel: '١', name: 'مبنى الإدارة', description: 'المقر الإداري واستقبال الوفود', colorHex: '#ef4444', order: 1 },
    { id: 'zone-2', numberLabel: '٢', name: 'مبنى الأنشطة', description: 'منطقة الورش والمسابقات الثقافية والذكاء الاصطناعي', colorHex: '#10b981', order: 2 },
    { id: 'zone-3', numberLabel: '٣', name: 'المسجد', description: 'مكان الصلاة والمصلى الرئيسي', colorHex: '#f59e0b', order: 3 },
    { id: 'zone-4', numberLabel: '٤', name: 'المبنى الجديد', description: 'قاعات المحاضرات والتقييمات الميدانية', colorHex: '#3b82f6', order: 4 },
    { id: 'zone-5', numberLabel: '٥', name: 'المخيم الكشفي', description: 'أرض المخيم الكشفي والتخييم الكشفي الفعلي', colorHex: '#8b5cf6', order: 5 },
    { id: 'zone-6', numberLabel: '٦', name: 'ملعب كرة القدم', description: 'الملعب الكروي الرئيسي والعروض الميدانية', colorHex: '#06b6d4', order: 6 },
    { id: 'zone-7', numberLabel: '٧', name: 'ملعب كرة السلة', description: 'ملعب الرياضات السريعة والمسابقات الميدانية', colorHex: '#ec4899', order: 7 },
    { id: 'zone-8', numberLabel: '٨', name: 'ملعب الخماسي', description: 'ملعب الأنشطة الكشفية الخماسية والألعاب الرياضية', colorHex: '#14b8a6', order: 8 },
  ];

  for (const z of officialZones) {
    await prisma.zone.upsert({
      where: { id: z.id },
      update: { name: z.name, description: z.description, numberLabel: z.numberLabel, colorHex: z.colorHex, order: z.order },
      create: z
    });
  }
  // Create official Agenda Items from the festival schedule (12.png)
  const officialAgenda = [
    {
      id: 'agenda-1',
      title: 'تجمع واستقبال الوفود',
      type: 'ceremony',
      zoneId: 'zone-1',
      startTime: '08:00',
      endTime: '09:00',
      description: 'استقبال جميع الفرق والوفود الكشفية المشاركة وتوزيع التعليمات التنظيمية'
    },
    {
      id: 'agenda-2',
      title: 'تحية العلم وافتتاح المهرجان',
      type: 'ceremony',
      zoneId: 'zone-5',
      startTime: '09:00',
      endTime: '10:00',
      description: 'مراسم رفع العلم الكشفي وافتتاح فعاليات المهرجان رسمياً'
    },
    {
      id: 'agenda-3',
      title: 'اجتماع القادة وتسليم الأعمال الجاهزة',
      type: 'workshop',
      zoneId: 'zone-1',
      startTime: '10:00',
      endTime: '10:30',
      description: 'اجتماع قادة الفرق وتسليم الأبحاث والأعمال الكشفية المجهزة مسبقاً'
    },
    {
      id: 'agenda-4',
      title: 'تسميع القرآن والأحاديث والأنشطة الفنية والرياضية',
      type: 'competition',
      zoneId: 'zone-2',
      startTime: '10:30',
      endTime: '11:30',
      description: 'تسميع القرآن - تسميع الأحاديث - المجال الرياضي - الملصق الفني - عقد وربطات - تصميم فيديو دقيقتين - عواصم وعملات الدول العربية'
    },
    {
      id: 'agenda-5',
      title: 'الورش الفنية والمبتكرات العلمية والنموذج الكشفي',
      type: 'workshop',
      zoneId: 'zone-2',
      startTime: '11:30',
      endTime: '01:00',
      description: 'تكملة المجال الرياضي - الورشة الفنية - النموذج الكشفي - بحث ثلاث أفكار لمبتكرات علمية - ورقة عمل على خطي الأنبياء'
    },
    {
      id: 'agenda-6',
      title: 'صلاة الجمعة',
      type: 'ceremony',
      zoneId: 'zone-3',
      startTime: '01:00',
      endTime: '02:00',
      description: 'أداء صلاة الجمعة بالمصلى الرئيسي للمخيم'
    },
    {
      id: 'agenda-7',
      title: 'العروض الميدانية والمعرض والمسابقات الكشفية',
      type: 'competition',
      zoneId: 'zone-6',
      startTime: '02:00',
      endTime: '04:00',
      description: 'عرض تطير الطائرات - الكرنفال - كينج الشفرات - عرض تقديمي عن أحد الموديلات - حقيقتين وكذبة - نصب المجلة الأرضية والمعرض الساعة 3 العصر - الكاشف الذكي'
    },
    {
      id: 'agenda-8',
      title: 'الخدمة العامة والعروض التقديمية ومهرجان التلاوة',
      type: 'workshop',
      zoneId: 'zone-5',
      startTime: '04:00',
      endTime: '05:30',
      description: 'الخدمة العامة - عرض تقديمي كوميدي عن مهارة - من سيربح الكود - الاستعداد للختام - مهرجان التلاوة'
    },
    {
      id: 'agenda-9',
      title: 'حفل الختام والسمر الكشفي',
      type: 'ceremony',
      zoneId: 'zone-6',
      startTime: '05:30',
      endTime: '08:30',
      description: 'حفل الختام الرسمي، إعلان النتائج وتوزيع الجوائز وسهرة السمر الكشفي'
    }
  ];

  for (const item of officialAgenda) {
    await prisma.agendaItem.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        type: item.type,
        zoneId: item.zoneId,
        startTime: item.startTime,
        endTime: item.endTime,
        description: item.description
      },
      create: item
    });
  }
  console.log('[Seed] Official 9 Agenda items created.');

  // Create sample News
  await prisma.news.create({
    data: {
      title: 'مرحباً بكم في المهرجان الكشفي الرقمي',
      body: 'نتمنى لجميع الفرق المشاركة التوفيق والتميز في فعاليات اليوم.',
      createdByAdminId: 'admin'
    }
  });

  console.log('[Seed] Seed completed successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
