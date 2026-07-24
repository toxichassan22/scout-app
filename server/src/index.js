import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import leaderboardRoutes from './routes/leaderboard.js';
import newsRoutes from './routes/news.js';
import agendaRoutes from './routes/agenda.js';
import judgeRoutes from './routes/judge.js';
import adminRoutes from './routes/admin.js';
import quizRoutes from './routes/quiz.js';
import reportsRoutes from './routes/reports.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:7860', // Hugging Face default Space port
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) or Hugging Face spaces (*.hf.space)
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.hf.space')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive CORS for Hugging Face multi-client access
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  },
  transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 5000;

// Attach socket server to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Deployment Version Verification Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0-pro',
    latestCommit: '91607b8',
    deployedFeature: 'Instant Auth Redirect & Balanced 50 Genius Quiz Dataset',
    walMode: true
  });
});

app.get('/api/version', (req, res) => {
  res.json({
    commit: '91607b8',
    branch: 'main',
    server: 'Tencent Cloud Ubuntu',
    lastDeploy: new Date().toISOString()
  });
});

// Serve static uploads for reports and media
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/reports', reportsRoutes);

// Health check endpoint for Render monitoring
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Digital Scout Camp API', time: new Date() });
});

// Socket connection handling (optimized for high concurrency)
io.on('connection', (socket) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Socket] Client connected: ${socket.id}`);
  }

  socket.on('join:room', (room) => {
    socket.join(room);
  });

  socket.on('disconnect', () => {
    // Silent disconnects to prevent log flooding under 5000 users
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Digital Scout Camp backend running on port ${PORT}`);
});
