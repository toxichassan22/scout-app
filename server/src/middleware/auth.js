import jwt from 'jsonwebtoken';
import prisma from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'digital_scout_camp_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'لم يتم تقديم توكن المصادقة', forceLogout: true });
  }

  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'التوكن غير صالح أو انتهت صلاحيته', forceLogout: true });
    }

    try {
      if (user.role === 'team') {
        const team = await prisma.team.findUnique({ where: { id: user.id } });
        if (!team) {
          return res.status(401).json({ error: 'تم حذف هذا الفريق من قاعدة البيانات', forceLogout: true });
        }
      } else if (user.role === 'judge') {
        const judge = await prisma.judge.findUnique({ where: { id: user.id } });
        if (!judge) {
          return res.status(401).json({ error: 'تم حذف حساب المحكم هذا', forceLogout: true });
        }
      } else if (user.role === 'admin') {
        const admin = await prisma.admin.findUnique({ where: { id: user.id } });
        if (!admin) {
          return res.status(401).json({ error: 'حساب الأدمن غير موجود', forceLogout: true });
        }
      }

      req.user = user;
      next();
    } catch (dbErr) {
      req.user = user;
      next();
    }
  });
};

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'غير مصرح لك للقيام بهذا الإجراء' });
    }
    next();
  };
};
