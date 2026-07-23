import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getAnonymousLeaderboard } from './leaderboard.js';

const router = Router();

// Apply admin authentication to all admin endpoints
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Full Leaderboard (with internal team labels)
router.get('/leaderboard', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        scores: {
          include: { competition: true }
        }
      }
    });

    const leaderboard = teams.map(team => {
      const totalScore = team.scores.reduce((acc, curr) => acc + (curr.total || 0), 0);
      return {
        id: team.id,
        label: team.label,
        username: team.username,
        totalScore: Math.round(totalScore * 10) / 10,
        scores: team.scores
      };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    res.json(leaderboard);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في جلب الترتيب التفصيلي' });
  }
});

// Teams CRUD
router.get('/teams', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب الفرق' });
  }
});

router.post('/teams', async (req, res) => {
  try {
    const { username, password, label } = req.body;
    if (!username || !password || !label) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const team = await prisma.team.create({
      data: { username, passwordHash, label }
    });

    res.status(201).json(team);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'فشل في إنشاء الفريق (ربما اسم المستخدم مكرر)' });
  }
});

router.post('/teams/import', async (req, res) => {
  try {
    const { teams } = req.body; // Array of { username, password, label }
    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: 'قائمة الفرق غير صالحة' });
    }

    const created = [];
    for (const item of teams) {
      if (item.username && item.password && item.label) {
        const passwordHash = await bcrypt.hash(item.password, 10);
        try {
          const t = await prisma.team.create({
            data: { username: item.username, passwordHash, label: item.label }
          });
          created.push(t);
        } catch (e) {
          // ignore duplicates in batch
        }
      }
    }

    res.json({ success: true, count: created.length });
  } catch (err) {
    res.status(500).json({ error: 'فشل في استيراد الفرق' });
  }
});

router.delete('/teams/:id', async (req, res) => {
  try {
    await prisma.team.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف الفريق' });
  }
});

// Judges CRUD
router.get('/judges', async (req, res) => {
  try {
    const judges = await prisma.judge.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(judges);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب المحكمين' });
  }
});

router.post('/judges', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const judge = await prisma.judge.create({
      data: { name, username, passwordHash }
    });

    res.status(201).json(judge);
  } catch (err) {
    res.status(400).json({ error: 'فشل في إنشاء المحكم (اسم المستخدم مكرر)' });
  }
});

router.delete('/judges/:id', async (req, res) => {
  try {
    await prisma.judge.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف المحكم' });
  }
});

// Competitions & Passcodes
router.get('/competitions', async (req, res) => {
  try {
    const comps = await prisma.competition.findMany({
      include: { questions: true }
    });
    res.json(comps);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب المسابقات' });
  }
});

router.post('/competitions', async (req, res) => {
  try {
    const { name, type, criteria } = req.body;
    const comp = await prisma.competition.create({
      data: {
        name,
        type: type || 'auto_digital',
        criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria || [])
      }
    });
    res.status(201).json(comp);
  } catch (err) {
    res.status(500).json({ error: 'فشل في إنشاء المسابقة' });
  }
});

router.patch('/competitions/:id', async (req, res) => {
  try {
    const { isOpen, name, criteria } = req.body;
    const comp = await prisma.competition.update({
      where: { id: req.params.id },
      data: {
        ...(isOpen !== undefined && { isOpen }),
        ...(name && { name }),
        ...(criteria && { criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria) })
      }
    });

    if (isOpen === false && req.io) {
      req.io.emit('judge:session:closed', { competitionId: comp.id });
    }

    res.json(comp);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث المسابقة' });
  }
});

router.post('/competitions/:id/passcode', async (req, res) => {
  try {
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const comp = await prisma.competition.update({
      where: { id: req.params.id },
      data: { passcode: randomCode, isOpen: true }
    });
    res.json({ passcode: comp.passcode });
  } catch (err) {
    res.status(500).json({ error: 'فشل في توليد كود المسابقة' });
  }
});

// Questions CRUD
router.post('/questions', async (req, res) => {
  try {
    const { competitionId, text, options, correctOption, points } = req.body;
    const q = await prisma.question.create({
      data: {
        competitionId,
        text,
        options: typeof options === 'string' ? options : JSON.stringify(options),
        correctOption: parseInt(correctOption),
        points: parseFloat(points || 10)
      }
    });
    res.status(201).json(q);
  } catch (err) {
    res.status(500).json({ error: 'فشل في إضافة السؤال' });
  }
});

router.delete('/questions/:id', async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف السؤال' });
  }
});

// Score Override (Admin Audit)
router.patch('/scores/:id', async (req, res) => {
  try {
    const { total } = req.body;
    const adminId = req.user.id;

    const score = await prisma.score.update({
      where: { id: req.params.id },
      data: {
        total: parseFloat(total),
        editedByAdminId: adminId,
        editedAt: new Date()
      }
    });

    if (req.io) {
      const leaderboardData = await getAnonymousLeaderboard();
      req.io.emit('leaderboard:update', leaderboardData);
    }

    res.json(score);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تعديل الدرجة' });
  }
});

// News Management
router.post('/news', async (req, res) => {
  try {
    const { title, body, photoUrl } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
    }

    const news = await prisma.news.create({
      data: {
        title,
        body,
        photoUrl: photoUrl || null,
        createdByAdminId: req.user.id
      }
    });

    if (req.io) {
      req.io.emit('news:published', news);
    }

    res.status(201).json(news);
  } catch (err) {
    res.status(500).json({ error: 'فشل في نشر الخبر' });
  }
});

router.delete('/news/:id', async (req, res) => {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });
    
    if (req.io) {
      req.io.emit('news:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف الخبر' });
  }
});

// Agenda Management
router.post('/agenda', async (req, res) => {
  try {
    const { title, type, zoneId, startTime, endTime, description } = req.body;
    const item = await prisma.agendaItem.create({
      data: { title, type, zoneId, startTime, endTime, description }
    });

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'فشل في إضافة الفعالية' });
  }
});

router.delete('/agenda/:id', async (req, res) => {
  try {
    await prisma.agendaItem.delete({ where: { id: req.params.id } });
    
    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل في حذف الفعالية' });
  }
});

router.put('/agenda/:id', async (req, res) => {
  try {
    const { title, type, zoneId, startTime, endTime, description } = req.body;
    const item = await prisma.agendaItem.update({
      where: { id: req.params.id },
      data: { title, type, zoneId, startTime, endTime, description }
    });

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تعديل الفعالية' });
  }
});

// Reports Management
router.get('/reports', async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: { team: true },
      orderBy: { uploadedAt: 'desc' }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب التقارير' });
  }
});

export default router;
