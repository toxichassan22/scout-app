import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import prisma, { databaseReady } from '../src/db.js';
import { startDigitalSession, saveDigitalAnswer, finalizeDigitalSession } from '../src/quizService.js';

await databaseReady;

const suffix = crypto.randomUUID();
let team;
let competition;
let question;

try {
  team = await prisma.team.create({
    data: { username: `quiz-${suffix}`, label: 'Quiz Unit Team', passwordHash: await bcrypt.hash('test1234', 4), maxDevices: 2 },
  });

  competition = await prisma.competition.create({
    data: { name: 'Quiz Unit', slug: `quiz-unit-${suffix}`, type: 'auto_digital', isOpen: true, entryCode: 'UNIT-123', duration: 600 },
  });

  question = await prisma.question.create({
    data: { competitionId: competition.id, text: 'Pick B', options: '["A","B"]', correctOption: 1, points: 10 },
  });

  const deviceId = `device-${suffix}`;

  const session = await startDigitalSession({ teamId: team.id, competitionId: competition.id, deviceId, entryCode: 'UNIT-123' });
  assert.ok(session.id, 'session should have an id');
  assert.equal(session.teamId, team.id, 'session teamId should match');
  assert.ok(session.expiresAt > new Date(), 'session should expire in the future');

  const answer = await saveDigitalAnswer({ sessionId: session.id, teamId: team.id, deviceId, questionId: question.id, selectedIndex: 1 });
  assert.equal(answer.isCorrect, true, 'answer should be correct');
  assert.equal(answer.pointsEarned, 10, 'points should equal question points');

  const result = await finalizeDigitalSession(session.id);
  assert.equal(result.totalScore, 10, 'total score should equal answer points');
  assert.ok(result.score, 'score record should be returned');

  await assert.rejects(
    () => startDigitalSession({ teamId: team.id, competitionId: competition.id, deviceId, entryCode: 'UNIT-123' }),
    (err) => err.status === 409,
    'starting a new session after finalization should fail with 409'
  );

  const otherTeam = await prisma.team.create({
    data: { username: `quiz-other-${suffix}`, label: 'Quiz Unit Other', passwordHash: await bcrypt.hash('test1234', 4), maxDevices: 2 },
  });
  await assert.rejects(
    () => startDigitalSession({ teamId: otherTeam.id, competitionId: competition.id, deviceId, entryCode: 'WRONG' }),
    (err) => err.status === 403,
    'wrong entry code should fail with 403'
  );
  await prisma.team.delete({ where: { id: otherTeam.id } });

  console.log('quizService unit tests passed');
} finally {
  await prisma.draftAnswer.deleteMany({ where: { questionId: question?.id } }).catch(() => {});
  await prisma.quizSession.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.score.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.question.deleteMany({ where: { id: question?.id } }).catch(() => {});
  await prisma.competitionAccess.deleteMany({ where: { competitionId: competition?.id } }).catch(() => {});
  await prisma.competition.delete({ where: { id: competition?.id } }).catch(() => {});
  await prisma.team.delete({ where: { id: team?.id } }).catch(() => {});
  await prisma.$disconnect();
}
