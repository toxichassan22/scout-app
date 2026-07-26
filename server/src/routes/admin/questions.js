import { error } from '../../response.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zString, zId, zNumber } from '../../middleware/validate.js';
import { z } from 'zod/v3';

const router = Router();

// Questions CRUD
const questionSchema = {
  body: {
    competitionId: zId('المسابقة'),
    text: zString('نص السؤال', { min: 1, max: 1000 }),
    options: z.union([z.string(), z.array(z.any())]).optional(),
    correctOption: zNumber('الإجابة الصحيحة', { min: 0, max: 1000, int: true }),
    points: zNumber('النقاط', { min: 0, max: 10000, optional: true }),
  },
};
router.post('/questions', validate(questionSchema), async (req, res) => {
  try {
    const { competitionId, text, options, correctOption, points } = req.body;
    const q = await prisma.question.create({
      data: {
        competitionId,
        text,
        options: typeof options === 'string' ? options : JSON.stringify(options),
        correctOption: parseInt(correctOption),
        points: parseFloat(points || 10)
      }
    });
    res.status(201).json(q);
  } catch (err) {
    req.log.error({ err }, 'admin create question failed');
    error(res, 'فشل في إضافة السؤال', 500);
  }
});

router.delete('/questions/:id', validate({ params: { id: zId('السؤال') } }), async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete question failed');
    error(res, 'فشل في حذف السؤال', 500);
  }
});

export default router;
