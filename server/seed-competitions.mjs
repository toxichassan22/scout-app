import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get existing zones to map them
const zones = await prisma.zone.findMany();
const zoneMap = {};
zones.forEach(z => { zoneMap[z.numberLabel] = z.id; });

console.log('Zones:', Object.entries(zoneMap).map(([k,v]) => `${k}=${v}`).join(', '));

// Competitions to add as agenda items
const competitionsToAdd = [
  {
    title: 'مسابقة عبقرينو',
    type: 'competition',
    zoneId: zoneMap['٢'], // مبنى الأنشطة
    startTime: '10:30',
    endTime: '12:00',
    description: 'مسابقة رقمية ذكية - أسئلة سريعة وتحديات عبقرينو'
  },
  {
    title: 'مسابقة الجغرافيا',
    type: 'competition',
    zoneId: zoneMap['٢'], // مبنى الأنشطة
    startTime: '10:30',
    endTime: '11:30',
    description: 'مسابقة جغرافيا رقمية - اختبر معلوماتك الجغرافية'
  },
  {
    title: 'مسابقة حقيقتان وكذبة',
    type: 'competition',
    zoneId: zoneMap['٢'], // مبنى الأنشطة
    startTime: '10:30',
    endTime: '11:30',
    description: 'تحدي الذكاء - اكتشف الحقيقة من بين الأكاذيب'
  },
  {
    title: 'مسابقة تصميم الفيديو الكشفي',
    type: 'competition',
    zoneId: zoneMap['٤'], // المبنى الجديد
    startTime: '11:30',
    endTime: '01:00',
    description: 'تصميم فيديو كشفي إبداعي - أظهر مهاراتك في المونتاج'
  },
];

let added = 0;
for (const item of competitionsToAdd) {
  if (!item.zoneId) {
    console.log(`SKIP: zone not found for ${item.title}`);
    continue;
  }
  try {
    await prisma.agendaItem.create({ data: item });
    console.log(`ADDED: ${item.title}`);
    added++;
  } catch (err) {
    console.log(`ERROR: ${item.title} - ${err.message}`);
  }
}

console.log(`\nDone. Added ${added} items.`);
await prisma.$disconnect();
