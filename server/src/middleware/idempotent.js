import prisma from '../db.js';

const MAX_KEY_LENGTH = 64;
const TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS) || 24 * 60 * 60 * 1000; // 24h
const IN_PROGRESS_TTL_MS = Number(process.env.IDEMPOTENCY_IN_PROGRESS_TTL_MS) || 60 * 1000; // 60s

function actorId(req) {
  return req.user?.id || req.user?.username || req.ip || 'anonymous';
}

async function cleanupIdempotencyKeys() {
  try {
    const now = new Date();
    const completedCutoff = new Date(now.getTime() - TTL_MS);
    const inProgressCutoff = new Date(now.getTime() - IN_PROGRESS_TTL_MS);
    await prisma.idempotencyKey.deleteMany({
      where: {
        OR: [
          { status: { not: null }, createdAt: { lt: completedCutoff } },
          { status: null, createdAt: { lt: inProgressCutoff } },
        ],
      },
    });
  } catch (err) {
    // logged by callers if needed; cleanup must not crash the server
  }
}

export function startIdempotencyCleanup(intervalMs = 60 * 60 * 1000) {
  const timer = setInterval(cleanupIdempotencyKeys, intervalMs);
  timer.unref?.();
  return timer;
}

export async function purgeIdempotencyKeys() {
  await cleanupIdempotencyKeys();
}

export function idempotent(scope) {
  return async (req, res, next) => {
    const rawKey = req.get('Idempotency-Key');
    if (!rawKey) return next();

    const key = String(rawKey).trim().slice(0, MAX_KEY_LENGTH);
    if (!key) return next();

    const actor = actorId(req);
    const whereUnique = { scope_actorId_key: { scope, actorId: actor, key } };

    async function tryCreate() {
      return prisma.idempotencyKey.create({
        data: { scope, actorId: actor, key, status: null, response: null },
      });
    }

    try {
      // Race-safe create-first: the unique index serializes concurrent requests.
      await tryCreate();
    } catch (err) {
      if (err.code === 'P2002') {
        const existing = await prisma.idempotencyKey.findUnique({ where: whereUnique });
        if (existing && existing.status != null && existing.status >= 200 && existing.status < 300) {
          try {
            const body = existing.response ? JSON.parse(existing.response) : {};
            return res.status(existing.status).json(body);
          } catch (parseErr) {
            req.log?.warn({ parseErr, key }, 'failed to parse cached idempotency response');
            return res.status(existing.status).json({ success: false, error: 'رد مؤقت تالف', requestId: req.requestId, timestamp: new Date().toISOString() });
          }
        }
        const stale = existing && existing.status == null && (Date.now() - new Date(existing.createdAt).getTime()) > IN_PROGRESS_TTL_MS;
        if (stale) {
          try { await prisma.idempotencyKey.delete({ where: whereUnique }); } catch { /* another request finished it */ }
          try {
            await tryCreate();
          } catch (retryErr) {
            if (retryErr.code === 'P2002') {
              return res.status(409).json({ error: 'طلب بنفس مفتاح التكرار قيد التنفيذ' });
            }
            throw retryErr;
          }
        } else {
          return res.status(409).json({ error: 'طلب بنفس مفتاح التكرار قيد التنفيذ' });
        }
      } else {
        throw err;
      }
    }

    res.locals.idempotencyKey = { key, scope, actorId: actor };

    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      const meta = res.locals?.idempotencyKey;
      if (meta && !meta.saved) {
        meta.saved = true;
        const status = res.statusCode;
        try {
          if (status >= 200 && status < 300) {
            await prisma.idempotencyKey.update({
              where: { scope_actorId_key: { scope: meta.scope, actorId: meta.actorId, key: meta.key } },
              data: { status, response: JSON.stringify(body) },
            });
          } else {
            await prisma.idempotencyKey.delete({
              where: { scope_actorId_key: { scope: meta.scope, actorId: meta.actorId, key: meta.key } },
            });
          }
        } catch (saveErr) {
          req.log?.warn({ saveErr, key: meta.key }, 'failed to finalize idempotency key');
        }
      }
      return originalJson(body);
    };

    next();
  };
}
