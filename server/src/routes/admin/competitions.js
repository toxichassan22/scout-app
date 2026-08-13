import { Router } from 'express';
import crypto from 'node:crypto';
import prisma from '../../db.js';
import { boundedString } from '../../validation.js';
import { finalizeCompetitionSessions } from '../../quizService.js';
import { emitLeaderboardUpdate } from '../../realtime.js';
import { getAnonymousLeaderboard } from '../leaderboard.js';
import { validate, zString, zId, zNumber, zBoolean } from '../../middleware/validate.js';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '../../pagination.js';
import { clearFestivalContextCache } from '../../aiContext.js';

const router = Router();

const timeFromDateInput = value => {
  const match = String(value || '').match(/T(\d{2}:\d{2})/);
  return match?.[1] || null;
};
const festivalDate = () => process.env.FESTIVAL_DATE || '2026-08-21';
const dateFromTime = value => value ? new Date(`${festivalDate()}T${String(value).slice(0, 5)}:00+03:00`) : null;

// Competitions & Passcodes
router.get('/competitions', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [comps, total] = await Promise.all([
      prisma.competition.findMany({ skip, take: limit }),
      prisma.competition.count(),
    ]);
    const schedules = await prisma.agendaItem.findMany({
      where: { competitionId: { in: comps.map(comp => comp.id) } },
      include: { zone: true },
      orderBy: { order: 'asc' },
    });
    const scheduleByCompetition = new Map(schedules.map(schedule => [schedule.competitionId, schedule]));
    res.json(paginatedResponse({
      data: comps.map(comp => ({ ...comp, schedule: scheduleByCompetition.get(comp.id) || null })),
      page,
      limit,
      total,
    }));
  } catch (err) {
    req.log.error({ err }, 'admin competitions failed');
    res.status(500).json({ success: false, error: 'فشل في جلب المسابقات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const competitionCreateSchema = { body: { name: zString('الاسم', { min: 1, max: 200 }), slug: zString('الرمز', { min: 1, max: 100 }), type: zString('النوع', { min: 1, max: 50 }).optional(), description: zString('الوصف', { max: 1000 }).optional(), details: zString('التفاصيل', { max: 5000 }).optional(), duration: zNumber('المدة', { min: 1, optional: true }), questionCount: zNumber('عدد الأسئلة', { min: 1, max: 500, int: true, optional: true }), startsAt: zString('بداية الموعد', { max: 50 }).optional().nullable(), endsAt: zString('نهاية الموعد', { max: 50 }).optional().nullable(), qrCode: zString('QR المسابقة', { max: 200 }).optional().nullable(), requiresQr: zBoolean('إلزام QR', { optional: true }), criteria: z.union([z.string(), z.array(z.any())]).optional() } };
router.post('/competitions', validate(competitionCreateSchema), async (req, res) => {
  try {
    const { name, slug, type, description, details, duration, questionCount, startsAt, endsAt, qrCode, requiresQr, criteria } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 200 });
    const cleanSlug = boundedString(slug, 'slug', { min: 1, max: 100 });
    const cleanType = type === undefined ? 'auto_digital' : String(type);
    if (!['auto_digital', 'manual_judged', 'schedule_only'].includes(cleanType)) return res.status(400).json({ error: 'نوع المسابقة غير صالح' });
    const comp = await prisma.competition.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        type: cleanType,
        description: description || '',
        details: details || '',
        duration: duration === undefined ? null : Number(duration),
        questionCount: questionCount === undefined ? 50 : Number(questionCount),
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        qrCode: qrCode || null,
        requiresQr: Boolean(requiresQr),
        criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria || [])
      }
    });
    clearFestivalContextCache();
    if (req.io) req.io.emit('competition:update', { action: 'created', competitionId: comp.id });
    res.status(201).json(comp);
  } catch (err) {
    req.log.error({ err }, 'admin create competition failed');
    res.status(500).json({ success: false, error: 'فشل في إنشاء المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const competitionUpdateSchema = {
  params: { id: zId('المسابقة') },
  body: {
    isOpen: zBoolean('isOpen', { optional: true }),
    slug: zString('الرمز', { min: 1, max: 100 }).optional(),
    name: zString('الاسم', { min: 1, max: 200 }).optional(),
    description: zString('الوصف', { max: 1000 }).optional(),
    details: zString('التفاصيل', { max: 5000 }).optional(),
    type: zString('النوع', { max: 50 }).optional(),
    criteria: z.union([z.string(), z.array(z.any())]).optional(),
    duration: zNumber('المدة', { min: 0, optional: true }),
    questionCount: zNumber('عدد الأسئلة', { min: 1, max: 500, int: true, optional: true }),
    startsAt: zString('بداية الموعد', { max: 50 }).optional().nullable(),
    endsAt: zString('نهاية الموعد', { max: 50 }).optional().nullable(),
    startTime: zString('وقت البدء', { max: 20 }).optional().nullable(),
    endTime: zString('وقت الانتهاء', { max: 20 }).optional().nullable(),
    zoneId: zString('المكان', { max: 100 }).optional().nullable(),
    locationNote: zString('ملاحظة المكان', { max: 300 }).optional(),
    qrCode: zString('QR المسابقة', { max: 200 }).optional().nullable(),
    requiresQr: zBoolean('إلزام QR', { optional: true }),
    leaderboardVisible: zBoolean('إظهار النتائج', { optional: true }),
    entryCode: zString('كود الدخول', { max: 100 }).optional().nullable(),
    passcode: zString('كود المرور', { max: 100 }).optional().nullable(),
    custom: zBoolean('custom', { optional: true }),
    revoke: zBoolean('revoke', { optional: true }),
  },
};
router.patch('/competitions/:id', validate(competitionUpdateSchema), async (req, res) => {
  try {
    const { isOpen, slug, name, description, details, type, criteria, duration, questionCount, startsAt, endsAt, startTime, endTime, zoneId, locationNote, qrCode, requiresQr, leaderboardVisible, entryCode, passcode, custom, revoke } = req.body;
    if (type !== undefined && !['auto_digital', 'manual_judged', 'schedule_only'].includes(String(type))) return res.status(400).json({ error: 'نوع المسابقة غير صالح' });
    const data = {
      ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
      ...(slug !== undefined && { slug: String(slug).trim() }),
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description) }),
      ...(details !== undefined && { details: String(details) }),
      ...(type !== undefined && { type: String(type) }),
      ...(criteria !== undefined && { criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria) }),
      ...(duration !== undefined && { duration: duration === null ? null : Number(duration) }),
      ...(questionCount !== undefined && { questionCount: Number(questionCount) }),
      ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
      ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      ...(startTime !== undefined && { startsAt: dateFromTime(startTime) }),
      ...(endTime !== undefined && { endsAt: dateFromTime(endTime) }),
      ...(qrCode !== undefined && { qrCode: qrCode ? String(qrCode).trim() : null }),
      ...(requiresQr !== undefined && { requiresQr: Boolean(requiresQr) }),
      ...(leaderboardVisible !== undefined && { leaderboardVisible: Boolean(leaderboardVisible) }),
      ...(entryCode !== undefined && { entryCode: entryCode ? String(entryCode) : null }),
      ...(passcode !== undefined && { passcode: passcode ? String(passcode) : null }),
    };
    if (custom !== undefined) data.type = custom ? 'manual_judged' : data.type;
    if (revoke === true) { data.passcode = null; data.entryCode = null; data.isOpen = false; }
    const transactionResult = await prisma.$transaction(async tx => {
      const before = await tx.competition.findUnique({ where: { id: req.params.id }, select: { isOpen: true } });
      const updated = await tx.competition.update({ where: { id: req.params.id }, data });
      if (isOpen === true) await tx.judgeCompetition.deleteMany({ where: { competitionId: req.params.id } });
      const agendaData = {
        ...(data.name !== undefined && { title: updated.name }),
        ...(startTime !== undefined && { startTime: startTime || undefined }),
        ...(endTime !== undefined && { endTime: endTime || undefined }),
        ...(data.startsAt !== undefined && { startTime: timeFromDateInput(startsAt) || undefined }),
        ...(data.endsAt !== undefined && { endTime: timeFromDateInput(endsAt) || undefined }),
        ...(zoneId !== undefined && { zoneId: zoneId || undefined }),
        ...(locationNote !== undefined && { locationNote: locationNote || '' }),
      };
      const cleanAgendaData = Object.fromEntries(Object.entries(agendaData).filter(([, value]) => value !== undefined));
      if (Object.keys(cleanAgendaData).length) {
        await tx.agendaItem.updateMany({ where: { competitionId: updated.id }, data: cleanAgendaData });
      }
      return { updated, wasOpen: Boolean(before?.isOpen) };
    });
    const comp = transactionResult.updated;
    const justOpened = isOpen === true && !transactionResult.wasOpen;
    clearFestivalContextCache();

    if (req.io) {
      req.io.emit('competition:update', { action: 'updated', competitionId: comp.id, name: comp.name, isOpen: comp.isOpen, opened: justOpened });
      if (justOpened) {
        req.io.emit('competition:mandatory_alert', {
          title: `🏁 انطلقت المسابقة الآن: ${comp.name}`,
          message: `تم فتح باب المشاركة في مسابقة (${comp.name}) رسمياً. حظاً موفقاً لجميع الفرق!`,
          type: 'competition',
          competitionId: comp.id
        });
      }
      if (isOpen === false) req.io.emit('judge:session:closed', { competitionId: comp.id });
    }

    if (isOpen === false) {
      await finalizeCompetitionSessions(comp.id);
      await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    }
    res.json(comp);
  } catch (err) {
    req.log.error({ err }, 'admin update competition failed');
    res.status(500).json({ success: false, error: 'فشل في تحديث المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.post('/competitions/:id/passcode', validate({ params: { id: zId('المسابقة') } }), async (req, res) => {
  try {
    const randomCode = crypto.randomInt(100000, 1000000).toString();
    const comp = await prisma.competition.update({
      where: { id: req.params.id },
      data: { passcode: randomCode, isOpen: true }
    });
    clearFestivalContextCache();
    if (req.io) req.io.emit('competition:update', { action: 'opened', competitionId: comp.id, name: comp.name, isOpen: comp.isOpen, opened: true });
    res.json({ passcode: comp.passcode });
  } catch (err) {
    req.log.error({ err }, 'admin generate passcode failed');
    res.status(500).json({ success: false, error: 'فشل في توليد كود المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
