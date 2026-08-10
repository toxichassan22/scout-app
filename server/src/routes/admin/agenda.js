import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zString, zId, zNumber } from '../../middleware/validate.js';
import { z } from 'zod';
import { clearFestivalContextCache } from '../../aiContext.js';

const router = Router();

const festivalDate = () => process.env.FESTIVAL_DATE || '2026-08-21';
const toFestivalDateTime = time => time ? new Date(`${festivalDate()}T${String(time).slice(0, 5)}:00+03:00`) : null;

async function linkedCompetition(tx, competitionId) {
  if (!competitionId) return null;
  const competition = await tx.competition.findUnique({ where: { id: competitionId }, select: { id: true } });
  if (!competition) throw Object.assign(new Error('المسابقة المرتبطة غير موجودة'), { status: 404 });
  return competition;
}

async function syncCompetitionFromAgenda(tx, { competitionId, title, startTime, endTime }) {
  if (!competitionId) return;
  await linkedCompetition(tx, competitionId);
  await tx.competition.update({
    where: { id: competitionId },
    data: {
      name: title,
      startsAt: toFestivalDateTime(startTime),
      endsAt: toFestivalDateTime(endTime),
    },
  });
}

// Agenda Management
const agendaSchema = {
  body: {
    title: zString('العنوان', { min: 1, max: 300 }),
    type: zString('النوع', { max: 50 }),
    period: zString('الفترة', { max: 50 }).optional(),
    order: zNumber('الترتيب', { min: 0, int: true, optional: true }),
    zoneId: zString('المنطقة', { max: 100 }),
    competitionId: zString('المسابقة المرتبطة', { max: 100 }).optional().nullable(),
    locationNote: zString('ملاحظة المكان', { max: 300 }).optional(),
    startTime: zString('وقت البدء', { max: 50 }),
    endTime: zString('وقت الانتهاء', { max: 50 }),
    description: zString('الوصف', { max: 1000 }).optional(),
  },
};
router.post('/agenda', validate(agendaSchema), async (req, res) => {
  try {
    const { title, type, period, order, zoneId, competitionId, locationNote, startTime, endTime, description } = req.body;
    const item = await prisma.$transaction(async tx => {
      await linkedCompetition(tx, competitionId);
      const created = await tx.agendaItem.create({
        data: {
          title,
          type,
          period: period || 'before',
          order: Number(order) || 0,
          zoneId,
          competitionId: competitionId || null,
          locationNote: locationNote || '',
          startTime,
          endTime,
          description: description || '',
        },
      });
      await syncCompetitionFromAgenda(tx, { competitionId, title, startTime, endTime });
      return created;
    });

    clearFestivalContextCache();
    if (req.io) req.io.emit('agenda:update');

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, 'admin create agenda failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/agenda/:id', validate({ params: { id: zId('الفعالية') } }), async (req, res) => {
  try {
    await prisma.agendaItem.delete({ where: { id: req.params.id } });
    clearFestivalContextCache();

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete agenda failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.put('/agenda/:id', validate({ params: { id: zId('الفعالية') }, body: agendaSchema.body }), async (req, res) => {
  try {
    const { title, type, period, order, zoneId, competitionId, locationNote, startTime, endTime, description } = req.body;
    const item = await prisma.$transaction(async tx => {
      await linkedCompetition(tx, competitionId);
      const updated = await tx.agendaItem.update({
        where: { id: req.params.id },
        data: {
          title,
          type,
          period: period || 'before',
          order: Number(order) || 0,
          zoneId,
          competitionId: competitionId || null,
          locationNote: locationNote || '',
          startTime,
          endTime,
          description: description || '',
        },
      });
      await syncCompetitionFromAgenda(tx, { competitionId, title, startTime, endTime });
      return updated;
    });

    clearFestivalContextCache();
    if (req.io) req.io.emit('agenda:update');

    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'admin update agenda failed');
    res.status(500).json({ success: false, error: 'فشل في تعديل الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const agendaActionSchema = {
  params: { id: zId('الفعالية') },
  body: { action: z.enum(['start', 'stop', 'close'], { errorMap: () => ({ message: 'الإجراء يجب أن يكون start أو stop أو close' }) }) },
};
router.post('/agenda/:id/action', validate(agendaActionSchema), async (req, res) => {
  try {
    const action = String(req.body.action || '').toLowerCase();
    const now = new Date();
    const data = action === 'start'
      ? { isStarted: true, startedAt: now, isClosed: false, closedAt: null }
      : action === 'stop' || action === 'close'
        ? { isClosed: true, closedAt: now }
        : null;
    if (!data) return res.status(400).json({ error: 'الإجراء يجب أن يكون start أو stop أو close' });
    const item = await prisma.agendaItem.update({ where: { id: req.params.id }, data });
    clearFestivalContextCache();
    if (req.io) req.io.emit('agenda:update', { action, agendaId: item.id });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'admin agenda action failed');
    res.status(500).json({ success: false, error: 'فشل في تغيير حالة الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
