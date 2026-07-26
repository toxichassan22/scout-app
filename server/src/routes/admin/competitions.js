import { Router } from 'express';
import crypto from 'node:crypto';
import prisma from '../../db.js';
import { boundedString } from '../../validation.js';
import { validate, zString, zId, zNumber, zBoolean } from '../../middleware/validate.js';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const router = Router();

// Competitions & Passcodes
router.get('/competitions', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [comps, total] = await Promise.all([
      prisma.competition.findMany({ include: { questions: true }, skip, take: limit }),
      prisma.competition.count(),
    ]);
    res.json(paginatedResponse({ data: comps, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin competitions failed');
    res.status(500).json({ success: false, error: 'فشل في جلب المسابقات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const competitionCreateSchema = { body: { name: zString('الاسم', { min: 1, max: 200 }), slug: zString('الرمز', { min: 1, max: 100 }), type: zString('النوع', { min: 1, max: 50 }).optional(), criteria: z.union([z.string(), z.array(z.any())]).optional() } };
router.post('/competitions', validate(competitionCreateSchema), async (req, res) => {
  try {
    const { name, slug, type, criteria } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 200 });
    const cleanSlug = boundedString(slug, 'slug', { min: 1, max: 100 });
    const cleanType = type === undefined ? 'auto_digital' : String(type);
    if (!['auto_digital', 'manual_judged'].includes(cleanType)) return res.status(400).json({ error: 'نوع المسابقة غير صالح' });
    const comp = await prisma.competition.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        type: cleanType,
        criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria || [])
      }
    });
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
    name: zString('الاسم', { min: 1, max: 200 }).optional(),
    description: zString('الوصف', { max: 1000 }).optional(),
    type: zString('النوع', { max: 50 }).optional(),
    criteria: z.union([z.string(), z.array(z.any())]).optional(),
    duration: zNumber('المدة', { min: 0, optional: true }),
    entryCode: zString('كود الدخول', { max: 100 }).optional().nullable(),
    passcode: zString('كود المرور', { max: 100 }).optional().nullable(),
    custom: zBoolean('custom', { optional: true }),
    revoke: zBoolean('revoke', { optional: true }),
  },
};
router.patch('/competitions/:id', validate(competitionUpdateSchema), async (req, res) => {
  try {
    const { isOpen, name, description, type, criteria, duration, entryCode, passcode, custom, revoke } = req.body;
    const data = {
      ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description) }),
      ...(type !== undefined && { type: String(type) }),
      ...(criteria !== undefined && { criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria) }),
      ...(duration !== undefined && { duration: duration === null ? null : Number(duration) }),
      ...(entryCode !== undefined && { entryCode: entryCode ? String(entryCode) : null }),
      ...(passcode !== undefined && { passcode: passcode ? String(passcode) : null }),
    };
    if (custom !== undefined) data.type = custom ? 'manual_judged' : data.type;
    if (revoke === true) { data.passcode = null; data.entryCode = null; data.isOpen = false; }
    const comp = await prisma.competition.update({ where: { id: req.params.id }, data });

    if (req.io) {
      req.io.emit('competition:update', { action: 'updated', competitionId: comp.id, isOpen: comp.isOpen });
      if (isOpen === false) req.io.emit('judge:session:closed', { competitionId: comp.id });
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
    if (req.io) req.io.emit('competition:update', { action: 'opened', competitionId: comp.id, isOpen: comp.isOpen });
    res.json({ passcode: comp.passcode });
  } catch (err) {
    req.log.error({ err }, 'admin generate passcode failed');
    res.status(500).json({ success: false, error: 'فشل في توليد كود المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
