import express, { Router } from 'express';
import 'express-async-errors';
import http from 'http';
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
import prisma, { databaseReady } from './db.js';
import { ensureTeamStandings } from './teamStanding.js';
import { createCorsOptions, createMemoryRateLimiter, isProduction, requestId, securityHeaders } from './security.js';
import { authenticateSocket, canJoinRoom, startSocketRevocationMonitor } from './middleware/socketAuth.js';
import { joinPublicRealtimeRooms } from './realtime.js';

const app = express();
const server = http.createServer(app);
const corsOptions = createCorsOptions();

app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : false);
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
app.use(express.json({ limit: `${Number(process.env.JSON_BODY_LIMIT_BYTES) || 12 * 1024 * 1024}b`, strict: true }));
app.use(express.urlencoded({ limit: `${Number(process.env.URLENCODED_BODY_LIMIT_BYTES) || 12 * 1024 * 1024}b`, extended: false, parameterLimit: 1000 }));

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: Number(process.env.SOCKET_MAX_BUFFER_BYTES) || 12 * 1024 * 1024,
});
io.use(authenticateSocket);

const PORT = process.env.PORT || 5000;

const apiLimiter = createMemoryRateLimiter({
  windowMs: Number(process.env.API_RATE_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.API_RATE_MAX) || 120,
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown',
  message: 'طلبات كثيرة؛ حاول مرة أخرى لاحقاً',
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const healthRouter = Router();
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Digital Scout Camp API', requestId: req.requestId, time: new Date().toISOString() });
});
healthRouter.get('/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', checks: { database: 'ok' }, requestId: req.requestId, time: new Date().toISOString() });
  } catch (error) {
    req.log.error({ error }, 'readiness check failed');
    res.status(503).json({ status: 'not_ready', checks: { database: 'failed' }, requestId: req.requestId, time: new Date().toISOString() });
  }
});
healthRouter.get('/version', (req, res) => {
  res.json({ branch: process.env.APP_BRANCH || 'main', version: process.env.APP_VERSION || '1.0.0' });
});
app.use('/api', healthRouter);
app.use('/api/v1', healthRouter);

// Uploads are private; report routes perform authorization before streaming files.

app.use('/api', apiLimiter);

const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/leaderboard', leaderboardRoutes);
apiRouter.use('/news', newsRoutes);
apiRouter.use('/agenda', agendaRoutes);
apiRouter.use('/judge', judgeRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/quiz', quizRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/competitions', competitionsRoutes);
app.use('/api', apiRouter);
app.use('/api/v1', apiRouter);

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

export async function startServer(port = PORT) {
  await databaseReady;
  try {
    await ensureTeamStandings();
  } catch (err) {
    logger.warn({ err }, 'failed to seed team standings on startup');
  }
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

if (!process.env.SCOUT_NO_AUTOSTART) {
  startServer().catch((error) => {
    logger.fatal(error, 'server startup failed');
    process.exitCode = 1;
  });
}
