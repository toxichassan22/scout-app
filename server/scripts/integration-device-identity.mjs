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

  const saved = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: '  محمد عبد الله  ', role: 'جوال' } });
  assert.equal(saved.status, 200, 'a valid identity should save');
  assert.equal(saved.body.deviceName, 'محمد عبد الله', 'the name should be trimmed');
  assert.equal(saved.body.deviceRole, 'جوال', 'the role should be stored');

  const secondSave = await call('/auth/device-identity', { method: 'PATCH', token, body: { displayName: 'اسم آخر', role: 'قائد/ة' } });
  assert.equal(secondSave.status, 409, 'a team user must not be able to change a completed identity');
  assert.equal(secondSave.body.code, 'IDENTITY_LOCKED', 'the API should identify the immutable identity error');

  // The token still carries the values from login, so /auth/me must read the row —
  // otherwise a page reload would prompt someone who has already answered.
  const me = await call('/auth/me', { token });
  assert.equal(me.body.user.deviceName, 'محمد عبد الله', 'auth/me must report the saved name, not the stale token claim');
  assert.equal(me.body.user.deviceRole, 'جوال', 'auth/me must report the saved role');

  // Logging in again from the same device keeps the identity.
  const relogin = await call('/auth/team/login', { method: 'POST', body: { username, password: 'identity-pass', deviceId } });
  assert.equal(relogin.body.user.deviceName, 'محمد عبد الله', 'a known device keeps its person');
  assert.equal(relogin.body.user.deviceRole, 'جوال', 'a known device keeps its role');

  // A different device on the same shared team account starts blank again.
  const otherDeviceId = `${deviceId}-second`;
  const second = await fetch(`${base}/auth/team/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': otherDeviceId },
    body: JSON.stringify({ username, password: 'identity-pass', deviceId: otherDeviceId }),
  }).then(r => r.json());
  assert.equal(second.user.deviceName, '', 'a second device on the same team is asked separately');

  // The admin device list needs the role to render it.
  const stored = await prisma.teamDevice.findMany({ where: { deviceId: { in: [deviceId, otherDeviceId] } }, select: { displayName: true, role: true } });
  assert.equal(stored.length, 2, 'both devices are recorded');
  assert.ok(stored.some(d => d.role === 'جوال'), 'the role is persisted for the admin list');

  console.log('device identity test passed: blank on first use, validated, persisted, and per-device');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.$disconnect().catch(() => { });
}
