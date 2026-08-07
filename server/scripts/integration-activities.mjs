process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Activity123';
const deviceId = `activity-device-${suffix}`;
let team;
let session;

async function request(base, method, route, body, token, device = deviceId) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(device ? { 'x-device-id': device } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

try {
  team = await prisma.team.create({ data: { username: `activity-team-${suffix}`, label: 'Activity Team', passwordHash: await bcrypt.hash(password, 4) } });
  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const login = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId });
  assert.equal(login.response.status, 200);
  const token = login.data.token;

  let result = await request(base, 'GET', '/api/activities', undefined, token);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.activities.length, 4);

  result = await request(base, 'POST', '/api/activities/color-hunter/sessions', {}, token);
  assert.equal(result.response.status, 201);
  session = result.data.session;
  result = await request(base, 'POST', `/api/activities/sessions/${session.id}/color-round`, { round: 1 }, token);
  assert.equal(result.response.status, 200);
  const target = result.data.target;
  result = await request(base, 'POST', `/api/activities/sessions/${session.id}/color-round`, { round: 1, r: target.r, g: target.g, b: target.b }, token);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.score, 100);
  result = await request(base, 'POST', `/api/activities/sessions/${session.id}/finish`, { score: 100 }, token);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.finished, true);

  result = await request(base, 'GET', '/api/activities/wallet', undefined, token);
  assert.equal(result.response.status, 200);
  assert(result.data.wallet.balance > 0);
  result = await request(base, 'GET', '/api/activities/shop', undefined, token);
  assert.equal(result.response.status, 200);
  const item = result.data.items[0];
  result = await request(base, 'POST', `/api/activities/shop/${item.id}/purchase`, { quantity: 1 }, token);
  assert.equal(result.response.status, 201);
  console.log('activities test passed: catalog, server color scoring, wallet reward, cosmetic purchase');
} finally {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(() => resolve()));
  await prisma.activityParticipant.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.activitySession.deleteMany({ where: { id: session?.id } }).catch(() => {});
  await prisma.purchase.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.walletTransaction.deleteMany({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.teamWallet.delete({ where: { teamId: team?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
