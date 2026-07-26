process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;

const suffix = Date.now().toString();
const password = 'Strong!Team123';

async function request(base, method, route, body, token) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
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
let session;

try {
  team = await prisma.team.create({
    data: {
      username: `finalize-race-team-${suffix}`,
      label: 'Finalize Race Team',
      passwordHash: await bcrypt.hash(password, 4),
      maxDevices: 2,
      devices: { create: { deviceId: `finalize-device-${suffix}`, userAgent: 'race-test' } },
    },
  });

  competition = await prisma.competition.create({
    data: {
      name: `Finalize Race ${suffix}`,
      slug: `finalize-race-${suffix}`,
      type: 'auto_digital',
      isOpen: true,
      duration: 1,
    },
  });

  session = await prisma.quizSession.create({
    data: {
      teamId: team.id,
      competitionId: competition.id,
      deviceId: `finalize-device-${suffix}`,
      isCompleted: false,
      expiresAt: new Date(Date.now() - 1000),
    },
  });

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const login = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId: `finalize-device-${suffix}` });
  assert.equal(login.response.status, 200, `team login should succeed: ${JSON.stringify(login.data)}`);
  const teamToken = login.data.token;

  const attempts = await Promise.all([
    request(base, 'POST', '/api/quiz/submit', { sessionId: session.id }, teamToken),
    request(base, 'POST', '/api/quiz/submit', { sessionId: session.id }, teamToken),
  ]);

  const succeeded = attempts.filter(a => a.response.status === 200);
  assert.ok(succeeded.length >= 1, 'at least one finalize attempt should succeed');
  assert.equal(attempts.filter(a => a.response.status === 409).length + succeeded.length, 2, 'both attempts should be 200 or 409');

  const scoreCount = await prisma.score.count({
    where: { competitionId: competition.id, teamId: team.id },
  });
  assert.equal(scoreCount, 1, 'only one score should be created for concurrent expired session finalization');

  const completedSession = await prisma.quizSession.findUnique({ where: { id: session.id } });
  assert.equal(completedSession.isCompleted, true, 'session should be marked completed');

  console.log('finalize expired session race test passed: one finalized, duplicate handled, DB count correct');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.score.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.scoreAudit.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.judgeScore.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.teamStanding.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.quizSession.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.teamDevice.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
