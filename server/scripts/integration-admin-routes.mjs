process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Integration123';

async function request(base, method, route, token) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const text = await response.text();
  return { response, text };
}

let address;
let admin;
let team;
let device;
try {
  [admin, team] = await Promise.all([
    prisma.admin.create({ data: { username: `admin-routes-${suffix}`, passwordHash: await bcrypt.hash(password, 4) } }),
    prisma.team.create({ data: { username: `admin-team-${suffix}`, label: 'Admin Route Team', passwordHash: await bcrypt.hash(password, 4), maxDevices: 2 } }),
  ]);
  device = await prisma.teamDevice.create({ data: { teamId: team.id, deviceId: `admin-device-${suffix}`, userAgent: 'test' } });

  await startServer(0);
  address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const loginResponse = await fetch(`${base}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: admin.username, password }),
  });
  const login = await loginResponse.json();
  const adminToken = login.token;
  let result;

  const routes = [
    '/api/admin/teams',
    `/api/admin/teams/${team.id}/members`,
    `/api/admin/teams/${team.id}/devices`,
    '/api/admin/judges',
    '/api/admin/competitions',
    '/api/admin/activities/easter-egg/stages',
    '/api/admin/report-permissions',
    '/api/admin/reports',
    '/api/admin/leaderboard',
    '/api/admin/scores/breakdown',
  ];

  for (const route of routes) {
    result = await request(base, 'GET', route, adminToken);
    assert.notEqual(result.response.status, 404, `${route} should exist`);
    assert(result.response.status >= 200 && result.response.status < 300, `${route} returned ${result.response.status}`);
  }

  result = await request(base, 'DELETE', `/api/admin/devices/${device.id}`, adminToken);
  assert.equal(result.response.status, 200);
  const revoked = await prisma.teamDevice.findUnique({ where: { id: device.id } });
  assert.ok(revoked?.revokedAt, 'device should be revoked');

  result = await request(base, 'GET', '/api/admin/teams');
  assert.equal(result.response.status, 401);

  console.log('admin routes integration test passed');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.teamDevice.deleteMany({ where: { teamId: team?.id } }).catch(() => { });
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => { });
  await prisma.admin.delete({ where: { id: admin?.id } }).catch(() => { });
  await prisma.$disconnect();
}
