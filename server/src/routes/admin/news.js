import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zString, zId } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// News Management
const newsCreateSchema = {
  body: {
    title: zString('العنوان', { min: 1, max: 300 }),
    body: zString('المحتوى', { min: 1, max: 5000 }),
    photoUrl: zString('رابط الصورة', { max: 2048 }).optional(),
    category: zString('التصنيف', { max: 50 }).optional(),
    targetTeamIds: z.array(zString('معرف الفريق', { min: 1, max: 100 })).optional(),
  },
};
router.post('/news', validate(newsCreateSchema), async (req, res) => {
  try {
    const { title, body, photoUrl, category, targetTeamIds } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
    }

    const news = await prisma.news.create({
      data: {
        title,
        body,
        photoUrl: photoUrl || null,
        category: category || 'general',
        targetTeamIds: JSON.stringify(Array.isArray(targetTeamIds) ? targetTeamIds : []),
        createdByAdminId: req.user.id
      }
    });

    if (req.io) {
      req.io.emit('news:published', news);
    }

    res.status(201).json(news);
  } catch (err) {
    req.log.error({ err }, 'admin create news failed');
    res.status(500).json({ success: false, error: 'فشل في نشر الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const newsUpdateSchema = {
  params: { id: zId('الخبر') },
  body: {
    title: zString('العنوان', { min: 1, max: 300 }).optional(),
    body: zString('المحتوى', { min: 1, max: 5000 }).optional(),
    photoUrl: zString('رابط الصورة', { max: 2048 }).optional().nullable(),
    category: zString('التصنيف', { max: 50 }).optional(),
    targetTeamIds: z.array(zString('معرف الفريق', { min: 1, max: 100 })).optional(),
  },
};
router.patch('/news/:id', validate(newsUpdateSchema), async (req, res) => {
  try {
    const { title, body, photoUrl, category, targetTeamIds } = req.body || {};
    const news = await prisma.news.update({
      where: { id: req.params.id }, data: {
        ...(title !== undefined && { title }), ...(body !== undefined && { body }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl || null }), ...(category !== undefined && { category }),
        ...(targetTeamIds !== undefined && { targetTeamIds: JSON.stringify(Array.isArray(targetTeamIds) ? targetTeamIds : []) })
      }
    });
    res.json(news);
  } catch (err) {
    req.log.error({ err }, 'admin update news failed');
    res.status(400).json({ success: false, error: 'فشل في تعديل الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/news/:id', validate({ params: { id: zId('الخبر') } }), async (req, res) => {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });

    if (req.io) {
      req.io.emit('news:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete news failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
