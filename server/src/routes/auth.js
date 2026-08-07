import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { JWT_SECRET, createMemoryRateLimiter } from '../security.js';
import { validate, zString } from '../middleware/validate.js';

const router = Router();

const loginSchema = {
  body: {
    username: zString('اسم المستخدم', { min: 1, max: 80 }),
    password: zString('كلمة السر', { min: 1, max: 256 }),
    deviceId: zString('معرف الجهاز', { max: 200 }).optional(),
    userAgent: zString('وكيل المستخدم', { max: 500 }).optional(),
  },
};

const roleLoginSchema = {
  body: {
    username: zString('اسم المستخدم', { min: 1, max: 80 }),
    password: zString('كلمة السر', { min: 1, max: 256 }),
  },
};
const loginLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.LOGIN_RATE_MAX) || 20,
  keyGenerator: (req) => {
    const user = String(req.body?.username || '').trim().toLowerCase();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return user ? `${user}:${ip}` : ip;
  },
  message: 'محاولات تسجيل دخول كثيرة؛ حاول مرة أخرى لاحقاً',
});
router.use(['/team/login', '/judge/login', '/admin/login'], loginLimiter);

const accountSelect = { id: true, username: true, passwordHash: true, authVersion: true };
const signToken = (claims) => jwt.sign(claims, JWT_SECRET, { algorithm: 'HS256', expiresIn: '24h' });

router.post('/team/login', validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;
    const rawDeviceId = req.body.deviceId || req.headers['x-device-id'];
    const deviceId = typeof rawDeviceId === 'string' ? rawDeviceId.trim() : '';
    if (!deviceId) return res.status(400).json({ error: 'معرف الجهاز مطلوب' });
    const userAgent = String(req.body.userAgent || req.headers['user-agent'] || 'Unknown Device').slice(0, 500);
    const team = await prisma.team.findUnique({ where: { username }, select: { ...accountSelect, label: true, maxDevices: true } });
    if (!team || !(await bcrypt.compare(password, team.passwordHash))) return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });

    let created = false;
    const device = await prisma.$transaction(async tx => {
      const current = await tx.teamDevice.findUnique({ where: { teamId_deviceId: { teamId: team.id, deviceId } } });
      if (current?.revokedAt) throw Object.assign(new Error('revoked'), { status: 401 });
      if (current) return tx.teamDevice.update({ where: { id: current.id }, data: { lastLoginAt: new Date(), userAgent } });
      const count = await tx.teamDevice.count({ where: { teamId: team.id, revokedAt: null } });
      if (count >= team.maxDevices) throw Object.assign(new Error('limit'), { status: 403 });
      created = true;
      return tx.teamDevice.create({ data: { teamId: team.id, deviceId, userAgent } });
    });

    if (created) req.io?.emit('device:registered', { teamId: team.id, username: team.username });
    const token = signToken({ id: team.id, username: team.username, role: 'team', label: team.label, deviceId, deviceName: device.displayName || '', deviceVersion: device.tokenVersion, authVersion: team.authVersion });
    res.json({ token, user: { id: team.id, username: team.username, role: 'team', label: team.label, deviceName: device.displayName || '' } });
  } catch (err) {
    if (err.message === 'limit') return res.status(403).json({ error: 'وصل الفريق للحد الأقصى للأجهزة المسموح بها', maxDevicesReached: true });
    if (err.message === 'revoked') return res.status(401).json({ error: 'تم إلغاء اعتماد هذا الجهاز', forceLogout: true, deviceRevoked: true });
    if (err.statusCode === 400 || err.status === 400) return res.status(400).json({ error: err.message });
    req.log.error({ err }, 'team login failed');
    res.status(500).json({ error: 'خطأ في السيرفر عند تسجيل الدخول' });
  }
});

async function roleLogin(req, res, role) {
  try {
    const { username, password } = req.body;
    const model = role === 'judge' ? prisma.judge : prisma.admin;
    const select = role === 'judge' ? { ...accountSelect, name: true } : accountSelect;
    const account = await model.findUnique({ where: { username }, select });
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) return res.status(401).json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' });
    const user = role === 'judge'
      ? { id: account.id, name: account.name, username: account.username, role }
      : { id: account.id, username: account.username, role };
    res.json({ token: signToken({ ...user, authVersion: account.authVersion }), user });
  } catch (err) {
    if (err.statusCode === 400 || err.status === 400) return res.status(400).json({ error: err.message });
    req.log.error({ err, role }, 'role login failed');
    res.status(500).json({ error: 'خطأ في السيرفر عند تسجيل الدخول' });
  }
}

router.post('/judge/login', validate(roleLoginSchema), (req, res) => roleLogin(req, res, 'judge'));
router.post('/admin/login', validate(roleLoginSchema), (req, res) => roleLogin(req, res, 'admin'));
router.patch('/device-name', authenticateToken, requireRole(['team']), validate({ body: { displayName: zString('اسم الجهاز', { min: 1, max: 80 }) } }), async (req, res) => {
  const device = await prisma.teamDevice.update({
    where: { teamId_deviceId: { teamId: req.user.id, deviceId: req.user.deviceId } },
    data: { displayName: req.body.displayName.trim() },
    select: { id: true, deviceId: true, displayName: true },
  });
  res.json({ success: true, device });
});

router.get('/me', authenticateToken, (req, res) => res.json({ user: req.user }));

export default router;
