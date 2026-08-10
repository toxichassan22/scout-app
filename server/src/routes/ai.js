import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod';
import { getFestivalContext } from '../aiContext.js';

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

  // Real agenda and competition data is injected so the model answers from the
  // festival's own state instead of guessing. A failure here must not break chat.
  let festivalContext = '';
  try {
    festivalContext = await getFestivalContext();
  } catch (err) {
    req.log.warn({ err }, 'failed to build AI festival context');
  }

  const systemPrompt = [
    'أنت مساعد مهرجان كشفي. أجب بالعربية وبإيجاز عن البرنامج والمسابقات والجدول.',
    'اعتمد فقط على البيانات المرفقة أدناه. إذا كانت المعلومة غير موجودة فيها، قل بوضوح إنك لا تعرف واقترح سؤال الإدارة — لا تخترع مواعيد أو تفاصيل.',
    'لا تكشف درجات أو بيانات أي فريق، ولا تطلب أو تذكر كلمات مرور أو أكواد دخول أو أكواد المحكمين.',
    festivalContext ? `\n=== بيانات المهرجان ===\n${festivalContext}` : '',
  ].filter(Boolean).join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
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
