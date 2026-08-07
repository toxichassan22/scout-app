import { Router } from 'express';
import prisma from '../../db.js';

const router = Router();

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

router.get('/activities/sessions/:sessionId', async (req, res) => {
  const session = await prisma.activitySession.findUnique({ where: { id: req.params.sessionId }, include: { activity: true, participants: { include: { team: { select: { id: true, label: true, username: true } } }, orderBy: [{ score: 'desc' }, { joinedAt: 'asc' }] } } });
  if (!session) return res.status(404).json({ error: 'جلسة النشاط غير موجودة' });
  res.json({
    success: true,
    session: {
      id: session.id,
      activity: session.activity,
      roomCode: session.roomCode,
      status: session.status,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      participants: session.participants.map(participant => ({
        id: participant.id,
        team: participant.team,
        deviceId: participant.deviceId,
        displayName: participant.displayName,
        secretCode: parseJson(participant.metadata, {}).secretCode || null,
        score: participant.score,
        rank: participant.rank,
        eliminated: participant.eliminated,
        joinedAt: participant.joinedAt,
        finishedAt: participant.finishedAt,
      })),
    },
  });
});

export default router;
