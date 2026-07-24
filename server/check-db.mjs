import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const agenda = await prisma.agendaItem.findMany({ include: { zone: true }, orderBy: { startTime: 'asc' } });
console.log('=== Agenda Items ===');
console.log(`Total: ${agenda.length}`);
agenda.forEach(a => console.log(`  [${a.type}] ${a.title} | zone: ${a.zone?.numberLabel} | ${a.startTime}-${a.endTime} | visible: ${a.isVisible}`));

await prisma.$disconnect();
