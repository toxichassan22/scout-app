import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { getAnonymousLeaderboard } from './leaderboard.js';
import { generateFullBackup, deleteFromGoogleDrive } from '../backup-exporter.js';

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
    let teams;
    try {
      teams = await prisma.team.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { members: true, devices: true } }
        }
      });
    } catch (countErr) {
      console.warn('[Admin Teams] Member count relation failed, falling back:', countErr.message);
      teams = await prisma.team.findMany({
        orderBy: { createdAt: 'desc' }
      });
      teams = teams.map(t => ({ ...t, _count: { members: 0, devices: 0 } }));
    }
    res.json(teams);
  } catch (err) {
    console.error('[Admin Teams Error]:', err);
    res.status(500).json({ error: 'فشل في جلب الفرق: ' + (err.message || '') });
  }
});

// Get members of a specific team
router.get('/teams/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params;
    let members = [];
    try {
      members = await prisma.teamMember.findMany({
        where: { teamId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (mErr) {
      console.warn('[Admin Team Members] Table missing or query failed:', mErr.message);
    }
    res.json(members);
  } catch (err) {
    console.error('[Admin Team Members Error]:', err);
    res.status(500).json({ error: 'فشل في جلب أعضاء الفريق: ' + (err.message || '') });
  }
});

// Add member to a team (Admin can exceed 24 limit!)
router.post('/teams/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, role } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'اسم العضو مطلوب' });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name: name.trim(),
        role: role ? role.trim() : 'عضو'
      }
    });

    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في إضافة العضو' });
  }
});

// Delete member from team database
router.delete('/members/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    await prisma.teamMember.delete({
      where: { id: memberId }
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في حذف العضو' });
  }
});

// ─── Team Devices Management ───

// Get registered devices for a team
router.get('/teams/:teamId/devices', async (req, res) => {
  try {
    const { teamId } = req.params;
    const devices = await prisma.teamDevice.findMany({
      where: { teamId },
      orderBy: { lastLoginAt: 'desc' }
    });
    res.json(devices);
  } catch (err) {
    console.error('[Admin Team Devices Error]:', err);
    res.status(500).json({ error: 'فشل في جلب أجهزة الفريق' });
  }
});

// Revoke (delete) a device — frees a slot for a new device
router.delete('/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.teamDevice.findUnique({ where: { id: deviceId } });
    await prisma.teamDevice.delete({
      where: { id: deviceId }
    });

    // Emit real-time event so the revoked device gets force-logged out
    if (req.io && device) {
      req.io.emit('device:revoked', { deviceId: device.id, fingerprint: device.deviceId, teamId: device.teamId });
    }

    res.json({ success: true, message: 'تم إلغاء اعتماد الجهاز بنجاح' });
  } catch (err) {
    console.error('[Revoke Device Error]:', err);
    res.status(500).json({ error: 'فشل في إلغاء اعتماد الجهاز' });
  }
});

// Update device limit for a specific team (Admin can raise/lower from default 24)
router.patch('/teams/:teamId/device-limit', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { maxDevices } = req.body;
    // Note: This requires adding a maxDevices field to Team model in a future migration.
    // For now, the global 24-device limit is enforced in auth.js.
    res.json({ success: true, message: 'حد الأجهزة الافتراضي هو 24 لكل فريق. لتعديله تواصل مع المطور.' });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تحديث حد الأجهزة' });
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
    const deletedId = req.params.id;
    const team = await prisma.team.findUnique({
      where: { id: deletedId },
      include: { reports: true }
    });

    if (team) {
      // 1. Clean local report files for this team
      const uploadsDir = path.join(process.cwd(), 'uploads');
      for (const report of team.reports) {
        if (report.fileUrl) {
          const fileName = path.basename(report.fileUrl);
          const fp = path.join(uploadsDir, fileName);
          if (fs.existsSync(fp)) {
            try { fs.unlinkSync(fp); } catch (_) {}
          }
        }
      }

      // 2. Sync deletion to Google Drive (trash team folder)
      const safeFolderName = `Team_${team.username}_${team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
      deleteFromGoogleDrive('', `03_TEAMS_DATA/${safeFolderName}`, 'delete_folder').catch(() => {});

      // 3. Delete team from DB
      await prisma.team.delete({ where: { id: deletedId } });
    }

    if (req.io) {
      req.io.emit('team:deleted', { teamId: deletedId });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Delete Team Error]:', err);
    res.status(500).json({ error: 'فشل في حذف الفريق' });
  }
});

// Judges CRUD
router.get('/judges', async (req, res) => {
  try {
    let judges = [];
    try {
      judges = await prisma.judge.findMany({ orderBy: { createdAt: 'desc' } });
    } catch (jErr) {
      console.warn('[Admin Judges] Query failed, falling back:', jErr.message);
      judges = await prisma.judge.findMany();
    }
    res.json(judges);
  } catch (err) {
    console.error('[Admin Judges Error]:', err);
    res.status(500).json({ error: 'فشل في جلب المحكمين: ' + (err.message || '') });
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
    let reports = [];
    try {
      reports = await prisma.report.findMany({
        include: { team: true },
        orderBy: { uploadedAt: 'desc' }
      });
    } catch (rErr) {
      console.warn('[Admin Reports] Relation or orderBy failed, falling back:', rErr.message);
      reports = await prisma.report.findMany();
    }
    res.json(reports);
  } catch (err) {
    console.error('[Admin Reports Error]:', err);
    res.status(500).json({ error: 'فشل في جلب التقارير: ' + (err.message || '') });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { team: true }
    });

    if (report) {
      if (report.fileUrl) {
        const fileName = path.basename(report.fileUrl);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const fp = path.join(uploadsDir, fileName);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch (_) {}
        }

        if (report.team) {
          const safeFolderName = `Team_${report.team.username}_${report.team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
          deleteFromGoogleDrive(fileName, `03_TEAMS_DATA/${safeFolderName}/reports`, 'delete_file').catch(() => {});
        }
      }

      await prisma.report.delete({ where: { id: reportId } });
    }

    res.json({ success: true, message: 'تم حذف التقرير والملف بنجاح' });
  } catch (err) {
    console.error('[Delete Report Error]:', err);
    res.status(500).json({ error: 'فشل في حذف التقرير' });
  }
});

// Admin Emergency Freeze / Unfreeze Switch
router.post('/emergency-freeze', async (req, res) => {
  try {
    const { frozen } = req.body;
    await prisma.systemSetting.upsert({
      where: { key: 'EMERGENCY_FREEZE' },
      update: { value: frozen ? 'true' : 'false' },
      create: { key: 'EMERGENCY_FREEZE', value: frozen ? 'true' : 'false' }
    });

    if (req.io) {
      req.io.emit('emergency:freeze', { frozen: !!frozen });
    }

    res.json({ success: true, frozen: !!frozen });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تغيير حالة الطوارئ' });
  }
});

// Admin Clean Slate (Reset Test Data before Event)
router.post('/clean-slate', async (req, res) => {
  try {
    const { confirmPassword } = req.body;
    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });

    if (!admin) {
      return res.status(401).json({ error: 'غير مصرح' });
    }

    const valid = await bcrypt.compare(confirmPassword || '', admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'كلمة السر غير صحيحة لتأكيد التصفير' });
    }

    // Wipe scores, draft answers, quiz sessions, and test reports
    await prisma.$transaction([
      prisma.draftAnswer.deleteMany({}),
      prisma.quizSession.deleteMany({}),
      prisma.score.deleteMany({}),
      prisma.report.deleteMany({})
    ]);

    if (req.io) {
      req.io.emit('leaderboard:update');
      req.io.emit('system:clean-slate');
    }

    res.json({ success: true, message: 'تم تصفير كافة درجات وتجارب الاختبار بنجاح!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في تصفير البيانات التجريبية' });
  }
});

// Admin Backup Trigger Endpoint
router.post('/backup/trigger', async (req, res) => {
  try {
    const result = await generateFullBackup();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'فشل في تشغيل المزامنة والنسخ الاحتياطي' });
  }
});

// Admin Manual Git Pull Deploy Endpoint
router.post('/deploy/git-pull', async (req, res) => {
  const { exec } = await import('child_process');
  try {
    const deployScriptPath = '/var/www/scout-app/deploy.sh';
    exec(`chmod +x ${deployScriptPath} && ${deployScriptPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error('[Deploy Error]:', stderr || error.message);
        return res.status(500).json({ error: 'حدث خطأ أثناء التحديث', details: stderr || error.message });
      }
      res.json({ success: true, message: 'تم سحب وتحديث السيرفر بنجاح من GitHub!', log: stdout });
    });
  } catch (err) {
    res.status(500).json({ error: 'فشل في تشغيل سكريبت النشر' });
  }
});

export default router;
