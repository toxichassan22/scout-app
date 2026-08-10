process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';
import { getFestivalContext } from '../src/aiContext.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Program123';
let admin;
let competition;
let agenda;

async function request(base, route, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

try {
  await prisma.zone.create({
    data: { id: `program-zone-${suffix}`, numberLabel: 'اختبار', name: 'منطقة اختبار', description: '', colorHex: '#10b981', order: 99 },
  });
  admin = await prisma.admin.create({ data: { username: `program-admin-${suffix}`, passwordHash: await bcrypt.hash(password, 4) } });
  competition = await prisma.competition.create({
    data: {
      name: `مسابقة قديمة ${suffix}`,
      slug: `program-propagation-${suffix}`,
      type: 'manual_judged',
      isOpen: true,
      criteria: JSON.stringify([{ key: 'quality', label: 'الجودة', maxScore: 10 }]),
    },
  });

  await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const login = await request(base, '/auth/admin/login', { method: 'POST', body: { username: admin.username, password } });
  assert.equal(login.status, 200);
  const token = login.body.token;

  const created = await request(base, '/admin/agenda', {
    method: 'POST',
    token,
    body: {
      title: 'اسم البرنامج الأول',
      type: 'competition',
      zoneId: `program-zone-${suffix}`,
      competitionId: competition.id,
      locationNote: 'خلف المسجد',
      startTime: '10:30',
      endTime: '12:00',
      description: 'اختبار propagation',
    },
  });
  assert.equal(created.status, 201, 'admin should create a linked agenda item');
  agenda = created.body;

  let storedCompetition = await prisma.competition.findUnique({ where: { id: competition.id } });
  assert.equal(storedCompetition.name, 'اسم البرنامج الأول', 'agenda name should synchronize to competition');
  assert.equal(storedCompetition.startsAt.getHours(), 10, 'agenda start should synchronize to competition');
  assert.equal(storedCompetition.endsAt.getHours(), 12, 'agenda end should synchronize to competition');

  const publicAgenda = await request(base, '/agenda', { token });
  const publicItem = publicAgenda.body.agenda.find(item => item.id === agenda.id);
  assert.equal(publicItem.title, 'اسم البرنامج الأول', 'teams should see the canonical competition name');
  assert.equal(publicItem.locationLabel, 'خلف المسجد', 'teams should see the live location');
  assert.equal(publicItem.competition.name, 'اسم البرنامج الأول', 'linked competition should be returned');

  const beforeAi = await getFestivalContext();
  assert.ok(beforeAi.includes('اسم البرنامج الأول'), 'Ruby context should include the linked program item');

  const renamed = await request(base, `/admin/competitions/${competition.id}`, {
    method: 'PATCH', token, body: { name: 'اسم البرنامج بعد التعديل' },
  });
  assert.equal(renamed.status, 200);
  const storedAgenda = await prisma.agendaItem.findUnique({ where: { id: agenda.id } });
  assert.equal(storedAgenda.title, 'اسم البرنامج بعد التعديل', 'competition edit should synchronize back to the program');
  const afterAi = await getFestivalContext();
  assert.ok(afterAi.includes('اسم البرنامج بعد التعديل'), 'Ruby context cache should invalidate after an admin edit');

  console.log('program propagation test passed: program, competition, public agenda and Ruby stay synchronized');
} finally {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(() => resolve()));
  await prisma.agendaItem.deleteMany({ where: { id: agenda?.id } }).catch(() => { });
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => { });
  await prisma.zone.delete({ where: { id: `program-zone-${suffix}` } }).catch(() => { });
  await prisma.admin.delete({ where: { id: admin?.id } }).catch(() => { });
  await prisma.$disconnect();
}
