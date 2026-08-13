import express, { Router } from 'express';
import 'express-async-errors';
import http from 'http';
import crypto from 'node:crypto';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';
import pinoHttp from 'pino-http';

import logger from './logger.js';
import authRoutes from './routes/auth.js';
import leaderboardRoutes from './routes/leaderboard.js';
import newsRoutes from './routes/news.js';
import agendaRoutes from './routes/agenda.js';
import judgeRoutes from './routes/judge.js';
import adminRoutes from './routes/admin.js';
import quizRoutes from './routes/quiz.js';
import reportsRoutes from './routes/reports.js';
import competitionsRoutes from './routes/competitions.js';
import activitiesRoutes from './routes/activities.js';
import aiRoutes from './routes/ai.js';
import prisma, { databaseReady } from './db.js';
import { ensureTeamStandings } from './teamStanding.js';
import { finalizeExpiredSessions } from './quizService.js';
import { ensureActivityCatalog } from './activityService.js';
import { startGithubBackupWorker, stopGithubBackupWorker } from './githubBackup.js';
import { purgeIdempotencyKeys, startIdempotencyCleanup } from './middleware/idempotent.js';
import { startUploadWorkers } from './backup-exporter.js';
import { createCorsOptions, createMemoryRateLimiter, requestId, securityHeaders, subjectId } from './security.js';
import { authenticateToken } from './middleware/auth.js';
import { authenticateSocket, canJoinRoom, startSocketRevocationMonitor } from './middleware/socketAuth.js';
import { joinPublicRealtimeRooms } from './realtime.js';

const app = express();
const server = http.createServer(app);
const corsOptions = createCorsOptions();

app.disable('x-powered-by');
const trustProxyValue = process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false;
app.set('trust proxy', Number.isFinite(trustProxyValue) && trustProxyValue > 0 ? trustProxyValue : false);
app.use(requestId);
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.requestId,
  autoLogging: { ignore: (req) => req.url === '/api/health' },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
}));
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(express.json({ limit: `${Number(process.env.JSON_BODY_LIMIT_BYTES) || 75 * 1024 * 1024}b`, strict: true }));
app.use(express.urlencoded({ limit: `${Number(process.env.URLENCODED_BODY_LIMIT_BYTES) || 75 * 1024 * 1024}b`, extended: false, parameterLimit: 1000 }));

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: Number(process.env.SOCKET_MAX_BUFFER_BYTES) || 75 * 1024 * 1024,
});
io.use(authenticateSocket);

const PORT = process.env.PORT || 5000;

const apiLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.API_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.API_RATE_MAX) || 120,
  keyGenerator: (req) => subjectId(req),
  message: 'طلبات كثيرة؛ حاول مرة أخرى لاحقاً',
});

const publicApiLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.API_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.API_PUBLIC_RATE_MAX) || 600,
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  message: 'طلبات كثيرة؛ حاول مرة أخرى لاحقاً',
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const healthRouter = Router();
healthRouter.use(publicApiLimiter);
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Digital Scout Camp API', requestId: req.requestId, time: new Date().toISOString() });
});

let readyCache = null;
let readyCacheAt = 0;
const READY_CACHE_MS = 5000;

function requireReadinessToken(req, res, next) {
  const expected = String(process.env.READINESS_TOKEN || '').trim();
  if (!expected) return next(); // bypass in dev if not configured
  // WARNING: when READINESS_TOKEN is set, health probes must include the
  // x-readiness-token header or call /api/health instead, otherwise they will 403.
  const provided = req.headers['x-readiness-token'];
  if (typeof provided !== 'string' || provided.length !== expected.length) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  } catch {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

healthRouter.get('/ready', requireReadinessToken, async (req, res) => {
  const now = Date.now();
  if (readyCache && now - readyCacheAt < READY_CACHE_MS) {
    if (readyCache.ok) return res.json({ status: 'ready', checks: { database: 'ok' }, requestId: req.requestId, time: new Date().toISOString() });
    return res.status(503).json({ status: 'not_ready', checks: { database: 'failed' }, requestId: req.requestId, time: new Date().toISOString() });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    readyCache = { ok: true };
    readyCacheAt = now;
    res.json({ status: 'ready', checks: { database: 'ok' }, requestId: req.requestId, time: new Date().toISOString() });
  } catch (error) {
    req.log.error({ error }, 'readiness check failed');
    readyCache = { ok: false };
    readyCacheAt = now;
    res.status(503).json({ status: 'not_ready', checks: { database: 'failed' }, requestId: req.requestId, time: new Date().toISOString() });
  }
});
healthRouter.get('/version', (req, res) => {
  res.json({ status: 'ok', version: process.env.APP_VERSION || '1.0.0' });
});
app.use('/api', healthRouter);
app.use('/api/v1', healthRouter);

// Public authentication endpoints carry their own limiters.
app.use('/api/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// Protected API routes: rate-limit by IP before auth to prevent DB flooding with invalid tokens,
// then authenticate, then apply per-user rate limiter.
const protectedApiRouter = Router();
protectedApiRouter.use(publicApiLimiter);
protectedApiRouter.use(authenticateToken);
protectedApiRouter.use(apiLimiter);
protectedApiRouter.use('/leaderboard', leaderboardRoutes);
protectedApiRouter.use('/news', newsRoutes);
protectedApiRouter.use('/agenda', agendaRoutes);
protectedApiRouter.use('/judge', judgeRoutes);
protectedApiRouter.use('/admin', adminRoutes);
protectedApiRouter.use('/quiz', quizRoutes);
protectedApiRouter.use('/reports', reportsRoutes);
protectedApiRouter.use('/competitions', competitionsRoutes);
protectedApiRouter.use('/activities', activitiesRoutes);
protectedApiRouter.use('/ai', aiRoutes);
app.use('/api', protectedApiRouter);
app.use('/api/v1', protectedApiRouter);

io.on('connection', (socket) => {
  socket.log = logger.child({ socketId: socket.id, role: socket.user?.role, userId: socket.user?.id });
  socket.log.info({ transport: socket.conn.transport.name }, 'socket connected');
  joinPublicRealtimeRooms(socket);
  const stopRevocationMonitor = startSocketRevocationMonitor(socket);

  socket.on('join:room', async (room, callback) => {
    if (typeof room !== 'string' || room.length > 100 || !/^(admin|judge|leaderboard:participants|team:[^:]+|competition:[^:]+)$/.test(room)) {
      return callback?.({ ok: false, error: 'Invalid room' });
    }
    try {
      if (!(await canJoinRoom(socket, room))) return callback?.({ ok: false, error: 'Forbidden room' });
      await socket.join(room);
      socket.log.info({ room }, 'socket joined room');
      callback?.({ ok: true, room });
    } catch (error) {
      socket.log.error({ error, room }, 'room authorization failed');
      callback?.({ ok: false, error: 'Room authorization failed' });
    }
  });

  socket.on('disconnect', (reason) => {
    stopRevocationMonitor();
    socket.log.info({ reason }, 'socket disconnected');
  });
});

app.use((req, res) => res.status(404).json({ success: false, error: 'Not found', requestId: req.requestId, timestamp: new Date().toISOString() }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.statusCode || error.status || (error.message === 'Origin is not allowed by CORS' ? 403 : 500);
  const expose = status < 500 ? error.message : 'Internal server error';
  (req.log || logger).error({ err: error, path: req.path, method: req.method, status }, 'request error');
  if (error.type === 'entity.too.large') return res.status(413).json({ success: false, error: 'Payload too large', requestId: req.requestId, timestamp: new Date().toISOString() });
  if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ success: false, error: 'Origin is not allowed', requestId: req.requestId, timestamp: new Date().toISOString() });
  return res.status(status).json({ success: false, error: expose, details: error.details, requestId: req.requestId, timestamp: new Date().toISOString() });
});

export { app, server, io };

let finalizeInterval;
let idempotencyTimer;

export async function startServer(port = PORT) {
  await databaseReady;
  try {
    await ensureTeamStandings();
  } catch (err) {
    logger.warn({ err }, 'failed to seed team standings on startup');
  }
  try {
    await prisma.agendaItem.updateMany({
      where: { title: { contains: 'نصب المرصد' } },
      data: { title: 'نصب المعرض' },
    });
    await prisma.competition.updateMany({
      where: { name: { contains: 'نصب المرصد' } },
      data: { name: 'نصب المعرض' },
    });
  } catch (err) {
    logger.warn({ err }, 'failed to rename نصب المرصد');
  }
  try {
    await ensureActivityCatalog();
  } catch (err) {
    logger.warn({ err }, 'failed to seed activity catalog on startup');
  }
  try {
    await purgeIdempotencyKeys();
    idempotencyTimer = startIdempotencyCleanup();
  } catch (err) {
    logger.warn({ err }, 'failed to start idempotency cleanup');
  }
  try {
    await prisma.pendingUpload.updateMany({
      where: { status: 'processing' },
      data: { status: 'pending', leasedUntil: null },
    });
  } catch (err) {
    logger.warn({ err }, 'failed to reset upload queue on startup');
  }
  try {
    startUploadWorkers();
  } catch (err) {
    logger.warn({ err }, 'failed to start upload workers');
  }
  startGithubBackupWorker();
  const FINALIZE_INTERVAL_MS = Number(process.env.FINALIZE_EXPIRED_SESSIONS_MS) || 30_000;
  finalizeInterval = setInterval(async () => {
    try {
      await finalizeExpiredSessions();
    } catch (err) {
      logger.warn({ err }, 'expired session finalizer failed');
    }
  }, FINALIZE_INTERVAL_MS);
  finalizeInterval.unref?.();
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      logger.info({ port }, 'Digital Scout Camp backend running');
      resolve(server);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

process.on('unhandledRejection', (reason) => {
  logger.fatal(reason, 'unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal(error, 'uncaught exception');
  process.exit(1);
});

async function shutdown(signal) {
  logger.info({ signal }, 'graceful shutdown started');
  if (finalizeInterval) clearInterval(finalizeInterval);
  if (idempotencyTimer) clearInterval(idempotencyTimer);
  stopGithubBackupWorker();

  const forceExit = setTimeout(() => {
    logger.error('graceful shutdown timed out; forcing connections closed');
    server.closeAllConnections?.();
    process.exit(1);
  }, 10000).unref?.();

  const finishShutdown = async () => {
    clearTimeout(forceExit);
    try { io?.close?.(); } catch (err) { logger.error({ err }, 'socket.io close error'); }
    try { await prisma.$disconnect(); } catch (e) { logger.error({ e }, 'prisma disconnect error'); }
    process.exit(0);
  };

  if (server.listening) {
    server.close(async (err) => {
      if (err) logger.error({ err }, 'server close error');
      await finishShutdown();
    });
  } else {
    await finishShutdown();
  }
}

['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

if (!process.env.SCOUT_NO_AUTOSTART) {
  startServer().catch((error) => {
    logger.fatal(error, 'server startup failed');
    process.exitCode = 1;
  });
}
