process.env.SCOUT_NO_AUTOSTART = '1';

import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { EASTER_EGG_STAGES, getEasterEggQrPayload, HACKER_STAGES } from '../src/activityService.js';
import { server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Activity123';
const teams = [];
const sessions = [];

async function request(base, method, route, body, token, device) {
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

async function createTeam(index) {
  const device = `activity-device-${suffix}-${index}`;
  const team = await prisma.team.create({ data: { username: `activity-team-${suffix}-${index}`, label: `Activity Team ${index}`, passwordHash: await bcrypt.hash(password, 4) } });
  teams.push(team);
  const login = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId: device }, undefined, device);
  assert.equal(login.response.status, 200);
  return { team, token: login.data.token, device };
}

let base;
try {
  await startServer(0);
  const address = server.address();
  base = `http://127.0.0.1:${address.port}`;
  const player = await createTeam('main');

  let result = await request(base, 'GET', '/api/activities', undefined, player.token, player.device);
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.data.activities.map(item => item.slug), ['color-hunter', 'guess-number', 'easter-egg', 'hacker-sandbox']);

  result = await request(base, 'POST', '/api/activities/color-hunter/sessions', {}, player.token, player.device);
  assert.equal(result.response.status, 201);
  const colorSession = result.data.session;
  sessions.push(colorSession.id);
  result = await request(base, 'POST', `/api/activities/sessions/${colorSession.id}/color-round`, { round: 1 }, player.token, player.device);
  assert.equal(result.response.status, 200);
  const target = result.data.target;
  result = await request(base, 'POST', `/api/activities/sessions/${colorSession.id}/color-round`, { round: 1, r: target.r, g: target.g, b: target.b }, player.token, player.device);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.score, 100);
  result = await request(base, 'POST', `/api/activities/sessions/${colorSession.id}/finish`, { score: 100 }, player.token, player.device);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.finished, true);
  assert.equal(await prisma.teamWallet.count({ where: { teamId: player.team.id } }), 0);
  result = await request(base, 'GET', '/api/activities/color-hunter/leaderboard', undefined, player.token, player.device);
  assert.equal(result.response.status, 404);
  result = await request(base, 'GET', '/api/activities/shop', undefined, player.token, player.device);
  assert.equal(result.response.status, 404);

  const hacker = await createTeam('hacker');
  result = await request(base, 'POST', '/api/activities/hacker-sandbox/sessions', {}, hacker.token, hacker.device);
  assert.equal(result.response.status, 201);
  const hackerSession = result.data.session;
  sessions.push(hackerSession.id);
  assert.equal(hackerSession.challenge.index, 0);
  for (let index = 0; index < HACKER_STAGES.length; index += 1) {
    result = await request(base, 'POST', `/api/activities/sessions/${hackerSession.id}/hacker-answer`, { challenge: index, selectedIndex: HACKER_STAGES[index].answer }, hacker.token, hacker.device);
    assert.equal(result.response.status, 200, `hacker stage ${index}`);
    assert.equal(result.data.correct, true);
  }
  assert.equal(result.data.completed, true);
  assert.equal(result.data.session.status, 'finished');

  const guessPlayers = [await createTeam('guess-a'), await createTeam('guess-b'), await createTeam('guess-c')];
  let guessSession;
  for (const [index, guessPlayer] of guessPlayers.entries()) {
    result = await request(base, 'POST', '/api/activities/guess-number/sessions', { mode: 'auto' }, guessPlayer.token, guessPlayer.device);
    assert.equal(result.response.status, 201);
    guessSession = result.data.session;
    if (index === 0) sessions.push(guessSession.id);
    guessPlayer.id = guessSession.participants.find(item => item.teamId === guessPlayer.team.id).id;
    guessPlayer.secret = String(10000 + index).padStart(5, '0');
  }
  for (const guessPlayer of guessPlayers) {
    result = await request(base, 'POST', `/api/activities/sessions/${guessSession.id}/secret`, { secretCode: guessPlayer.secret }, guessPlayer.token, guessPlayer.device);
    assert.equal(result.response.status, 200);
  }
  result = await request(base, 'POST', `/api/activities/sessions/${guessSession.id}/start`, {}, guessPlayers[0].token, guessPlayers[0].device);
  assert.equal(result.response.status, 200);
  let activeSession = result.data.session;
  let turns = 0;
  while (activeSession.status === 'active' && turns < 5) {
    const current = guessPlayers.find(guessPlayer => guessPlayer.id === activeSession.currentPlayerId);
    const targetPlayer = guessPlayers.find(guessPlayer => guessPlayer.id === activeSession.targetPlayerId);
    assert(current && targetPlayer);
    result = await request(base, 'POST', `/api/activities/sessions/${guessSession.id}/guess`, { guessCode: targetPlayer.secret }, current.token, current.device);
    assert.equal(result.response.status, 200);
    turns += 1;
    if (result.data.finished) break;
    result = await request(base, 'GET', `/api/activities/sessions/${guessSession.id}`, undefined, current.token, current.device);
    assert.equal(result.response.status, 200);
    activeSession = result.data.session;
  }
  assert.equal(turns, 2);

  const easter = await createTeam('easter');
  result = await request(base, 'POST', '/api/activities/easter-egg/sessions', {}, easter.token, easter.device);
  assert.equal(result.response.status, 201);
  const easterSession = result.data.session;
  sessions.push(easterSession.id);
  assert.equal(easterSession.easterProgress.current, 0);
  result = await request(base, 'POST', `/api/activities/sessions/${easterSession.id}/easter-scan`, { qrValue: getEasterEggQrPayload(1) }, easter.token, easter.device);
  assert.equal(result.response.status, 409);
  for (let index = 0; index < EASTER_EGG_STAGES.length; index += 1) {
    result = await request(base, 'POST', `/api/activities/sessions/${easterSession.id}/easter-scan`, { qrValue: getEasterEggQrPayload(index) }, easter.token, easter.device);
    assert.equal(result.response.status, 200, `easter stage ${index}`);
    assert.equal(result.data.progress.current, index + 1);
    if (index < EASTER_EGG_STAGES.length - 1) {
      result = await request(base, 'POST', `/api/activities/sessions/${easterSession.id}/easter-scan`, { qrValue: getEasterEggQrPayload(index) }, easter.token, easter.device);
      assert.equal(result.response.status, 409);
      const sessionState = await request(base, 'GET', `/api/activities/sessions/${easterSession.id}`, undefined, easter.token, easter.device);
      assert.equal(sessionState.response.status, 200);
    }
  }
  result = await request(base, 'POST', `/api/activities/sessions/${easterSession.id}/easter-finish`, {}, easter.token, easter.device);
  assert.equal(result.response.status, 200);
  assert.equal(result.data.completed, true);
  assert.equal(result.data.session.status, 'finished');
  assert.equal(await prisma.teamWallet.count({ where: { teamId: easter.team.id } }), 0);

  console.log('activities test passed: color fun-only, hacker story flow, guess multiplayer, ordered QR hunt, marketplace removed');
} finally {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(() => resolve()));
  for (const sessionId of sessions) await prisma.activitySession.delete({ where: { id: sessionId } }).catch(() => {});
  for (const team of teams) {
    await prisma.purchase.deleteMany({ where: { teamId: team.id } }).catch(() => {});
    await prisma.walletTransaction.deleteMany({ where: { teamId: team.id } }).catch(() => {});
    await prisma.teamWallet.delete({ where: { teamId: team.id } }).catch(() => {});
    await prisma.team.delete({ where: { id: team.id } }).catch(() => {});
  }
  await prisma.$disconnect();
}
