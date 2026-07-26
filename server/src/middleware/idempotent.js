import prisma from '../db.js';

const MAX_KEY_LENGTH = 64;

export function idempotent(scope) {
  return async (req, res, next) => {
    const rawKey = req.get('Idempotency-Key');
    if (!rawKey) return next();

    const key = String(rawKey).trim().slice(0, MAX_KEY_LENGTH);
    if (!key) return next();

    try {
      const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
      if (existing) {
        const { status, body } = JSON.parse(existing.response);
        return res.status(Number(status || 200)).json(body);
      }
    } catch (err) {
      req.log?.warn({ err, key }, 'failed to lookup idempotency key');
    }

    res.locals.idempotencyKey = { key, scope, actorId: req.user?.id || req.user?.username || 'anonymous' };

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const meta = res.locals?.idempotencyKey;
      if (meta && !meta.saved) {
        meta.saved = true;
        prisma.idempotencyKey.create({
          data: {
            key: meta.key,
            scope: meta.scope,
            actorId: meta.actorId,
            response: JSON.stringify({ status: res.statusCode, body }),
          },
        }).catch((err) => {
          req.log?.warn({ err, key: meta.key }, 'failed to save idempotency key');
        });
      }
      return originalJson(body);
    };

    next();
  };
}
