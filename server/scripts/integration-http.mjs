import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { once } from 'node:events';
import prisma, { databaseReady } from '../src/db.js';
import { app, server, startServer } from '../src/index.js';

await databaseReady;
const suffix = Date.now().toString();
const password = 'Strong!Integration123';
const deviceId = `http-device-${suffix}-abcdefghijkl`;
const otherDeviceId = `http-device-other-${suffix}-abcdef`;
const json = (value) => JSON.stringify(value);
async function request(base, method, route, body, token, device = deviceId) {
    const response = await fetch(`${base}${route}`, {
        method,
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...(device ? { 'x-device-id': device } : {}),
        },
        body: body === undefined ? undefined : json(body),
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    return { response, data };
}

let address;
let team;
let admin;
let judge;
let competition;
let otherCompetition;
let report;
try {
    [team, admin, judge, competition, otherCompetition] = await Promise.all([
        prisma.team.create({ data: { username: `http-team-${suffix}`, label: 'HTTP Team', passwordHash: await bcrypt.hash(password, 4), maxDevices: 2 } }),
        prisma.admin.create({ data: { username: `http-admin-${suffix}`, passwordHash: await bcrypt.hash(password, 4) } }),
        prisma.judge.create({ data: { username: `http-judge-${suffix}`, name: 'HTTP Judge', passwordHash: await bcrypt.hash(password, 4) } }),
        prisma.competition.create({ data: { name: 'HTTP Quiz', slug: `http-quiz-${suffix}`, type: 'auto_digital', isOpen: true, entryCode: 'ENTRY-123', duration: 600 } }),
        prisma.competition.create({ data: { name: 'Other Quiz', slug: `http-other-${suffix}`, type: 'auto_digital', isOpen: true, entryCode: null, duration: 600 } }),
    ]);
    const question = await prisma.question.create({ data: { competitionId: competition.id, text: 'One?', options: '["yes","no"]', correctOption: 0, points: 10 } });
    await prisma.judgeCompetition.create({ data: { judgeId: judge.id, competitionId: competition.id } });
    await startServer(0);
    address = server.address();
    const base = `http://127.0.0.1:${address.port}`;

    let result = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId });
    assert.equal(result.response.status, 200);
    const teamToken = result.data.token;
    result = await request(base, 'POST', '/api/auth/admin/login', { username: admin.username, password }, undefined, null);
    assert.equal(result.response.status, 200);
    const adminToken = result.data.token;
    result = await request(base, 'POST', '/api/auth/judge/login', { username: judge.username, password }, undefined, null);
    assert.equal(result.response.status, 200);
    const judgeToken = result.data.token;

    result = await request(base, 'GET', '/api/admin/teams', undefined, adminToken, null);
    assert.equal(result.response.status, 200);
    assert.equal('passwordHash' in result.data.find((row) => row.id === team.id), false);

    result = await request(base, 'GET', '/api/auth/me', undefined, teamToken);
    assert.equal(result.response.status, 200);
    await prisma.teamDevice.update({ where: { teamId_deviceId: { teamId: team.id, deviceId } }, data: { revokedAt: new Date(), tokenVersion: { increment: 1 } } });
    result = await request(base, 'GET', '/api/auth/me', undefined, teamToken);
    assert.equal(result.response.status, 401);

    await prisma.systemSetting.upsert({ where: { key: 'EMERGENCY_FREEZE' }, create: { key: 'EMERGENCY_FREEZE', value: 'true' }, update: { value: 'true' } });
    result = await request(base, 'GET', '/api/competitions', undefined, teamToken);
    assert.equal(result.response.status, 401); // revoked auth remains enforced while frozen
    const freshLogin = await request(base, 'POST', '/api/auth/team/login', { username: team.username, password, deviceId: otherDeviceId }, undefined, otherDeviceId);
    assert.equal(freshLogin.response.status, 200);
    const freshToken = freshLogin.data.token;
    result = await request(base, 'GET', '/api/competitions', undefined, freshToken, otherDeviceId);
    assert.equal(result.response.status, 200);
    result = await request(base, 'POST', '/api/reports', { title: 'blocked', content: 'blocked', competitionId: competition.id }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 423);
    await prisma.systemSetting.update({ where: { key: 'EMERGENCY_FREEZE' }, data: { value: 'false' } });

    result = await request(base, 'POST', `/api/competitions/${competition.id}/enter`, { entryCode: 'wrong' }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 403);
    result = await request(base, 'POST', `/api/competitions/${competition.id}/enter`, { entryCode: 'ENTRY-123' }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 200);
    const sessionId = result.data.sessionId;
    result = await request(base, 'POST', '/api/quiz/save-answer', { sessionId, questionId: question.id, selectedIndex: 0 }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 200);
    const otherQuestion = await prisma.question.create({ data: { competitionId: otherCompetition.id, text: 'Other?', options: '["a"]', correctOption: 0, points: 10 } });
    result = await request(base, 'POST', '/api/quiz/save-answer', { sessionId, questionId: otherQuestion.id, selectedIndex: 0 }, freshToken, otherDeviceId);
    assert.notEqual(result.response.status, 200);

    result = await request(base, 'POST', '/api/reports', { title: 'private', content: 'secret', competitionId: competition.id, fileUrl: '/uploads/evil.txt' }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 400);
    result = await request(base, 'POST', '/api/reports', { title: 'private', content: 'secret', competitionId: competition.id }, freshToken, otherDeviceId);
    assert.equal(result.response.status, 201);
    report = result.data.report;
    result = await request(base, 'GET', `/api/reports/${report.id}/download`);
    assert.equal(result.response.status, 401);

    const scoreCompetition = await prisma.competition.create({ data: { name: 'HTTP Manual', slug: `http-manual-${suffix}`, type: 'manual_judged', isOpen: true, criteria: '[{"key":"quality","maxScore":10}]' } });
    await prisma.judgeCompetition.create({ data: { judgeId: judge.id, competitionId: scoreCompetition.id } });
    const scoreRequests = Array.from({ length: 4 }, () => request(base, 'POST', '/api/judge/scores', { competitionId: scoreCompetition.id, teamId: team.id, values: { quality: 8 }, total: 8 }, judgeToken, null));
    const scoreResults = await Promise.all(scoreRequests);
    assert.equal((await prisma.score.count({ where: { competitionId: scoreCompetition.id, teamId: team.id } })), 1);
    assert(scoreResults.some(({ response }) => response.status === 200 || response.status === 409));
    console.log('HTTP integration security and integrity checks passed');
} finally {
    await new Promise((resolve) => server.close(() => resolve()));
    await prisma.report.deleteMany({ where: { teamId: team?.id } }).catch(() => { });
    await prisma.team.delete({ where: { id: team?.id } }).catch(() => { });
    await prisma.judge.delete({ where: { id: judge?.id } }).catch(() => { });
    await prisma.admin.delete({ where: { id: admin?.id } }).catch(() => { });
    await prisma.competition.deleteMany({ where: { id: { in: [competition?.id, otherCompetition?.id].filter(Boolean) } } }).catch(() => { });
    await prisma.$disconnect();
}
