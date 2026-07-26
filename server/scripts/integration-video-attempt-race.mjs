process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;

const suffix = Date.now().toString();
const password = 'Strong!Race123';
const deviceId = `race-device-${suffix}`;

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

try {
  team = await prisma.team.create({
    data: {
      username: `race-team-${suffix}`,
      label: 'Race Team',
      passwordHash: await bcrypt.hash(password, 4),
      maxDevices: 3,
      devices: { create: { deviceId, userAgent: 'race-test' } },
    },
  });

  competition = await prisma.competition.create({
    data: {
      name: 'Race Video',
      slug: `video`,
      type: 'manual_judged',
      isOpen: true,
    },
  });

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const login = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId });
  assert.equal(login.response.status, 200, `team login should succeed: ${JSON.stringify(login.data)}`);
  const teamToken = login.data.token;

  const attempts = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      request(base, 'POST', `/api/competitions/${competition.id}/video-attempt`, {
        prompt: `Prompt ${i}`,
        videoUrl: 'https://youtube.com/watch?v=safe',
      }, teamToken)
    )
  );

  const accepted = attempts.filter(a => a.response.status === 200);
  const rejected = attempts.filter(a => a.response.status === 400);

  assert.equal(accepted.length, 3, `expected 3 accepted attempts, got ${accepted.length}`);
  assert.equal(rejected.length, 2, `expected 2 rejected attempts, got ${rejected.length}`);

  const dbCount = await prisma.videoAttempt.count({
    where: { competitionId: competition.id, teamId: team.id },
  });
  assert.equal(dbCount, 3, `expected 3 video attempts in DB, got ${dbCount}`);

  // Ensure attempt numbers are unique and sequential 1..3
  const stored = await prisma.videoAttempt.findMany({
    where: { competitionId: competition.id, teamId: team.id },
    orderBy: { attemptNumber: 'asc' },
  });
  const numbers = stored.map(a => a.attemptNumber);
  assert.deepEqual(numbers, [1, 2, 3], `attempt numbers should be 1,2,3 in order`);

  console.log('video attempt race test passed: 3 accepted, 2 rejected, no duplicates');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.videoAttempt.deleteMany({ where: { competitionId: competition?.id, teamId: team?.id } }).catch(() => {});
  await prisma.score.deleteMany({ where: { competitionId: competition?.id, teamId: team?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.teamDevice.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
