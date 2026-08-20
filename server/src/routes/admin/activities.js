import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import prisma from '../../db.js';
import { ensureActivityCatalog, getEasterEggQrPayload, getEasterEggStages } from '../../activityService.js';
import { clearFestivalContextCache } from '../../aiContext.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

function parseJson(value, fallback = {}) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function stageResponse(stages) {
  return stages.map((stage, index) => ({ ...stage, index, qrValue: getEasterEggQrPayload(stage) }));
}

const stageInput = z.strictObject({
  id: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/).optional(),
  title: z.string().trim().min(1).max(160),
  taskType: z.string().trim().max(80).optional().default('مهمة'),
  task: z.string().trim().max(2000).optional().default(''),
  requiresSawaed: z.boolean(),
  clue: z.string().trim().max(500).optional().default(''),
  qrCode: z.string().trim().max(200).optional().nullable(),
});
const updateStagesSchema = { body: z.strictObject({ stages: z.array(stageInput).min(1).max(50) }) };

router.get('/activities/easter-egg/stages', async (req, res) => {
  await ensureActivityCatalog();
  const activity = await prisma.activity.findUnique({ where: { slug: 'easter-egg' } });
  if (!activity) return res.status(404).json({ error: 'نشاط Easter Egg غير موجود' });
  res.json({ success: true, stages: stageResponse(getEasterEggStages(activity)) });
});

router.put('/activities/easter-egg/stages', validate(updateStagesSchema), async (req, res) => {
  const activity = await prisma.activity.findUnique({ where: { slug: 'easter-egg' } });
  if (!activity) return res.status(404).json({ error: 'نشاط Easter Egg غير موجود' });
  const stages = [];
  const ids = new Set();
  for (const [index, input] of req.body.stages.entries()) {
    const id = input.id || `stage-${crypto.randomUUID()}`;
    if (ids.has(id)) return res.status(400).json({ error: `معرّف المرحلة مكرر: ${id}` });
    const clueText = (input.clue || '').trim();
    const taskText = (input.task || '').trim();
    const qrCodeText = (input.qrCode || '').trim();
    if (!input.requiresSawaed && index < req.body.stages.length - 1 && !clueText) {
      return res.status(400).json({ error: `المرحلة ${index + 1} تحتاج تلميح (Clue) لأنها بحث ذاتي بدون سواعد` });
    }
    if (input.requiresSawaed && !taskText) {
      return res.status(400).json({ error: `المرحلة ${index + 1} تحتاج وصف المهمة المطلوب تنفيذها أمام السواعد` });
    }
    ids.add(id);
    stages.push({
      id,
      title: input.title,
      taskType: input.taskType || (input.requiresSawaed ? 'مهمة سواعد' : 'بحث واستكشاف'),
      task: taskText || clueText || 'ابحثوا عن QR المرحلة التالية',
      requiresSawaed: input.requiresSawaed,
      clue: clueText,
      ...(qrCodeText ? { qrCode: qrCodeText } : {}),
    });
  }
  const currentConfig = parseJson(activity.config, {});
  const updated = await prisma.activity.update({ where: { id: activity.id }, data: { config: JSON.stringify({ ...currentConfig, kind: 'easter', stages }) } });
  clearFestivalContextCache();
  res.json({ success: true, stages: stageResponse(getEasterEggStages(updated)) });
});

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
