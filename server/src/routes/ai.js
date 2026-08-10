import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { validate, zString } from '../middleware/validate.js';
import { createMemoryRateLimiter } from '../security.js';
import { z } from 'zod';
import { getFestivalContext } from '../aiContext.js';
import { requestAiProvider } from '../aiGateway.js';

const router = Router();
router.use(requireRole(['team']));

// One shared team account may be open on many phones. Limit by team, not device,
// so all of its members share a fair allowance and cannot multiply provider calls.
const aiUserRateLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.AI_RATE_WINDOW_MS) || 60_000,
  max: Number(process.env.AI_RATE_MAX) || 6,
  keyGenerator: req => req.user?.id || 'unknown-team',
  message: 'استخدمتم حد الشات المؤقت؛ حاولوا بعد قليل',
});

const chatSchema = {
  body: {
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: zString('الرسالة', { min: 1, max: 4000 }) })).min(1).max(30),
  },
};

router.post('/chat', aiUserRateLimiter, validate(chatSchema), async (req, res) => {
  const url = String(process.env.AI_CHAT_URL || '').trim();
  const token = String(process.env.AI_CHAT_TOKEN || '').trim();
  const tokenPool = String(process.env.AI_CHAT_TOKEN_POOL || '').trim();
  const model = String(process.env.AI_CHAT_MODEL || 'scout-assistant').trim();
  if (!url || (!token && !tokenPool)) return res.status(503).json({ error: 'مساعد الذكاء الاصطناعي غير مفعل بعد', code: 'AI_NOT_CONFIGURED' });

  // Keep enough history for follow-up questions without sending the whole chat on
  // every request. This reduces provider latency and token usage substantially.
  const conversation = req.body.messages.slice(-8).map(message => ({
    role: message.role,
    content: message.content.trim().slice(-2000),
  }));

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

  try {
    const result = await requestAiProvider({
      url,
      token,
      model,
      festivalContext,
      messages: [{ role: 'system', content: systemPrompt }, ...conversation],
    });
    return res.json({ success: true, message: result.content, cached: result.cached });
  } catch (err) {
    const status = err.status === 429 ? 429 : err.status === 504 ? 504 : 502;
    if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
    req.log.warn({ err, status, teamId: req.user?.id }, 'AI chat request did not complete');
    return res.status(status).json({
      error: err.message || 'تعذر إكمال طلب المساعد حالياً',
      code: status === 429 ? 'AI_RATE_LIMITED' : status === 504 ? 'AI_TIMEOUT' : 'AI_PROVIDER_ERROR',
    });
  }
});

export default router;
