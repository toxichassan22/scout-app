process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;

const suffix = Date.now().toString();
const password = 'Strong!Judge123';
const idempotencyKey = `race-idempotency-${suffix}`;
const judgeDeviceId = `race-judge-device-${suffix}`;

async function request(base, method, route, body, token, extraHeaders = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

let judge;
let competition;
let team;

try {
  judge = await prisma.judge.create({
    data: {
      username: `idempotency-judge-${suffix}`,
      name: 'Race Judge',
      passwordHash: await bcrypt.hash(password, 4),
      authVersion: 0,
    },
  });

  team = await prisma.team.create({
    data: {
      username: `idempotency-team-${suffix}`,
      label: 'Race Team',
      passwordHash: await bcrypt.hash('Strong!Team123', 4),
      maxDevices: 2,
    },
  });

  competition = await prisma.competition.create({
    data: {
      name: `Race Comp ${suffix}`,
      slug: `idempotency-race-${suffix}`,
      type: 'manual_judged',
      isOpen: true,
      criteria: JSON.stringify([{ key: 'creativity', maxScore: 10 }]),
      judgeAssignments: { create: { judgeId: judge.id } },
    },
  });

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const login = await request(base, 'POST', '/api/auth/judge/login', { username: judge.username, password, deviceId: judgeDeviceId });
  assert.equal(login.response.status, 200, `judge login should succeed: ${JSON.stringify(login.data)}`);
  const judgeToken = login.data.token;
  const claim = await request(base, 'POST', `/api/judge/teams/${competition.id}/${team.id}/claim`, undefined, judgeToken);
  assert.equal(claim.response.status, 200, `judge claim should succeed: ${JSON.stringify(claim.data)}`);

  const scoreBody = {
    competitionId: competition.id,
    teamId: team.id,
    values: { creativity: 5 },
    total: 5,
  };

  const attempts = await Promise.all([
    request(base, 'POST', '/api/judge/scores', scoreBody, judgeToken, { 'Idempotency-Key': idempotencyKey }),
    request(base, 'POST', '/api/judge/scores', scoreBody, judgeToken, { 'Idempotency-Key': idempotencyKey }),
  ]);

  const succeeded = attempts.filter(a => a.response.status === 200);
  const conflicts = attempts.filter(a => a.response.status === 409);

  assert.ok(succeeded.length >= 1, 'at least one idempotency attempt should succeed');
  assert.equal(succeeded.length + conflicts.length, 2, 'both attempts should be either 200 or 409');

  const scoreCount = await prisma.score.count({
    where: { competitionId: competition.id, teamId: team.id },
  });
  assert.equal(scoreCount, 1, 'only one score should be created for duplicate idempotency key');

  const keyRows = await prisma.idempotencyKey.count({
    where: { scope: 'judge:score', actorId: judge.id, key: idempotencyKey },
  });
  assert.equal(keyRows, 1, 'only one idempotency key row should exist');

  console.log('idempotency race test passed: one processed, duplicate blocked, DB count correct');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.idempotencyKey.deleteMany({
    where: { scope: 'judge:score', actorId: judge?.id, key: idempotencyKey },
  }).catch(() => {});
  await prisma.scoreAudit.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.judgeScore.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.score.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.competitionAccess.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.teamStanding.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.judge.delete({ where: { id: judge?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
