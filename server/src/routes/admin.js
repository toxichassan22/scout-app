import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { createMemoryRateLimiter } from '../security.js';
import coreRouter from './admin/core.js';

const router = Router();
const adminMutationLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.MUTATION_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.ADMIN_MUTATION_RATE_MAX) || 60,
  keyGenerator: req => `${req.ip}:${req.user?.id || 'anonymous'}`,
  message: 'طلبات الإدارة كثيرة؛ حاول مرة أخرى لاحقاً',
});

router.use(authenticateToken);
router.use(requireRole(['admin']));
router.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  return adminMutationLimiter(req, res, next);
});
router.use(coreRouter);

export default router;
