import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';
import { SCOUT_ROLES } from '../src/validation.js';

await databaseReady;
await startServer(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const deviceId = `identity-device-${Date.now()}`;

const call = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': deviceId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

try {
  const username = `identity-team-${Date.now()}`;
  await prisma.team.create({ data: { username, label: 'فريق الهوية', passwordHash: await bcrypt.hash('identity-pass', 10) } });

  // A device seen for the first time reports no identity, which is what makes the
  // client show the blocking form.
  const login = await call('/auth/team/login', { method: 'POST', body: { username, password: 'identity-pass', deviceId } });
  assert.equal(login.status, 200, 'team login should succeed');
  assert.equal(login.body.user.deviceName, '', 'a new device starts with no name');
  assert.equal(login.body.user.deviceRole, '', 'a new device starts with no role');
  const token = login.body.token;

  // Only roles from the shared list are accepted.
  const badRole = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: 'محمد', role: 'رئيس الجمهورية' } });
  assert.equal(badRole.status, 400, 'an unknown role must be rejected');

  const shortName = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: 'م', role: SCOUT_ROLES[0] } });
  assert.equal(shortName.status, 400, 'a one-character name must be rejected');

  const memberBlocked = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: 'محمد عبد الله', role: 'جوال' } });
  assert.equal(memberBlocked.status, 403, 'a member role must wait until the leader uploads the logo');
  assert.equal(memberBlocked.body.requiresLeaderFirst, true, 'the API should identify the leader-first gate');

  const saved = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: '  محمد عبد الله  ', role: 'قائد/ة' } });
  assert.equal(saved.status, 200, 'a valid leader identity should save');
  assert.equal(saved.body.deviceName, 'محمد عبد الله', 'the name should be trimmed');
  assert.equal(saved.body.deviceRole, 'قائد/ة', 'the first identity before the logo must be the leader');

  const secondSave = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: 'اسم آخر', role: 'جوال' } });
  assert.equal(secondSave.status, 409, 'a team user must not be able to change a completed identity');
  assert.equal(secondSave.body.code, 'IDENTITY_LOCKED', 'the API should identify the immutable identity error');

  const logo = await call('/auth/team/logo', { method: 'PATCH', token, body: { logoUrl: 'data:image/png;base64,abc' } });
  assert.equal(logo.status, 200, 'the leader must be able to upload the team logo');

  // The token still carries the values from login, so /auth/me must read the row —
  // otherwise a page reload would prompt someone who has already answered.
  const me = await call('/auth/me', { token });
  assert.equal(me.body.user.deviceName, 'محمد عبد الله', 'auth/me must report the saved name, not the stale token claim');
  assert.equal(me.body.user.deviceRole, 'قائد/ة', 'auth/me must report the saved role');
  assert.ok(me.body.user.logoUrl, 'auth/me must report the uploaded logo');

  // Logging in again from the same device keeps the identity.
  const relogin = await call('/auth/team/login', { method: 'POST', body: { username, password: 'identity-pass', deviceId } });
  assert.equal(relogin.body.user.deviceName, 'محمد عبد الله', 'a known device keeps its person');
  assert.equal(relogin.body.user.deviceRole, 'قائد/ة', 'a known device keeps its role');

  // A different device on the same shared team account starts blank again, then
  // can register as a member after the logo exists.
  const otherDeviceId = `${deviceId}-second`;
  const second = await fetch(`${base}/auth/team/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': otherDeviceId },
    body: JSON.stringify({ username, password: 'identity-pass', deviceId: otherDeviceId }),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
  assert.equal(second.status, 200, 'a second device can log in after the leader uploaded the logo');
  assert.equal(second.body.user.deviceName, '', 'a second device on the same team is asked separately');

  const memberSaved = await fetch(`${base}/auth/device-identity`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': otherDeviceId,
      Authorization: `Bearer ${second.body.token}`,
    },
    body: JSON.stringify({ displayName: 'أحمد علي', role: 'جوال' }),
  }).then(async (res) => ({ status: res.status, body: await res.json() }));
  assert.equal(memberSaved.status, 200, 'a member identity should save after the logo exists');
  assert.equal(memberSaved.body.deviceRole, 'جوال', 'the second device can keep a non-leader role');

  // The admin device list needs the role to render it.
  const stored = await prisma.teamDevice.findMany({ where: { deviceId: { in: [deviceId, otherDeviceId] } }, select: { displayName: true, role: true } });
  assert.equal(stored.length, 2, 'both devices are recorded');
  assert.ok(stored.some(d => d.role === 'قائد/ة'), 'the leader role is persisted for the admin list');
  assert.ok(stored.some(d => d.role === 'جوال'), 'the member role is persisted for the admin list');

  console.log('device identity test passed: leader-first before logo, then members after');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.$disconnect().catch(() => { });
}
