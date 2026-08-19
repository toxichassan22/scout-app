import { Router } from 'express';
import fs from 'node:fs/promises';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { requireRole } from '../middleware/auth.js';
import { validate, zString } from '../middleware/validate.js';
import { z } from 'zod';
import { getFestivalContext } from '../aiContext.js';
import { requestAiProvider, streamAiProvider } from '../aiGateway.js';
import { checkGpuHealth, getGpuStatus, startGpuInstance, AI_GPU_SERVER_URL } from '../gpuService.js';
import logger from '../logger.js';

const router = Router();
router.use(requireRole(['team', 'admin']));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const aiUploadsDir = path.join(__dirname, '../../uploads/ai');

// Ensure storage directory exists
await fs.mkdir(aiUploadsDir, { recursive: true }).catch(() => {});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB max
});

// ─── GPU & Model Health ───
router.get('/health', async (req, res) => {
  try {
    const health = await checkGpuHealth();
    res.json({
      success: true,
      ...health,
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      ready: false,
      error: err.message || 'تعذر الاتصال بسيرفر الذكاء الاصطناعي',
    });
  }
});

// ─── GPU Server Status (Teams & Admins) ───
router.get('/gpu-status', async (req, res) => {
  try {
    const [statusResult, healthResult] = await Promise.all([
      getGpuStatus(),
      checkGpuHealth(),
    ]);

    res.json({
      success: true,
      ...statusResult,
      health: healthResult,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get GPU status for user');
    res.status(500).json({
      success: false,
      error: err.message || 'فشل في استعلام حالة سيرفر الـ GPU',
    });
  }
});

// ─── GPU Server Wake/Start (Teams & Admins) ───
router.post('/gpu-start', async (req, res) => {
  try {
    const result = await startGpuInstance();
    res.json(result);
  } catch (err) {
    logger.error({ err }, 'Failed to start GPU instance for user');
    res.status(500).json({
      success: false,
      error: err.message || 'فشل في تشغيل سيرفر الـ GPU',
    });
  }
});

// ─── FLUX.1 Text-to-Image Generation ───
const generateImageSchema = {
  body: {
    prompt: zString('الوصف النصي (Prompt)', { min: 2, max: 2000 }),
    style: zString('النمط', { max: 100, optional: true }),
    aspectRatio: zString('الأبعاد', { max: 50, optional: true }),
  },
};

router.post('/generate-image', validate(generateImageSchema), async (req, res) => {
  const { prompt, style } = req.body;
  const enhancedPrompt = style ? `${prompt}, style: ${style}` : prompt;

  const targetUrl = `${AI_GPU_SERVER_URL}/generate-image`;
  req.log.info({ targetUrl, promptLength: prompt.length }, 'Initiating FLUX.1 image generation');

  const formData = new FormData();
  formData.append('prompt', enhancedPrompt);

  const controller = new AbortController();
  // Image generation with FLUX.1 on g5.xlarge usually takes 8-20s, set timeout to 120s
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      req.log.error({ status: response.status, errorText }, 'GPU server returned error during image generation');
      return res.status(response.status === 404 ? 502 : response.status).json({
        success: false,
        error: `فشل توليد الصورة من سيرفر الـ GPU (رمز الخطأ ${response.status})`,
        details: errorText.slice(0, 500),
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      return res.status(502).json({ success: false, error: 'استقبل السيرفر استجابة فارغة من خادم الذكاء الاصطناعي' });
    }

    const fileName = `flux-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.png`;
    const filePath = path.join(aiUploadsDir, fileName);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/api/ai/media/${fileName}`;
    req.log.info({ fileName, sizeBytes: buffer.length }, 'FLUX.1 image generated and stored successfully');

    res.json({
      success: true,
      url: fileUrl,
      fileName,
      prompt,
      sizeBytes: buffer.length,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    req.log.error({ err }, 'FLUX.1 image generation exception');
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'انتهت مهلة الانتظار لتوليد الصورة (استغرق السيرفر وقتاً طويلاً)' });
    }
    return res.status(502).json({
      success: false,
      error: 'تعذر الاتصال بسيرفر كارت الشاشة GPU (تأكد من تشغيل السيرفر من لوحة التحكم)',
      details: err.message,
    });
  }
});

// ─── LTX-Video Image-to-Video Generation ───
router.post('/generate-video', memoryUpload.single('file'), async (req, res) => {
  let imageBuffer = null;
  let originalFilename = 'input.png';

  // 1. Check if file was uploaded directly via multipart
  if (req.file?.buffer) {
    imageBuffer = req.file.buffer;
    originalFilename = req.file.originalname || 'input.png';
  }
  // 2. Check if a base64 string was sent in body
  else if (req.body?.fileBase64) {
    const raw = req.body.fileBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    imageBuffer = Buffer.from(raw, 'base64');
  }
  // 3. Check if an imageUrl / local fileName was sent
  else if (req.body?.imageUrl || req.body?.imageFileName) {
    const rawPath = req.body.imageFileName || req.body.imageUrl;
    const cleanFileName = path.basename(rawPath);
    const localFilePath = path.join(aiUploadsDir, cleanFileName);
    try {
      imageBuffer = await fs.readFile(localFilePath);
      originalFilename = cleanFileName;
    } catch {
      return res.status(400).json({ success: false, error: 'تعذر العثور على ملف الصورة المصدرية المحددة' });
    }
  }

  if (!imageBuffer || !imageBuffer.length) {
    return res.status(400).json({ success: false, error: 'الصورة المصدرية مطلوبة لتوليد الفيديو' });
  }

  const prompt = String(req.body?.prompt || 'cinematic motion, smooth camera movement').trim();
  const negativePrompt = String(req.body?.negative_prompt || req.body?.negativePrompt || '').trim();

  const targetUrl = `${AI_GPU_SERVER_URL}/generate-video`;
  req.log.info({ targetUrl, promptLength: prompt.length, imageBytes: imageBuffer.length }, 'Initiating LTX-Video generation');

  const formData = new FormData();
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  formData.append('file', imageBlob, originalFilename);
  formData.append('prompt', prompt);
  if (negativePrompt) {
    formData.append('negative_prompt', negativePrompt);
  }

  const controller = new AbortController();
  // Video generation on g5.xlarge takes 20-60s, timeout 240s
  const timeoutId = setTimeout(() => controller.abort(), 240000);

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      req.log.error({ status: response.status, errorText }, 'GPU server returned error during video generation');
      return res.status(response.status === 404 ? 502 : response.status).json({
        success: false,
        error: `فشل توليد الفيديو من سيرفر الـ GPU (رمز الخطأ ${response.status})`,
        details: errorText.slice(0, 500),
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const videoBuffer = Buffer.from(arrayBuffer);

    if (!videoBuffer.length) {
      return res.status(502).json({ success: false, error: 'استقبل السيرفر ملف فيديو فارغاً من خادم الذكاء الاصطناعي' });
    }

    const fileName = `ltx-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp4`;
    const filePath = path.join(aiUploadsDir, fileName);
    await fs.writeFile(filePath, videoBuffer);

    const fileUrl = `/api/ai/media/${fileName}`;
    req.log.info({ fileName, sizeBytes: videoBuffer.length }, 'LTX-Video generated and stored successfully');

    res.json({
      success: true,
      url: fileUrl,
      fileName,
      prompt,
      sizeBytes: videoBuffer.length,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    req.log.error({ err }, 'LTX-Video generation exception');
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'انتهت مهلة الانتظار لتوليد الفيديو (استغرق المعالجة وقتاً طويلاً)' });
    }
    return res.status(502).json({
      success: false,
      error: 'تعذر الاتصال بسيرفر كارت الشاشة GPU (تأكد من تشغيل السيرفر من لوحة التحكم)',
      details: err.message,
    });
  }
});

// ─── AI Media Serving (Images & MP4 with Range Support) ───
router.get('/media/:fileName', async (req, res) => {
  const fileName = path.basename(req.params.fileName || '');
  if (!fileName || !/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    return res.status(400).json({ error: 'اسم الملف غير صالح' });
  }

  const filePath = path.join(aiUploadsDir, fileName);
  try {
    await fs.access(filePath);
  } catch {
    return res.status(404).json({ error: 'الملف غير موجود' });
  }

  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  const stat = statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range && ext === '.mp4') {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
    };
    res.writeHead(200, head);
    createReadStream(filePath).pipe(res);
  }
});

// ─── Scout Festival Assistant Chat ───
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

  const conversation = req.body.messages.slice(-8).map(message => ({
    role: message.role,
    content: message.content.trim().slice(-2000),
  }));

  let festivalContext = '';
  try {
    festivalContext = await getFestivalContext();
  } catch (err) {
    req.log.warn({ err }, 'failed to build AI festival context');
  }

  const systemPrompt = [
    'أنت مساعد مهرجان كشفي. أجب بالعربية وبإيجاز عن البرنامج والمسابقات والجدول.',
    'اعتمد فقط على البيانات المرفقة أدناه. إذا كانت المعلومة غير موجودة فيها، قل بوضوح إنك لا تعرف واقترح سؤال الإدارة — لا تخترع مواعيد أو تفاصيل.',
    'إذا سأل المستخدم عن التقارير، اعتمد على عبارة تقرير رسمي مطلوب أو غير مدرجة في كتالوج التقارير الرسمي، ولا تستنتج الاحتياج من نوع المسابقة وحده.',
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
