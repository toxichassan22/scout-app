process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Core123';
const deviceId = `core-device-${suffix}`;
let team;
let admin;
let competition;
let questions = [];

async function request(base, method, route, body, token, device = deviceId) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(device ? { 'x-device-id': device } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

try {
  [team, admin] = await Promise.all([
    prisma.team.create({ data: { username: `core-team-${suffix}`, label: 'Core Team', passwordHash: await bcrypt.hash(password, 4) } }),
    prisma.admin.create({ data: { username: `core-admin-${suffix}`, passwordHash: await bcrypt.hash(password, 4) } }),
  ]);
  competition = await prisma.competition.create({ data: { name: 'Core Test', slug: `core-test-${suffix}`, type: 'auto_digital', isOpen: false, requiresQr: true, qrCode: `qr-${suffix}`, questionCount: 2, duration: 600 } });
  questions = await Promise.all([
    prisma.question.create({ data: { competitionId: competition.id, text: 'One?', options: '["yes","no"]', correctOption: 0, points: 1, sortOrder: 1 } }),
    prisma.question.create({ data: { competitionId: competition.id, text: 'Two?', options: '["yes","no"]', correctOption: 1, points: 1, sortOrder: 2 } }),
  ]);

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const teamLogin = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId });
  const adminLogin = await request(base, 'POST', '/api/auth/admin/login', { username: admin.username, password }, undefined, null);
  assert.equal(teamLogin.response.status, 200);
  assert.equal(adminLogin.response.status, 200);
  const teamToken = teamLogin.data.token;
  const adminToken = adminLogin.data.token;

  let result = await request(base, 'POST', `/api/competitions/${competition.slug}/scan`, { qrCode: competition.qrCode }, teamToken);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.state, 'closed');

  result = await request(base, 'POST', '/api/quiz/start', { competitionId: competition.slug }, teamToken);
  assert.equal(result.response.status, 400);

  result = await request(base, 'PATCH', `/api/admin/competitions/${competition.id}`, { isOpen: true }, adminToken, null);
  assert.equal(result.response.status, 200);

  result = await request(base, 'POST', `/api/competitions/${competition.slug}/scan`, { qrCode: competition.qrCode }, teamToken);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.canStart, true);

  result = await request(base, 'POST', '/api/quiz/start', { competitionId: competition.slug }, teamToken);
  assert.equal(result.response.status, 200);
  const sessionId = result.data.sessionId;

  result = await request(base, 'GET', `/api/competitions/${competition.slug}/play`, undefined, teamToken);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.questions.length, 2);
  const firstQuestion = questions.find(question => question.id === result.data.questions[0].id);

  result = await request(base, 'POST', '/api/quiz/save-answer', { sessionId, questionId: firstQuestion.id, selectedIndex: firstQuestion.correctOption }, teamToken);
  assert.equal(result.response.status, 200);
  result = await request(base, 'POST', '/api/quiz/submit', { sessionId }, teamToken);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.scoreHidden, true);

  result = await request(base, 'GET', '/api/leaderboard', undefined, teamToken);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.data[0].teamName, null);

  result = await request(base, 'POST', '/api/admin/leaderboard/reveal', { visible: true }, adminToken, null);
  assert.equal(result.response.status, 200);
  result = await request(base, 'GET', '/api/leaderboard', undefined, teamToken);
  assert.equal(result.data.data[0].teamName, team.label);

  console.log('core competition test passed: QR gate, admin open, session, scoring, hidden/revealed leaderboard');
} finally {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(() => resolve()));
  await prisma.draftAnswer.deleteMany({ where: { questionId: { in: questions.map(question => question.id) } } }).catch(() => {});
  await prisma.quizSession.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.score.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.question.deleteMany({ where: { id: { in: questions.map(question => question.id) } } }).catch(() => {});
  await prisma.competitionAccess.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.admin.delete({ where: { id: admin?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
