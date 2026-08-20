process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';
import { OFFICIAL_REPORT_IDS } from '../src/reportCatalog.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Integration123';

async function request(base, method, route, token, body) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
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

  result = await request(base, 'GET', '/api/admin/competitions?limit=100', adminToken);
  const reportCompetitions = JSON.parse(result.text).data.filter(competition => OFFICIAL_REPORT_IDS.includes(competition.id));
  assert(reportCompetitions.length >= 2, 'report competitions should be available');
  const selectedCompetitionIds = reportCompetitions.slice(0, 2).map(competition => competition.id);
  result = await request(base, 'PATCH', `/api/admin/report-permissions/${team.id}/bulk`, adminToken, { competitionIds: selectedCompetitionIds, canSubmit: true });
  assert.equal(result.response.status, 200);
  const grantedPermissions = await prisma.reportPermission.findMany({ where: { teamId: team.id, competitionId: { in: selectedCompetitionIds } } });
  assert.equal(grantedPermissions.length, selectedCompetitionIds.length);
  assert(grantedPermissions.every(permission => permission.canSubmit));

  result = await request(base, 'PATCH', '/api/admin/report-permissions/revoke-all', adminToken, {});
  assert.equal(result.response.status, 200);
  const revokedPermissions = await prisma.reportPermission.findMany({ where: { teamId: team.id } });
  assert.equal(revokedPermissions.length, reportCompetitions.length);
  assert(revokedPermissions.every(permission => permission.canSubmit === false));

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

  result = await request(base, 'GET', '/api/admin/activities/easter-egg/stages', adminToken);
  assert.equal(result.response.status, 200);
  const originalStages = JSON.parse(result.text).stages;
  const customStages = [
    { id: 'integration-stage-1', title: 'اختبار السواعد', taskType: 'مهمة ميدانية', task: 'نفذوا المهمة أمام السواعد.', requiresSawaed: true, clue: '' },
    { id: 'integration-stage-2', title: 'اختبار clue', taskType: 'بحث', task: 'ابحثوا عن الكود التالي.', requiresSawaed: false, clue: 'بجوار لوحة الاختبار.' },
    { id: 'integration-stage-3', title: 'النهاية', taskType: 'خاتمة', task: 'أكملوا الخاتمة.', requiresSawaed: true, clue: '' },
  ];
  result = await request(base, 'PUT', '/api/admin/activities/easter-egg/stages', adminToken, { stages: customStages });
  assert.equal(result.response.status, 200);
  const updatedStages = JSON.parse(result.text).stages;
  assert.equal(updatedStages.length, customStages.length);
  assert(updatedStages.every(stage => stage.qrValue));
  assert.equal(updatedStages[1].clue, customStages[1].clue);
  result = await request(base, 'PUT', '/api/admin/activities/easter-egg/stages', adminToken, { stages: originalStages.map(stage => ({ id: stage.id, title: stage.title, taskType: stage.taskType, task: stage.task, requiresSawaed: stage.requiresSawaed, clue: stage.clue })) });
  assert.equal(result.response.status, 200);
  result = await request(base, 'GET', '/api/admin/activities/easter-egg/stages');
  assert.equal(result.response.status, 401);

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
