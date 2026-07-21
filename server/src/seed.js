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
  console.log('[Seed] Official 8 Zones created.');

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
