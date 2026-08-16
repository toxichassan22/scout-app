process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;

const suffix = Date.now().toString();
const password = 'Strong!Smoke123';
const deviceId = `smoke-device-${suffix}-abcdefghij`;

async function request(base, method, route, body, token) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-device-id': deviceId,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

let team;
let competition;
let question;

try {
  team = await prisma.team.create({
    data: { username: `smoke-team-${suffix}`, label: 'Smoke Team', passwordHash: await bcrypt.hash(password, 4), maxDevices: 2 },
  });

  competition = await prisma.competition.create({
    data: { name: 'Smoke Quiz', slug: `smoke-quiz-${suffix}`, type: 'auto_digital', isOpen: true, entryCode: 'SMOKE-123', duration: 600 },
  });

  question = await prisma.question.create({
    data: { competitionId: competition.id, text: 'Smoke question?', options: '["yes","no"]', correctOption: 0, points: 10 },
  });

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const login = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId });
  assert.equal(login.response.status, 200, `team login should succeed: ${JSON.stringify(login.data)}`);
  assert.ok(login.data.token, 'login response should contain a token');

  const teamToken = login.data.token;

  const start = await request(base, 'POST', '/api/quiz/start', { competitionId: competition.id, entryCode: 'SMOKE-123' }, teamToken);
  assert.equal(start.response.status, 200, `quiz start should succeed: ${JSON.stringify(start.data)}`);
  assert.ok(start.data.sessionId, 'quiz start response should contain a sessionId');

  const emptyBody = await request(base, 'POST', '/api/auth/team/login', {});
  assert.equal(emptyBody.response.status, 400, 'empty body should return 400');
  assert.ok(Array.isArray(emptyBody.data.details) && emptyBody.data.details.length > 0, 'validation details should be present');

  console.log('Smoke tests passed: team login, quiz start, and empty body validation');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.draftAnswer.deleteMany({ where: { questionId: question?.id } }).catch(() => {});
  await prisma.quizSession.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.question.deleteMany({ where: { id: question?.id } }).catch(() => {});
  await prisma.competitionAccess.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.score.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.$disconnect();
}
