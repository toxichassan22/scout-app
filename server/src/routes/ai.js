import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(requireRole(['team']));

const chatSchema = {
  body: {
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: zString('الرسالة', { min: 1, max: 4000 }) })).min(1).max(30),
  },
};

router.post('/chat', validate(chatSchema), async (req, res) => {
  const url = String(process.env.AI_CHAT_URL || '').trim();
  const token = String(process.env.AI_CHAT_TOKEN || '').trim();
  const model = String(process.env.AI_CHAT_MODEL || 'scout-assistant').trim();
  if (!url || !token) return res.status(503).json({ error: 'مساعد الذكاء الاصطناعي غير مفعل بعد', code: 'AI_NOT_CONFIGURED' });

  const messages = [
    { role: 'system', content: 'أنت مساعد مهرجان كشفي. أجب عن البرنامج والمسابقات والجدول بطريقة واضحة. لا تكشف درجات أو بيانات فريق آخر، ولا تطلب كلمات مرور أو رموز دخول.' },
    ...req.body.messages,
  ];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return res.status(502).json({ error: 'تعذر الاتصال بمزود الذكاء الاصطناعي' });
  const content = data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text;
  if (!content) return res.status(502).json({ error: 'رد مزود الذكاء الاصطناعي غير صالح' });
  res.json({ success: true, message: content });
});

export default router;
