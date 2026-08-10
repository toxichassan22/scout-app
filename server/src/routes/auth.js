import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { JWT_SECRET, createMemoryRateLimiter } from '../security.js';
import { validate, zString } from '../middleware/validate.js';
import { SCOUT_ROLES } from '../validation.js';
import { z } from 'zod';

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
    let reactivated = false;
    const device = await prisma.$transaction(async tx => {
      const current = await tx.teamDevice.findUnique({ where: { teamId_deviceId: { teamId: team.id, deviceId } } });
      if (current?.revokedAt) {
        // Revocation frees a slot but does not permanently blacklist the browser. If
        // the same device returns and a slot is available, reactivate it as a fresh
        // registration and ask for the person's identity again.
        const activeCount = await tx.teamDevice.count({ where: { teamId: team.id, revokedAt: null } });
        if (activeCount >= team.maxDevices) throw Object.assign(new Error('limit'), { status: 403 });
        reactivated = true;
        return tx.teamDevice.update({
          where: { id: current.id },
          data: {
            revokedAt: null,
            tokenVersion: { increment: 1 },
            displayName: '',
            role: '',
            lastLoginAt: new Date(),
            userAgent,
          },
        });
      }
      if (current) return tx.teamDevice.update({ where: { id: current.id }, data: { lastLoginAt: new Date(), userAgent } });
      // A device seen for the first time has no person attached to it yet; the client
      // blocks on the identity form until deviceName and deviceRole come back filled.
      const count = await tx.teamDevice.count({ where: { teamId: team.id, revokedAt: null } });
      if (count >= team.maxDevices) throw Object.assign(new Error('limit'), { status: 403 });
      created = true;
      return tx.teamDevice.create({ data: { teamId: team.id, deviceId, userAgent } });
    });

    if (created || reactivated) req.io?.emit('device:registered', { teamId: team.id, username: team.username, deviceId, reactivated });
    const token = signToken({ id: team.id, username: team.username, role: 'team', label: team.label, deviceId, deviceName: device.displayName || '', deviceRole: device.role || '', deviceVersion: device.tokenVersion, authVersion: team.authVersion });
    res.json({ token, user: { id: team.id, username: team.username, role: 'team', label: team.label, deviceName: device.displayName || '', deviceRole: device.role || '' } });
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
// Who is using this device. Required before a team member can use the app, so the
// admin and the group activities show real people instead of "device 3".
const identitySchema = {
  body: {
    displayName: zString('الاسم', { min: 2, max: 80 }),
    role: z.enum(SCOUT_ROLES, { errorMap: () => ({ message: 'الصفة غير صالحة' }) }),
  },
};
router.patch('/device-identity', authenticateToken, requireRole(['team']), validate(identitySchema), async (req, res) => {
  const displayName = req.body.displayName.trim();
  const role = req.body.role;

  // This is a first-registration endpoint, not a profile editor. updateMany makes
  // the lock atomic: two tabs cannot race and overwrite the identity after the first
  // successful save. Existing pre-feature devices with one missing field can finish
  // registration once; a complete identity is immutable for the team user.
  const updated = await prisma.teamDevice.updateMany({
    where: {
      teamId: req.user.id,
      deviceId: req.user.deviceId,
      OR: [{ displayName: '' }, { role: '' }],
    },
    data: { displayName, role },
  });
  if (updated.count === 0) {
    return res.status(409).json({
      success: false,
      code: 'IDENTITY_LOCKED',
      error: 'تم تسجيل الاسم والصفة من قبل؛ تعديلهما متاح للإدارة فقط',
    });
  }

  const device = await prisma.teamDevice.findUnique({
    where: { teamId_deviceId: { teamId: req.user.id, deviceId: req.user.deviceId } },
    select: { id: true, deviceId: true, displayName: true, role: true },
  });
  res.json({ success: true, device, deviceName: device.displayName, deviceRole: device.role });
});

router.get('/roles', (req, res) => res.json({ roles: SCOUT_ROLES }));

router.get('/me', authenticateToken, async (req, res) => {
  // The token is issued at login, so for a team it still carries the device identity
  // as it was then. Reading the row keeps a reload from re-prompting someone who has
  // already filled the form.
  if (req.user.role !== 'team') return res.json({ user: req.user });
  const device = await prisma.teamDevice.findUnique({
    where: { teamId_deviceId: { teamId: req.user.id, deviceId: req.user.deviceId } },
    select: { displayName: true, role: true },
  });
  res.json({ user: { ...req.user, deviceName: device?.displayName || '', deviceRole: device?.role || '' } });
});

export default router;
