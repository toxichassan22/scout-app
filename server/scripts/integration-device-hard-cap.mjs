process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;

const suffix = Date.now().toString();
const password = 'Strong!Device123';

async function request(base, method, route, body) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(body?.deviceId ? { 'x-device-id': body.deviceId } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

let team;

try {
  team = await prisma.team.create({
    data: {
      username: `device-cap-team-${suffix}`,
      label: 'Device Cap Team',
      passwordHash: await bcrypt.hash(password, 4),
      maxDevices: 2,
    },
  });

  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const attempts = await Promise.all(
    Array.from({ length: 3 }, (_, i) =>
      request(base, 'POST', '/api/auth/team/login', {
        username: team.username,
        password,
        deviceId: `cap-device-${suffix}-${i}`,
      })
    )
  );

  const accepted = attempts.filter(a => a.response.status === 200);
  const rejected = attempts.filter(a => a.response.status === 403 && a.data?.maxDevicesReached);

  assert.equal(accepted.length, 2, `expected 2 accepted device logins, got ${accepted.length}`);
  assert.equal(rejected.length, 1, `expected 1 rejected device login, got ${rejected.length}`);

  const dbCount = await prisma.teamDevice.count({ where: { teamId: team.id, revokedAt: null } });
  assert.equal(dbCount, 2, `expected 2 active devices in DB, got ${dbCount}`);

  console.log('device hard-cap race test passed: 2 accepted, 1 rejected, DB count correct');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.teamDevice.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
