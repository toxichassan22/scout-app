import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { boundedString, strongPassword } from '../../validation.js';
import { validate, zString, zId } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeJudgeSelect = { id: true, name: true, username: true, authVersion: true, createdAt: true };

const router = Router();

// Judges CRUD
router.get('/judges', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    let judges = [];
    let total = 0;
    try {
      [judges, total] = await Promise.all([
        prisma.judge.findMany({ orderBy: { createdAt: 'desc' }, select: safeJudgeSelect, skip, take: limit }),
        prisma.judge.count(),
      ]);
    } catch (jErr) {
      req.log.warn({ jErr }, 'admin judges query failed, falling back');
      [judges, total] = [await prisma.judge.findMany({ select: safeJudgeSelect, skip, take: limit }), await prisma.judge.count()];
    }
    res.json(paginatedResponse({ data: judges, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin judges failed');
    res.status(500).json({ success: false, error: 'فشل في جلب المحكمين: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const judgeCreateSchema = { body: { name: zString('الاسم', { min: 1, max: 120 }), username: zString('اسم المستخدم', { min: 1, max: 80 }), password: zString('كلمة السر', { min: 3, max: 256 }) } };
router.post('/judges', validate(judgeCreateSchema), async (req, res) => {
  try {
    const { name, username, password } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 120 });
    const cleanUsername = boundedString(username, 'username', { min: 1, max: 80 });
    const cleanPassword = strongPassword(password);

    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const judge = await prisma.judge.create({ data: { name: cleanName, username: cleanUsername, passwordHash }, select: safeJudgeSelect });

    res.status(201).json(judge);
  } catch (err) {
    req.log.error({ err }, 'admin create judge failed');
    res.status(400).json({ success: false, error: 'فشل في إنشاء المحكم (اسم المستخدم مكرر)', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/judges/:id', validate({ params: { id: zId('المحكم') } }), async (req, res) => {
  try {
    await prisma.judge.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete judge failed');
    res.status(500).json({ success: false, error: 'فشل في حذف المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
