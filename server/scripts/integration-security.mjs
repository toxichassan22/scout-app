import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma, { databaseReady } from '../src/db.js';
import { createMemoryRateLimiter, JWT_SECRET } from '../src/security.js';
import { verifyAuthenticatedUser } from '../src/middleware/auth.js';
import { canJoinRoom } from '../src/middleware/socketAuth.js';
import { MAX_UPLOAD_BYTES, validateBase64Upload } from '../src/uploadSecurity.js';
import { isAllowedVideoUrl } from '../src/routes/competitions.js';
import { normalizeArabicText } from '../src/textNormalization.js';
import { emitLeaderboardUpdate, joinPublicRealtimeRooms, LEADERBOARD_ROOM } from '../src/realtime.js';

await databaseReady;

function mockResponse() {
    return {
        statusCode: 200,
        headers: {},
        body: null,
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
    };
}

const token = jwt.sign({ id: 'team-1', role: 'team' }, JWT_SECRET, { algorithm: 'HS256' });
assert.equal(jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }).role, 'team');
assert.throws(() => jwt.verify(token, 'wrong-secret', { algorithms: ['HS256'] }));

const suffix = Date.now();
const deviceId = `security-device-${suffix}`;
const team = await prisma.team.create({
    data: {
        username: `security-team-${suffix}`,
        label: 'Security Team',
        passwordHash: await bcrypt.hash('Strong!Security123', 4),
        devices: { create: { deviceId, userAgent: 'integration-test' } }
    },
    select: { id: true, authVersion: true, devices: { select: { id: true, tokenVersion: true } } }
});
const device = team.devices[0];
const boundToken = jwt.sign({ id: team.id, role: 'team', authVersion: team.authVersion, deviceId, deviceVersion: device.tokenVersion }, JWT_SECRET, { algorithm: 'HS256' });
assert.equal((await verifyAuthenticatedUser(boundToken)).id, team.id);
await prisma.teamDevice.update({ where: { id: device.id }, data: { revokedAt: new Date(), tokenVersion: { increment: 1 } } });
await assert.rejects(() => verifyAuthenticatedUser(boundToken));

const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from('safe')]);
const valid = validateBase64Upload(`data:image/png;base64,${png.toString('base64')}`, 'image.png');
assert.equal(valid.mime, 'image/png');
assert.throws(() => validateBase64Upload('%%%not-base64%%%', 'image.png', 'image/png'));
assert.throws(() => validateBase64Upload(`data:image/png;base64,${png.toString('base64')}`, '../image.jpg'));
assert.throws(() => validateBase64Upload(`data:image/jpeg;base64,${png.toString('base64')}`, 'image.jpg'));
assert(MAX_UPLOAD_BYTES > 0);

assert.equal(await canJoinRoom({ user: { role: 'admin', id: 'a' } }, 'admin'), true);
assert.equal(await canJoinRoom({ user: { role: 'team', id: 't1' } }, 'team:t1'), true);
assert.equal(await canJoinRoom({ user: { role: 'team', id: 't1' } }, 'team:t2'), false);
assert.equal(await canJoinRoom({ user: { role: 'guest', id: null } }, LEADERBOARD_ROOM), true);
assert.equal(await canJoinRoom({ user: { role: 'admin', id: 'a' } }, LEADERBOARD_ROOM), false);
assert.equal(await canJoinRoom({ user: { role: 'guest', id: null } }, 'admin'), false);

assert.equal(normalizeArabicText('  مِصْر ١٢۳  '), 'مصر 123');
assert.equal(normalizeArabicText('إجابة'), normalizeArabicText('اجابه'));
assert.equal(isAllowedVideoUrl('https://youtube.com/watch?v=safe'), true);
assert.equal(isAllowedVideoUrl('https://media.youtube.com.example.test/video'), false);
assert.equal(isAllowedVideoUrl('javascript:alert(1)'), false);

const joinedRooms = [];
joinPublicRealtimeRooms({ user: { role: 'team' }, join: room => joinedRooms.push(room) });
assert.deepEqual(joinedRooms, [LEADERBOARD_ROOM]);
joinPublicRealtimeRooms({ user: { role: 'admin' }, join: room => joinedRooms.push(room) });
assert.deepEqual(joinedRooms, [LEADERBOARD_ROOM]);
const broadcasts = [];
await emitLeaderboardUpdate({ to: room => ({ emit: (event, payload) => broadcasts.push({ room, event, payload }) }) }, async () => [{ rank: 1 }]);
assert.deepEqual(broadcasts, [{ room: LEADERBOARD_ROOM, event: 'leaderboard:update', payload: [{ rank: 1 }] }]);

const limiter = createMemoryRateLimiter({ windowMs: 1000, max: 3, keyGenerator: () => 'concurrent' });
const statuses = Array.from({ length: 8 }, () => {
    const response = mockResponse();
    let passed = false;
    limiter({ ip: '127.0.0.1' }, response, () => { passed = true; });
    return passed ? 200 : response.statusCode;
});
assert.equal(statuses.filter(code => code === 200).length, 3);
assert.equal(statuses.filter(code => code === 429).length, 5);

await prisma.team.delete({ where: { id: team.id } });
console.log('backend security failure/concurrency checks passed');
await prisma.$disconnect();
