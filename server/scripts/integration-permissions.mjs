import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';

await databaseReady;

const suffix = Date.now();
let ids = {};
try {
    const [team, judge, competition] = await Promise.all([
        prisma.team.create({ data: { username: `it-team-${suffix}`, label: 'Integration Team', passwordHash: await bcrypt.hash('test1234', 4), maxDevices: 2 } }),
        prisma.judge.create({ data: { username: `it-judge-${suffix}`, name: 'Integration Judge', passwordHash: await bcrypt.hash('test1234', 4) } }),
        prisma.competition.create({ data: { name: 'Integration Competition', slug: `it-${suffix}`, type: 'manual_judged', isOpen: true, criteria: JSON.stringify([{ key: 'quality', label: 'Quality', maxScore: 10 }]) } })
    ]);
    ids = { teamId: team.id, judgeId: judge.id, competitionId: competition.id };
    assert.equal(team.maxDevices, 2);
    await prisma.judgeCompetition.create({ data: { judgeId: judge.id, competitionId: competition.id } });
    const permission = await prisma.reportPermission.create({ data: { teamId: team.id, competitionId: competition.id, canSubmit: true } });
    assert.equal(permission.canSubmit, true);
    await prisma.report.create({ data: { teamId: team.id, competitionId: competition.id, title: 'First', fileUrl: '/uploads/test.txt', fileName: 'test.txt' } });
    await assert.rejects(() => prisma.report.create({ data: { teamId: team.id, competitionId: competition.id, title: 'Duplicate', fileUrl: '/uploads/test2.txt', fileName: 'test2.txt' } }));
    const score = await prisma.score.create({ data: { teamId: team.id, competitionId: competition.id, judgeId: judge.id, values: '{"quality":8}', total: 8, isFinal: true } });
    await prisma.judgeScore.create({ data: { scoreId: score.id, ...ids, values: score.values, total: score.total } });
    await prisma.scoreAudit.create({ data: { scoreId: score.id, ...ids, action: 'judge_submit', newData: score.values } });
    const loaded = await prisma.score.findUnique({ where: { id: score.id }, include: { judgeScores: true, audits: true } });
    assert.equal(loaded.isFinal, true); assert.equal(loaded.judgeScores.length, 1); assert.equal(loaded.audits.length, 1);
    console.log('backend integration checks passed');
} finally {
    if (ids.teamId) await prisma.team.delete({ where: { id: ids.teamId } }).catch(() => { });
    if (ids.judgeId) await prisma.judge.delete({ where: { id: ids.judgeId } }).catch(() => { });
    if (ids.competitionId) await prisma.competition.delete({ where: { id: ids.competitionId } }).catch(() => { });
    await prisma.$disconnect();
}
