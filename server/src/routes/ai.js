import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod';
import { getFestivalContext } from '../aiContext.js';
import { requestAiProvider, streamAiProvider } from '../aiGateway.js';

const router = Router();
router.use(requireRole(['team']));

const chatSchema = {
  body: {
    messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: zString('الرسالة', { min: 1, max: 4000 }) })).min(1).max(30),
  },
};

function writeStreamEvent(res, event, payload) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

async function streamChatResponse(req, res, options) {
  const abortController = new AbortController();
  const handleClose = () => {
    if (!res.writableEnded) abortController.abort();
  };
  res.on('close', handleClose);
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  try {
    await streamAiProvider({
      ...options,
      signal: abortController.signal,
      onToken: content => {
        if (res.writableEnded || res.destroyed) return false;
        writeStreamEvent(res, 'token', { content });
        return true;
      },
    });
    if (!abortController.signal.aborted && !res.writableEnded && !res.destroyed) {
      writeStreamEvent(res, 'done', { success: true });
      res.end();
    }
  } catch (err) {
    if (abortController.signal.aborted || res.writableEnded || res.destroyed) return;
    const status = err.status === 429 ? 429 : err.status === 504 ? 504 : 502;
    if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
    req.log.warn({ err, status, teamId: req.user?.id }, 'AI chat stream did not complete');
    writeStreamEvent(res, 'error', {
      error: err.message || 'تعذر إكمال بث المساعد حالياً',
      code: err.code || (status === 429 ? 'AI_RATE_LIMITED' : status === 504 ? 'AI_TIMEOUT' : 'AI_PROVIDER_ERROR'),
      retryAfter: err.retryAfter,
    });
    res.end();
  } finally {
    res.off('close', handleClose);
  }
}

router.post('/chat', validate(chatSchema), async (req, res) => {
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
    'أجب في 2 إلى 5 نقاط قصيرة فقط. لا تسرد البرنامج الكامل إلا إذا طلب المستخدم ذلك صراحة.',
    'إذا سأل المستخدم عن المسابقات المفتوحة أو الأونلاين، اذكر أسماء المسابقات المفتوحة فقط مع وقتها إن كان موجوداً، ولا تعرض كل جدول المهرجان.',
    'استخدم نصاً عربياً بسيطاً بدون جداول Markdown أو الرمز | أو || أو خطوط --- أو عناوين #؛ استخدم نقاطاً قصيرة واضحة.',
    festivalContext ? `\n=== بيانات المهرجان ===\n${festivalContext}` : '',
  ].filter(Boolean).join('\n');
  const providerMessages = [{ role: 'system', content: systemPrompt }, ...conversation];

  if (req.query.stream === '1' || req.query.stream === 'true') {
    return streamChatResponse(req, res, { url, token, model, festivalContext, messages: providerMessages });
  }

  try {
    const result = await requestAiProvider({
      url,
      token,
      model,
      festivalContext,
      messages: providerMessages,
    });
    return res.json({ success: true, message: result.content, cached: result.cached });
  } catch (err) {
    const status = err.status === 429 ? 429 : err.status === 504 ? 504 : 502;
    if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
    req.log.warn({ err, status, teamId: req.user?.id }, 'AI chat request did not complete');
    return res.status(status).json({
      error: err.message || 'تعذر إكمال طلب المساعد حالياً',
      code: err.code || (status === 429 ? 'AI_RATE_LIMITED' : status === 504 ? 'AI_TIMEOUT' : 'AI_PROVIDER_ERROR'),
    });
  }
});

export default router;
