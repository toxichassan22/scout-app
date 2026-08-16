import { Router } from 'express';
import prisma from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { idempotent } from '../middleware/idempotent.js';
import { validate, zString } from '../middleware/validate.js';
import { createMemoryRateLimiter } from '../security.js';
import { sendWhatsAppSupportMessage } from '../whatsapp.js';

const router = Router();
const supportLimiter = createMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.SUPPORT_RATE_MAX) || 5,
  keyGenerator: req => `${req.user?.id || 'unknown'}:${req.user?.deviceId || req.ip || 'unknown'}`,
  message: 'تم تجاوز حد رسائل الدعم؛ حاول مرة أخرى لاحقاً',
});

const supportSchema = {
  body: {
    category: zString('تصنيف الرسالة', { min: 1, max: 80 }),
    message: zString('محتوى الرسالة', { min: 1, max: 2000 }),
  },
};

router.post('/whatsapp', requireRole(['team']), supportLimiter, idempotent('support:whatsapp'), validate(supportSchema), async (req, res) => {
  const category = req.body.category.trim();
  const message = req.body.message.trim();
  try {
    const [team, device] = await Promise.all([
      prisma.team.findUnique({ where: { id: req.user.id }, select: { username: true, label: true } }),
      prisma.teamDevice.findUnique({
        where: { teamId_deviceId: { teamId: req.user.id, deviceId: req.user.deviceId } },
        select: { displayName: true, role: true },
      }),
    ]);
    if (!team) return res.status(404).json({ success: false, error: 'الفريق غير موجود' });

    const text = [
      '📩 *رسالة دعم جديدة من الموقع*',
      '',
      `*الفريق:* ${team.label || team.username}`,
      `*اسم المستخدم:* ${team.username}`,
      `*اسم الشخص:* ${device?.displayName || req.user.deviceName || 'غير محدد'}`,
      `*الصفة:* ${device?.role || req.user.deviceRole || 'غير محددة'}`,
      `*التصنيف:* ${category}`,
      '',
      `*محتوى الرسالة:*
${message}`,
    ].join('\n');

    await sendWhatsAppSupportMessage(text);
    return res.json({ success: true, message: 'تم إرسال رسالة الدعم إلى فريق واتساب بنجاح' });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ success: false, code: error.code, error: error.message });
    req.log.error({ err: error, teamId: req.user.id }, 'support WhatsApp route failed');
    return res.status(500).json({ success: false, error: 'تعذر إرسال رسالة الدعم حالياً' });
  }
});

export default router;
