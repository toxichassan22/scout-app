process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Device123';
let team;
let admin;

async function jsonRequest(base, route, { method = 'GET', token, deviceId, body } = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(deviceId ? { 'x-device-id': deviceId } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

try {
  [admin, team] = await Promise.all([
    prisma.admin.create({ data: { username: `device-admin-${suffix}`, passwordHash: await bcrypt.hash(password, 4) } }),
    prisma.team.create({ data: { username: `device-team-${suffix}`, label: 'Device Revocation Team', passwordHash: await bcrypt.hash(password, 4), maxDevices: 2 } }),
  ]);

  await startServer(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const deviceA = `device-a-${suffix}`;
  const deviceB = `device-b-${suffix}`;

  const loginTeam = deviceId => jsonRequest(base, '/auth/team/login', {
    method: 'POST', deviceId, body: { username: team.username, password, deviceId },
  });
  const loginAdmin = await jsonRequest(base, '/auth/admin/login', {
    method: 'POST', body: { username: admin.username, password },
  });
  assert.equal(loginAdmin.status, 200, 'admin login should succeed');
  const adminToken = loginAdmin.body.token;

  const [loginA, loginB] = await Promise.all([loginTeam(deviceA), loginTeam(deviceB)]);
  assert.equal(loginA.status, 200, 'device A login should succeed');
  assert.equal(loginB.status, 200, 'device B login should succeed');
  const tokenA = loginA.body.token;
  const tokenB = loginB.body.token;

  const before = await jsonRequest(base, `/admin/teams/${team.id}/devices`, { token: adminToken });
  assert.equal(before.body.data.length, 2, 'both active devices should be listed');

  const rowA = before.body.data.find(device => device.deviceId === deviceA);
  assert.ok(rowA, 'device A should have an admin row');
  const revoke = await jsonRequest(base, `/admin/devices/${rowA.id}`, { method: 'DELETE', token: adminToken });
  assert.equal(revoke.status, 200, 'admin revoke should succeed');

  const after = await jsonRequest(base, `/admin/teams/${team.id}/devices`, { token: adminToken });
  assert.equal(after.body.data.length, 1, 'revoked device must disappear from the active list');
  assert.equal(after.body.data[0].deviceId, deviceB, 'the other device must remain listed');

  const teams = await jsonRequest(base, '/admin/teams', { token: adminToken });
  const teamSummary = teams.body.data.find(item => item.id === team.id);
  assert.equal(teamSummary._count.devices, 1, 'revoked device must not consume the displayed quota');

  const revokedMe = await jsonRequest(base, '/auth/me', { token: tokenA, deviceId: deviceA });
  assert.equal(revokedMe.status, 401, 'the revoked token must stop working');
  const activeMe = await jsonRequest(base, '/auth/me', { token: tokenB, deviceId: deviceB });
  assert.equal(activeMe.status, 200, 'revoking one device must not revoke the other device');

  // The same browser can return without deleting the team. It is reactivated as a
  // fresh registration and must fill in the identity gate again.
  const returned = await loginTeam(deviceA);
  assert.equal(returned.status, 200, 'a revoked device should be able to re-register');
  assert.equal(returned.body.user.deviceName, '', 'a returning device starts with a fresh identity');
  assert.equal(returned.body.user.deviceRole, '', 'a returning device starts with no role');

  const final = await jsonRequest(base, `/admin/teams/${team.id}/devices`, { token: adminToken });
  assert.equal(final.body.data.length, 2, 'the returning device should consume one active slot again');

  console.log('device revocation test passed: quota excludes revoked devices, only target logs out, re-registration works');
} finally {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(() => resolve()));
  await prisma.teamDevice.deleteMany({ where: { teamId: team?.id } }).catch(() => { });
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => { });
  await prisma.admin.delete({ where: { id: admin?.id } }).catch(() => { });
  await prisma.$disconnect();
}
