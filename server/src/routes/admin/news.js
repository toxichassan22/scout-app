import { error } from '../../response.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zString, zId } from '../../middleware/validate.js';
import { z } from 'zod/v3';

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
      return error(res, 'العنوان والمحتوى مطلوبان', 400);
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
    error(res, 'فشل في نشر الخبر', 500);
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
    error(res, 'فشل في تعديل الخبر', 400);
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
    error(res, 'فشل في حذف الخبر', 500);
  }
});

export default router;
