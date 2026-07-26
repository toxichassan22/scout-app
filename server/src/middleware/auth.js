import jwt from 'jsonwebtoken';
import prisma from '../db.js';
import { JWT_SECRET } from '../security.js';
const modelByRole = { team: 'team', judge: 'judge', admin: 'admin' };

export async function verifyAuthenticatedUser(token) {
  const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  const modelName = modelByRole[payload.role];
  if (!modelName || !payload.id || !Number.isInteger(payload.authVersion)) throw new Error('invalid_claims');
  const account = await prisma[modelName].findUnique({ where: { id: payload.id }, select: { id: true, authVersion: true } });
  if (!account || account.authVersion !== payload.authVersion) throw new Error('revoked');
  if (payload.role === 'team') {
    if (!payload.deviceId || !Number.isInteger(payload.deviceVersion)) throw new Error('device_required');
    const device = await prisma.teamDevice.findUnique({ where: { teamId_deviceId: { teamId: payload.id, deviceId: payload.deviceId } }, select: { tokenVersion: true, revokedAt: true } });
    if (!device || device.revokedAt || device.tokenVersion !== payload.deviceVersion) throw new Error('device_revoked');
  }
  return payload;
}

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'لم يتم تقديم توكن المصادقة', forceLogout: true });
  try {
    const user = await verifyAuthenticatedUser(token);
    if (user.role === 'team' && req.headers['x-device-id'] && req.headers['x-device-id'] !== user.deviceId) {
      return res.status(401).json({ error: 'معرف الجهاز لا يطابق الجلسة', forceLogout: true, deviceRevoked: true });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || ['invalid_claims', 'revoked', 'device_required', 'device_revoked'].includes(error.message)) {
      return res.status(401).json({ error: 'الجلسة غير صالحة أو تم إلغاؤها', forceLogout: true, deviceRevoked: error.message === 'device_revoked' });
    }
    console.error('[Auth] Database verification failed:', error.message);
    return res.status(503).json({ error: 'تعذر التحقق من حساب المصادقة حالياً' });
  }
};

export const requireRole = allowedRoles => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'غير مصرح لك للقيام بهذا الإجراء' });
  next();
};
