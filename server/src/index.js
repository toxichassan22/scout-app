import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import 'dotenv/config';

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
import { createCorsOptions, isProduction, requestId, securityHeaders } from './security.js';
import { authenticateSocket, canJoinRoom, startSocketRevocationMonitor } from './middleware/socketAuth.js';
import { joinPublicRealtimeRooms } from './realtime.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const corsOptions = createCorsOptions();

app.disable('x-powered-by');
app.set('trust proxy', isProduction ? 1 : false);
app.use(requestId);
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

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Digital Scout Camp API', time: new Date().toISOString() });
});

app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', checks: { database: 'ok' }, time: new Date().toISOString() });
  } catch (error) {
    console.error(`[Ready] request=${req.requestId}`, error.message);
    res.status(503).json({ status: 'not_ready', checks: { database: 'failed' }, time: new Date().toISOString() });
  }
});

app.get('/api/version', (req, res) => {
  res.json({ branch: process.env.APP_BRANCH || 'main', version: process.env.APP_VERSION || '1.0.0' });
});

// Uploads are private; report routes perform authorization before streaming files.

app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/competitions', competitionsRoutes);

io.on('connection', (socket) => {
  console.info(`[Socket] connected id=${socket.id} role=${socket.user.role} transport=${socket.conn.transport.name}`);
  joinPublicRealtimeRooms(socket);
  const stopRevocationMonitor = startSocketRevocationMonitor(socket);

  socket.on('join:room', async (room, callback) => {
    if (typeof room !== 'string' || room.length > 100 || !/^(admin|judge|leaderboard:participants|team:[^:]+|competition:[^:]+)$/.test(room)) {
      return callback?.({ ok: false, error: 'Invalid room' });
    }
    try {
      if (!(await canJoinRoom(socket, room))) return callback?.({ ok: false, error: 'Forbidden room' });
      await socket.join(room);
      callback?.({ ok: true, room });
    } catch (error) {
      console.error('[Socket] room authorization failed:', error.message);
      callback?.({ ok: false, error: 'Room authorization failed' });
    }
  });

  socket.on('disconnect', (reason) => {
    stopRevocationMonitor();
    console.info(`[Socket] disconnected id=${socket.id} reason=${reason}`);
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
  console.error(`[Request Error] request=${req.requestId}`, error);
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (error.message === 'Origin is not allowed by CORS') return res.status(403).json({ error: 'Origin is not allowed' });
  return res.status(500).json({ error: 'Internal server error', requestId: req.requestId });
});

export { app, server, io };

export async function startServer(port = PORT) {
  await databaseReady;
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      console.log(`[Server] Digital Scout Camp backend running on port ${port}`);
      resolve(server);
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer().catch((error) => {
    console.error('[Server Startup Error]', error);
    process.exitCode = 1;
  });
}
