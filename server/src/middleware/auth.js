import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'digital_scout_camp_secret_key_2026';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'لم يتم تقديم توكن المصادقة' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'التوكن غير صالح أو انتهت صلاحيته' });
    }
    req.user = user;
    next();
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
