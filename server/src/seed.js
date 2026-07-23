import bcrypt from 'bcryptjs';
import prisma from './db.js';

async function seed() {
  console.log('[Seed] Starting comprehensive database seed with official 22 Arab Geography countries...');

  // 1️⃣ Create default Admin
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

  // 2️⃣ Create sample Teams
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

  // 3️⃣ Create sample Judges
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

  // 4️⃣ Create All Official Competitions
  const competitions = [
    {
      id: 'comp-digital-1',
      name: 'مسابقة عبقرينو التقنية الكشفية',
      slug: 'genius',
      type: 'auto_digital',
      description: 'أسئلة سرعة وتفكير ذكي حول التكنولوجيا والتقاليد الكشفية',
      isOpen: true,
      duration: 600,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-digital-2',
      name: 'مسابقة حقيقتان وكذبة',
      slug: 'two_truths',
      type: 'auto_digital',
      description: 'اكتشف عبارة الزور من بين الحقائق الكشفية والتاريخية',
      isOpen: true,
      duration: 600,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-digital-3',
      name: 'مسابقة الجغرافيا وتضاريس الوطن العربي',
      slug: 'geography',
      type: 'auto_digital',
      description: 'التعرف على الأعلام والعواصم والعملات والتقسيم الإداري ونظام الحكم للـ 22 دولة عربية',
      isOpen: true,
      duration: 600,
      criteria: JSON.stringify([])
    },
    {
      id: 'comp-video-1',
      name: 'مسابقة تصميم الفيديو الكشفي (دقيقتين)',
      slug: 'video_design',
      type: 'manual_judged',
      description: 'تقييم لجنة التحكيم لمونتاج ومحتوى الفيديو الكشفي',
      isOpen: true,
      passcode: '1234',
      criteria: JSON.stringify([
        { key: 'creativity', label: 'الابتكار والفكرة', maxScore: 30 },
        { key: 'editing', label: 'جودة المونتاج والإخراج', maxScore: 40 },
        { key: 'sound', label: 'الهندسة الصوتية والمؤثرات', maxScore: 30 }
      ])
    }
  ];

  for (const comp of competitions) {
    await prisma.competition.upsert({
      where: { id: comp.id },
      update: comp,
      create: comp
    });
  }
  console.log('[Seed] All Digital & Manual Competitions created!');

  // 5️⃣ Seed Official 22 Arab Geography Countries Table
  const arabCountries = [
    { id: 'geo-1', name: 'مصر', capital: 'القاهرة', division: '27 محافظة', governance: 'جمهوري رئاسي', currency: 'جنيه مصري', flag: '🇪🇬', sortOrder: 1 },
    { id: 'geo-2', name: 'السعودية', capital: 'الرياض', division: '13 منطقة إدارية', governance: 'ملكي مطلق', currency: 'ريال سعودي', flag: '🇸🇦', sortOrder: 2 },
    { id: 'geo-3', name: 'الإمارات', capital: 'أبوظبي', division: '7 إمارات اتحادية', governance: 'إتحادي رئاسي', currency: 'درهم إماراتي', flag: '🇦🇪', sortOrder: 3 },
    { id: 'geo-4', name: 'الكويت', capital: 'الكويت', division: '6 محافظات', governance: 'أميري دستوري', currency: 'دينار كويتي', flag: '🇰🇼', sortOrder: 4 },
    { id: 'geo-5', name: 'قطر', capital: 'الدوحة', division: '8 بلديات', governance: 'أميري وراثي', currency: 'ريال قطري', flag: '🇶🇦', sortOrder: 5 },
    { id: 'geo-6', name: 'البحرين', capital: 'المنامة', division: '4 محافظات', governance: 'ملكي دستوري', currency: 'دينار بحريني', flag: '🇧🇭', sortOrder: 6 },
    { id: 'geo-7', name: 'سلطنة عُمان', capital: 'مسقط', division: '11 محافظة', governance: 'سلطاني وراثي', currency: 'ريال عُماني', flag: '🇴🇲', sortOrder: 7 },
    { id: 'geo-8', name: 'الأردن', capital: 'عمّان', division: '12 محافظة', governance: 'ملكي نيابي وراثي', currency: 'دينار أردني', flag: '🇯🇴', sortOrder: 8 },
    { id: 'geo-9', name: 'العراق', capital: 'بغداد', division: '18 محافظة', governance: 'جمهوري برلماني اتحادي', currency: 'دينار عراقي', flag: '🇮🇶', sortOrder: 9 },
    { id: 'geo-10', name: 'سوريا', capital: 'دمشق', division: '14 محافظة', governance: 'جمهوري', currency: 'ليرة سورية', flag: '🇸🇾', sortOrder: 10 },
    { id: 'geo-11', name: 'لبنان', capital: 'بيروت', division: '9 محافظات', governance: 'جمهوري برلماني', currency: 'ليرة لبنانية', flag: '🇱🇧', sortOrder: 11 },
    { id: 'geo-12', name: 'فلسطين', capital: 'القدس', division: '16 محافظة', governance: 'جمهوري شبه رئاسي', currency: 'الشيكل / الدينار الأردني', flag: '🇵🇸', sortOrder: 12 },
    { id: 'geo-13', name: 'اليمن', capital: 'صنعاء', division: '22 محافظة', governance: 'جمهوري', currency: 'ريال يمني', flag: '🇾🇪', sortOrder: 13 },
    { id: 'geo-14', name: 'السودان', capital: 'الخرطوم', division: '18 ولاية', governance: 'جمهوري', currency: 'جنيه سوداني', flag: '🇸🇩', sortOrder: 14 },
    { id: 'geo-15', name: 'ليبيا', capital: 'طرابلس', division: '22 بلدية', governance: 'جمهوري', currency: 'دينار ليبي', flag: '🇱🇾', sortOrder: 15 },
    { id: 'geo-16', name: 'تونس', capital: 'تونس', division: '24 ولاية', governance: 'جمهوري رئاسي', currency: 'دينار تونسي', flag: '🇹🇳', sortOrder: 16 },
    { id: 'geo-17', name: 'الجزائر', capital: 'الجزائر', division: '58 ولاية', governance: 'جمهوري شبه رئاسي', currency: 'دينار جزائري', flag: '🇩🇿', sortOrder: 17 },
    { id: 'geo-18', name: 'المغرب', capital: 'الرباط', division: '12 جهة', governance: 'ملكي دستوري نيابي', currency: 'درهم مغربي', flag: '🇲🇦', sortOrder: 18 },
    { id: 'geo-19', name: 'موريتانيا', capital: 'نواكشوط', division: '15 ولاية', governance: 'جمهوري إسلامي', currency: 'أوقية موريتانية', flag: '🇲🇷', sortOrder: 19 },
    { id: 'geo-20', name: 'الصومال', capital: 'مقديشو', division: '18 إقليماً', governance: 'جمهوري اتحادي برلماني', currency: 'شلن صومالي', flag: '🇸🇴', sortOrder: 20 },
    { id: 'geo-21', name: 'جيبوتي', capital: 'جيبوتي', division: '6 أقاليم', governance: 'جمهوري شبه رئاسي', currency: 'فرنك جيبوتي', flag: '🇩🇯', sortOrder: 21 },
    { id: 'geo-22', name: 'جزر القمر', capital: 'موروني', division: '3 جزر رئيسية', governance: 'جمهوري اتحادي رئاسي', currency: 'فرنك قمري', flag: '🇰🇲', sortOrder: 22 },
  ];

  for (const item of arabCountries) {
    await prisma.geographyCountry.upsert({
      where: { id: item.id },
      update: item,
      create: item
    });
  }
  console.log('[Seed] Official 22 Arab Geography Countries seeded successfully!');

  // 6️⃣ Seed Official Questions for "عبقرينو" (comp-digital-1)
  const geniusQuestions = [
    {
      id: 'g_q1',
      competitionId: 'comp-digital-1',
      text: 'ما هو اسم مؤسس الحركة الكشفية العالمية؟',
      options: JSON.stringify(['روبرت بادن باول', 'تشارلز داروين', 'جوزيف بوينت', 'وليم سميث']),
      correctOption: 0,
      points: 10,
      sortOrder: 1
    },
    {
      id: 'g_q2',
      competitionId: 'comp-digital-1',
      text: 'أي من الروابط الكشفية التالية تستخدم لربط حبلين مختلفين في السمك؟',
      options: JSON.stringify(['العقدة الأفقية', 'الربطة التسميكية (Sheet Bend)', 'عقدة الوتد', 'ربطة المشنقة']),
      correctOption: 1,
      points: 10,
      sortOrder: 2
    },
    {
      id: 'g_q3',
      competitionId: 'comp-digital-1',
      text: 'ما معنى اختصار كلمة AI باللغة العربية؟',
      options: JSON.stringify(['الأمن المعلوماتي', 'الذكاء الاصطناعي', 'الإنترنت المتقدم', 'الأدوات التفاعلية']),
      correctOption: 1,
      points: 10,
      sortOrder: 3
    },
    {
      id: 'g_q4',
      competitionId: 'comp-digital-1',
      text: 'في أي عام تأسست الحركة الكشفية بمصر رسمياً؟',
      options: JSON.stringify(['1914م', '1920م', '1907م', '1952م']),
      correctOption: 0,
      points: 10,
      sortOrder: 4
    },
    {
      id: 'g_q5',
      competitionId: 'comp-digital-1',
      text: 'ما الشفرة التقنية الحديثة التي تتكون من مربعات سوداء وبيضاء وتُقرأ بميرا الموبايل؟',
      options: JSON.stringify(['شفرة مورس', 'شفرة سيزار', 'شفرة الاستجابة السريعة (QR Code)', 'شفرة الشفافية']),
      correctOption: 2,
      points: 10,
      sortOrder: 5
    }
  ];

  for (const q of geniusQuestions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: q,
      create: q
    });
  }

  // 7️⃣ Create official 8 Zones from center map
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

  // 8️⃣ Create official Agenda Items
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
      update: item,
      create: item
    });
  }

  console.log('[Seed] All 22 Arab Countries & Quiz datasets populated successfully!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
