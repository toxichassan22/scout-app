import fs from 'fs';
import path from 'path';
import { emitLeaderboardUpdate } from '../../realtime.js';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import prisma from '../../db.js';
import { getAnonymousLeaderboard, clearLeaderboardCache } from '../leaderboard.js';
import { generateFullBackup, deleteFromGoogleDrive } from '../../backup-exporter.js';
import { boundedString, strongPassword } from '../../validation.js';
import { validate, zString, zId, zNumber, zBoolean } from '../../middleware/validate.js';
import { z } from 'zod/v3';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const router = Router();

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeJudgeSelect = { id: true, name: true, username: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, criteria: true, createdAt: true };

// Full Leaderboard (with internal team labels)
router.get('/leaderboard', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [teams, total] = await Promise.all([
      prisma.team.findMany({
        select: { ...safeTeamSelect, scores: { include: { competition: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.team.count(),
    ]);

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
    res.json(paginatedResponse({ data: leaderboard, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin leaderboard failed');
    res.status(500).json({ success: false, error: 'فشل في جلب الترتيب التفصيلي', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Teams CRUD
router.get('/teams', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    let teams;
    let total;
    try {
      [teams, total] = await Promise.all([
        prisma.team.findMany({
          orderBy: { createdAt: 'desc' },
          select: { ...safeTeamSelect, _count: { select: { members: true, devices: true } } },
          skip,
          take: limit,
        }),
        prisma.team.count(),
      ]);
    } catch (countErr) {
      req.log.warn({ countErr }, 'admin teams count relation failed, falling back');
      [teams, total] = await Promise.all([
        prisma.team.findMany({ orderBy: { createdAt: 'desc' }, select: safeTeamSelect, skip, take: limit }),
        prisma.team.count(),
      ]);
      teams = teams.map(t => ({ ...t, _count: { members: 0, devices: 0 } }));
    }
    res.json(paginatedResponse({ data: teams, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin teams query failed');
    res.status(500).json({ success: false, error: 'فشل في جلب الفرق: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Get members of a specific team
router.get('/teams/:teamId/members', validate({ params: { teamId: zId('الفريق') } }), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const where = { teamId };
    const [members, total] = await Promise.all([
      prisma.teamMember.findMany({ where, orderBy: { createdAt: 'asc' }, skip, take: limit }),
      prisma.teamMember.count({ where }),
    ]).catch(err => {
      req.log.warn({ err }, 'admin team members query failed');
      return [[], 0];
    });
    res.json(paginatedResponse({ data: members, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin team members failed');
    res.status(500).json({ success: false, error: 'فشل في جلب أعضاء الفريق: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Add member to a team (Admin can exceed 24 limit!)
const addMemberSchema = { params: { teamId: zId('الفريق') }, body: { name: zString('الاسم', { min: 1, max: 120 }), role: zString('الدور', { min: 1, max: 80 }).optional() } };
router.post('/teams/:teamId/members', validate(addMemberSchema), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, role } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 120 });
    const cleanRole = role === undefined ? 'عضو' : boundedString(role, 'role', { min: 1, max: 80 });

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name: cleanName,
        role: cleanRole
      }
    });

    res.status(201).json(member);
  } catch (err) {
    req.log.error({ err }, 'admin add member failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة العضو', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Delete member from team database
router.delete('/members/:memberId', validate({ params: { memberId: zId('العضو') } }), async (req, res) => {
  try {
    const { memberId } = req.params;
    await prisma.teamMember.delete({
      where: { id: memberId }
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete member failed');
    res.status(500).json({ success: false, error: 'فشل في حذف العضو', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// ─── Team Devices Management ───

// Get registered devices for a team
router.get('/teams/:teamId/devices', validate({ params: { teamId: zId('الفريق') } }), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const where = { teamId };
    const [devices, total] = await Promise.all([
      prisma.teamDevice.findMany({ where, orderBy: { lastLoginAt: 'desc' }, skip, take: limit }),
      prisma.teamDevice.count({ where }),
    ]);
    res.json(paginatedResponse({ data: devices, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin team devices failed');
    res.status(500).json({ success: false, error: 'فشل في جلب أجهزة الفريق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Revoke (delete) a device — frees a slot for a new device
router.delete('/devices/:deviceId', validate({ params: { deviceId: zId('الجهاز') } }), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.teamDevice.findUnique({ where: { id: deviceId } });
    if (!device) return res.status(404).json({ error: 'الجهاز غير موجود' });
    await prisma.teamDevice.update({
      where: { id: deviceId },
      data: { revokedAt: new Date(), tokenVersion: { increment: 1 } }
    });

    // Emit real-time event so the revoked device gets force-logged out
    if (req.io && device) {
      req.io.to(`team:${device.teamId}`).emit('device:revoked', { deviceId: device.id, fingerprint: device.deviceId, teamId: device.teamId });
      req.io.to('admin').emit('device:revoked', { deviceId: device.id, fingerprint: device.deviceId, teamId: device.teamId });
    }

    res.json({ success: true, message: 'تم إلغاء اعتماد الجهاز بنجاح' });
  } catch (err) {
    req.log.error({ err }, 'admin revoke device failed');
    res.status(500).json({ success: false, error: 'فشل في إلغاء اعتماد الجهاز', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Update device limit for a specific team (Admin can raise/lower from default 24)
const deviceLimitSchema = { params: { teamId: zId('الفريق') }, body: { maxDevices: zNumber('حد الأجهزة', { min: 1, max: 1000, int: true }) } };
router.patch('/teams/:teamId/device-limit', validate(deviceLimitSchema), async (req, res) => {
  try {
    const { maxDevices } = req.body;
    const team = await prisma.team.update({ where: { id: req.params.teamId }, data: { maxDevices }, select: safeTeamSelect });
    res.json({ success: true, team });
  } catch (err) {
    req.log.error({ err }, 'admin update device limit failed');
    res.status(500).json({ success: false, error: 'فشل في تحديث حد الأجهزة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const teamUpdateSchema = { params: { id: zId('الفريق') }, body: { username: zString('اسم المستخدم', { min: 1, max: 80 }).optional(), label: zString('الاسم', { min: 1, max: 160 }).optional(), password: zString('كلمة السر', { min: 12, max: 256 }).optional(), maxDevices: zNumber('حد الأجهزة', { min: 1, max: 1000, int: true, optional: true }) } };
router.patch('/teams/:id', validate(teamUpdateSchema), async (req, res) => {
  try {
    const { username, label, password, maxDevices } = req.body || {};
    const data = {};
    if (username !== undefined) data.username = boundedString(username, 'username', { min: 1, max: 80 });
    if (label !== undefined) data.label = boundedString(label, 'label', { min: 1, max: 160 });
    if (password !== undefined) {
      const cleanPassword = strongPassword(password);
      data.passwordHash = await bcrypt.hash(cleanPassword, 12);
      data.authVersion = { increment: 1 };
    }
    if (maxDevices !== undefined) {
      const n = Number(maxDevices);
      if (!Number.isInteger(n) || n < 1 || n > 1000) return res.status(400).json({ error: 'حد الأجهزة غير صالح' });
      data.maxDevices = n;
    }
    const team = await prisma.team.update({ where: { id: req.params.id }, data, select: safeTeamSelect });
    res.json(team);
  } catch (err) {
    req.log.error({ err }, 'admin update team failed');
    res.status(400).json({ success: false, error: 'فشل في تحديث الفريق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const teamCreateSchema = { body: { username: zString('اسم المستخدم', { min: 1, max: 80 }), label: zString('الاسم', { min: 1, max: 160 }), password: zString('كلمة السر', { min: 12, max: 256 }) } };
router.post('/teams', validate(teamCreateSchema), async (req, res) => {
  try {
    const { username, password, label } = req.body || {};
    const cleanUsername = boundedString(username, 'username', { min: 1, max: 80 });
    const cleanLabel = boundedString(label, 'label', { min: 1, max: 160 });
    const cleanPassword = strongPassword(password);

    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const team = await prisma.team.create({ data: { username: cleanUsername, passwordHash, label: cleanLabel }, select: safeTeamSelect });

    if (req.io) {
      req.io.emit('team:created', { teamId: team.id, username: team.username });
    }

    res.status(201).json(team);
  } catch (err) {
    req.log.error({ err }, 'admin create team failed');
    res.status(400).json({ success: false, error: 'فشل في إنشاء الفريق (ربما اسم المستخدم مكرر)', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const teamImportSchema = { body: { teams: z.array(z.object({ username: zString('اسم المستخدم', { min: 1, max: 80 }), label: zString('الاسم', { min: 1, max: 160 }), password: zString('كلمة السر', { min: 12, max: 256 }) })).min(1).max(500) } };
router.post('/teams/import', validate(teamImportSchema), async (req, res) => {
  try {
    const { teams } = req.body || {}; // Array of { username, password, label }
    if (!Array.isArray(teams) || teams.length === 0 || teams.length > 500) {
      return res.status(400).json({ error: 'قائمة الفرق غير صالحة أو أكبر من الحد المسموح' });
    }

    const created = [];
    for (const item of teams) {
      try {
        const username = boundedString(item?.username, 'username', { min: 1, max: 80 });
        const label = boundedString(item?.label, 'label', { min: 1, max: 160 });
        const password = strongPassword(item?.password);
        const passwordHash = await bcrypt.hash(password, 12);
        const team = await prisma.team.create({ data: { username, passwordHash, label }, select: safeTeamSelect });
        created.push(team);
      } catch (error) {
        if (error.code !== 'P2002') throw error;
      }
    }

    res.json({ success: true, count: created.length });
    if (req.io && created.length > 0) {
      req.io.emit('team:created', { count: created.length });
    }
  } catch (err) {
    req.log.error({ err }, 'admin import teams failed');
    res.status(500).json({ success: false, error: 'فشل في استيراد الفرق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/teams/:id', validate({ params: { id: zId('الفريق') } }), async (req, res) => {
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
            try { fs.unlinkSync(fp); } catch (_) { }
          }
        }
      }

      // 2. Sync deletion to Google Drive (trash team folder)
      const safeFolderName = `Team_${team.username}_${team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
      deleteFromGoogleDrive('', `03_TEAMS_DATA/${safeFolderName}`, 'delete_folder').catch(() => { });

      // 3. Delete team from DB
      await prisma.team.delete({ where: { id: deletedId } });
    }

    if (req.io) {
      req.io.emit('team:deleted', { teamId: deletedId });
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete team failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الفريق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Judges CRUD
router.get('/judges', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    let judges = [];
    let total = 0;
    try {
      [judges, total] = await Promise.all([
        prisma.judge.findMany({ orderBy: { createdAt: 'desc' }, select: safeJudgeSelect, skip, take: limit }),
        prisma.judge.count(),
      ]);
    } catch (jErr) {
      req.log.warn({ jErr }, 'admin judges query failed, falling back');
      [judges, total] = [await prisma.judge.findMany({ select: safeJudgeSelect, skip, take: limit }), await prisma.judge.count()];
    }
    res.json(paginatedResponse({ data: judges, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin judges failed');
    res.status(500).json({ success: false, error: 'فشل في جلب المحكمين: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const judgeCreateSchema = { body: { name: zString('الاسم', { min: 1, max: 120 }), username: zString('اسم المستخدم', { min: 1, max: 80 }), password: zString('كلمة السر', { min: 12, max: 256 }) } };
router.post('/judges', validate(judgeCreateSchema), async (req, res) => {
  try {
    const { name, username, password } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 120 });
    const cleanUsername = boundedString(username, 'username', { min: 1, max: 80 });
    const cleanPassword = strongPassword(password);

    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const judge = await prisma.judge.create({ data: { name: cleanName, username: cleanUsername, passwordHash }, select: safeJudgeSelect });

    res.status(201).json(judge);
  } catch (err) {
    req.log.error({ err }, 'admin create judge failed');
    res.status(400).json({ success: false, error: 'فشل في إنشاء المحكم (اسم المستخدم مكرر)', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/judges/:id', validate({ params: { id: zId('المحكم') } }), async (req, res) => {
  try {
    await prisma.judge.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete judge failed');
    res.status(500).json({ success: false, error: 'فشل في حذف المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Competitions & Passcodes
router.get('/competitions', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [comps, total] = await Promise.all([
      prisma.competition.findMany({ include: { questions: true }, skip, take: limit }),
      prisma.competition.count(),
    ]);
    res.json(paginatedResponse({ data: comps, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin competitions failed');
    res.status(500).json({ success: false, error: 'فشل في جلب المسابقات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const competitionCreateSchema = { body: { name: zString('الاسم', { min: 1, max: 200 }), slug: zString('الرمز', { min: 1, max: 100 }), type: zString('النوع', { min: 1, max: 50 }).optional(), criteria: z.union([z.string(), z.array(z.any())]).optional() } };
router.post('/competitions', validate(competitionCreateSchema), async (req, res) => {
  try {
    const { name, slug, type, criteria } = req.body || {};
    const cleanName = boundedString(name, 'name', { min: 1, max: 200 });
    const cleanSlug = boundedString(slug, 'slug', { min: 1, max: 100 });
    const cleanType = type === undefined ? 'auto_digital' : String(type);
    if (!['auto_digital', 'manual_judged'].includes(cleanType)) return res.status(400).json({ error: 'نوع المسابقة غير صالح' });
    const comp = await prisma.competition.create({
      data: {
        name: cleanName,
        slug: cleanSlug,
        type: cleanType,
        criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria || [])
      }
    });
    if (req.io) req.io.emit('competition:update', { action: 'created', competitionId: comp.id });
    res.status(201).json(comp);
  } catch (err) {
    req.log.error({ err }, 'admin create competition failed');
    res.status(500).json({ success: false, error: 'فشل في إنشاء المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const competitionUpdateSchema = {
  params: { id: zId('المسابقة') },
  body: {
    isOpen: zBoolean('isOpen', { optional: true }),
    name: zString('الاسم', { min: 1, max: 200 }).optional(),
    description: zString('الوصف', { max: 1000 }).optional(),
    type: zString('النوع', { max: 50 }).optional(),
    criteria: z.union([z.string(), z.array(z.any())]).optional(),
    duration: zNumber('المدة', { min: 0, optional: true }),
    entryCode: zString('كود الدخول', { max: 100 }).optional().nullable(),
    passcode: zString('كود المرور', { max: 100 }).optional().nullable(),
    custom: zBoolean('custom', { optional: true }),
    revoke: zBoolean('revoke', { optional: true }),
  },
};
router.patch('/competitions/:id', validate(competitionUpdateSchema), async (req, res) => {
  try {
    const { isOpen, name, description, type, criteria, duration, entryCode, passcode, custom, revoke } = req.body;
    const data = {
      ...(isOpen !== undefined && { isOpen: Boolean(isOpen) }),
      ...(name !== undefined && { name: String(name).trim() }),
      ...(description !== undefined && { description: String(description) }),
      ...(type !== undefined && { type: String(type) }),
      ...(criteria !== undefined && { criteria: typeof criteria === 'string' ? criteria : JSON.stringify(criteria) }),
      ...(duration !== undefined && { duration: duration === null ? null : Number(duration) }),
      ...(entryCode !== undefined && { entryCode: entryCode ? String(entryCode) : null }),
      ...(passcode !== undefined && { passcode: passcode ? String(passcode) : null }),
    };
    if (custom !== undefined) data.type = custom ? 'manual_judged' : data.type;
    if (revoke === true) { data.passcode = null; data.entryCode = null; data.isOpen = false; }
    const comp = await prisma.competition.update({ where: { id: req.params.id }, data });

    if (req.io) {
      req.io.emit('competition:update', { action: 'updated', competitionId: comp.id, isOpen: comp.isOpen });
      if (isOpen === false) req.io.emit('judge:session:closed', { competitionId: comp.id });
    }

    res.json(comp);
  } catch (err) {
    req.log.error({ err }, 'admin update competition failed');
    res.status(500).json({ success: false, error: 'فشل في تحديث المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.post('/competitions/:id/passcode', validate({ params: { id: zId('المسابقة') } }), async (req, res) => {
  try {
    const randomCode = crypto.randomInt(100000, 1000000).toString();
    const comp = await prisma.competition.update({
      where: { id: req.params.id },
      data: { passcode: randomCode, isOpen: true }
    });
    if (req.io) req.io.emit('competition:update', { action: 'opened', competitionId: comp.id, isOpen: comp.isOpen });
    res.json({ passcode: comp.passcode });
  } catch (err) {
    req.log.error({ err }, 'admin generate passcode failed');
    res.status(500).json({ success: false, error: 'فشل في توليد كود المسابقة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Questions CRUD
const questionSchema = {
  body: {
    competitionId: zId('المسابقة'),
    text: zString('نص السؤال', { min: 1, max: 1000 }),
    options: z.union([z.string(), z.array(z.any())]).optional(),
    correctOption: zNumber('الإجابة الصحيحة', { min: 0, max: 1000, int: true }),
    points: zNumber('النقاط', { min: 0, max: 10000, optional: true }),
  },
};
router.post('/questions', validate(questionSchema), async (req, res) => {
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
    req.log.error({ err }, 'admin create question failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة السؤال', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/questions/:id', validate({ params: { id: zId('السؤال') } }), async (req, res) => {
  try {
    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete question failed');
    res.status(500).json({ success: false, error: 'فشل في حذف السؤال', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Score Override (Admin Audit; requires an explicit unlock first)
const scoreOverrideSchema = {
  params: { id: zId('النتيجة') },
  body: { total: zNumber('المجموع', { min: 0 }), values: z.union([z.string(), z.record(z.unknown())]).optional(), reason: zString('السبب', { min: 1, max: 500 }) },
};
router.patch('/scores/:id', validate(scoreOverrideSchema), async (req, res) => {
  try {
    const { total, values, reason } = req.body;
    const adminId = req.user.id;
    const existing = await prisma.score.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    if (existing.isFinal) return res.status(409).json({ error: 'يجب فتح قفل النتيجة أولاً' });
    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal) || !String(reason || '').trim()) return res.status(400).json({ error: 'الدرجة وسبب التصحيح مطلوبان' });
    const score = await prisma.$transaction(async tx => {
      const updated = await tx.score.update({ where: { id: existing.id }, data: { total: numericTotal, ...(values !== undefined && { values: typeof values === 'string' ? values : JSON.stringify(values) }), editedByAdminId: adminId, editedAt: new Date(), isFinal: true } });
      await tx.scoreAudit.create({ data: { scoreId: existing.id, competitionId: existing.competitionId, teamId: existing.teamId, adminId, action: 'admin_correction', reason: String(reason).trim(), previousData: JSON.stringify(existing), newData: JSON.stringify(updated) } });
      return updated;
    });

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);

    res.json(score);
  } catch (err) {
    req.log.error({ err }, 'admin score override failed');
    res.status(500).json({ success: false, error: 'فشل في تعديل الدرجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// News Management
const newsCreateSchema = {
  body: {
    title: zString('العنوان', { min: 1, max: 300 }),
    body: zString('المحتوى', { min: 1, max: 5000 }),
    photoUrl: zString('رابط الصورة', { max: 2048 }).optional(),
    category: zString('التصنيف', { max: 50 }).optional(),
    targetTeamIds: z.array(zString('معرف الفريق', { min: 1, max: 100 })).optional(),
  },
};
router.post('/news', validate(newsCreateSchema), async (req, res) => {
  try {
    const { title, body, photoUrl, category, targetTeamIds } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'العنوان والمحتوى مطلوبان' });
    }

    const news = await prisma.news.create({
      data: {
        title,
        body,
        photoUrl: photoUrl || null,
        category: category || 'general',
        targetTeamIds: JSON.stringify(Array.isArray(targetTeamIds) ? targetTeamIds : []),
        createdByAdminId: req.user.id
      }
    });

    if (req.io) {
      req.io.emit('news:published', news);
    }

    res.status(201).json(news);
  } catch (err) {
    req.log.error({ err }, 'admin create news failed');
    res.status(500).json({ success: false, error: 'فشل في نشر الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const newsUpdateSchema = {
  params: { id: zId('الخبر') },
  body: {
    title: zString('العنوان', { min: 1, max: 300 }).optional(),
    body: zString('المحتوى', { min: 1, max: 5000 }).optional(),
    photoUrl: zString('رابط الصورة', { max: 2048 }).optional().nullable(),
    category: zString('التصنيف', { max: 50 }).optional(),
    targetTeamIds: z.array(zString('معرف الفريق', { min: 1, max: 100 })).optional(),
  },
};
router.patch('/news/:id', validate(newsUpdateSchema), async (req, res) => {
  try {
    const { title, body, photoUrl, category, targetTeamIds } = req.body || {};
    const news = await prisma.news.update({
      where: { id: req.params.id }, data: {
        ...(title !== undefined && { title }), ...(body !== undefined && { body }),
        ...(photoUrl !== undefined && { photoUrl: photoUrl || null }), ...(category !== undefined && { category }),
        ...(targetTeamIds !== undefined && { targetTeamIds: JSON.stringify(Array.isArray(targetTeamIds) ? targetTeamIds : []) })
      }
    });
    res.json(news);
  } catch (err) {
    req.log.error({ err }, 'admin update news failed');
    res.status(400).json({ success: false, error: 'فشل في تعديل الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/news/:id', validate({ params: { id: zId('الخبر') } }), async (req, res) => {
  try {
    await prisma.news.delete({ where: { id: req.params.id } });

    if (req.io) {
      req.io.emit('news:deleted', { id: req.params.id });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete news failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الخبر', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Agenda Management
const agendaSchema = {
  body: {
    title: zString('العنوان', { min: 1, max: 300 }),
    type: zString('النوع', { max: 50 }),
    period: zString('الفترة', { max: 50 }).optional(),
    order: zNumber('الترتيب', { min: 0, int: true, optional: true }),
    zoneId: zString('المنطقة', { max: 100 }),
    startTime: zString('وقت البدء', { max: 50 }),
    endTime: zString('وقت الانتهاء', { max: 50 }),
    description: zString('الوصف', { max: 1000 }).optional(),
  },
};
router.post('/agenda', validate(agendaSchema), async (req, res) => {
  try {
    const { title, type, period, order, zoneId, startTime, endTime, description } = req.body;
    const item = await prisma.agendaItem.create({
      data: { title, type, period: period || 'before', order: Number(order) || 0, zoneId, startTime, endTime, description: description || '' }
    });

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.status(201).json(item);
  } catch (err) {
    req.log.error({ err }, 'admin create agenda failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/agenda/:id', validate({ params: { id: zId('الفعالية') } }), async (req, res) => {
  try {
    await prisma.agendaItem.delete({ where: { id: req.params.id } });

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin delete agenda failed');
    res.status(500).json({ success: false, error: 'فشل في حذف الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.put('/agenda/:id', validate({ params: { id: zId('الفعالية') }, body: agendaSchema.body }), async (req, res) => {
  try {
    const { title, type, period, order, zoneId, startTime, endTime, description } = req.body;
    const item = await prisma.agendaItem.update({
      where: { id: req.params.id },
      data: { title, type, period: period || 'before', order: Number(order) || 0, zoneId, startTime, endTime, description: description || '' }
    });

    if (req.io) {
      req.io.emit('agenda:update');
    }

    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'admin update agenda failed');
    res.status(500).json({ success: false, error: 'فشل في تعديل الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const agendaActionSchema = {
  params: { id: zId('الفعالية') },
  body: { action: z.enum(['start', 'stop', 'close'], { errorMap: () => ({ message: 'الإجراء يجب أن يكون start أو stop أو close' }) }) },
};
router.post('/agenda/:id/action', validate(agendaActionSchema), async (req, res) => {
  try {
    const action = String(req.body.action || '').toLowerCase();
    const now = new Date();
    const data = action === 'start'
      ? { isStarted: true, startedAt: now, isClosed: false, closedAt: null }
      : action === 'stop' || action === 'close'
        ? { isClosed: true, closedAt: now }
        : null;
    if (!data) return res.status(400).json({ error: 'الإجراء يجب أن يكون start أو stop أو close' });
    const item = await prisma.agendaItem.update({ where: { id: req.params.id }, data });
    if (req.io) req.io.emit('agenda:update', { action, agendaId: item.id });
    res.json(item);
  } catch (err) {
    req.log.error({ err }, 'admin agenda action failed');
    res.status(500).json({ success: false, error: 'فشل في تغيير حالة الفعالية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Reports Management
router.get('/reports', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    let reports = [];
    let total = 0;
    try {
      [reports, total] = await Promise.all([
        prisma.report.findMany({
          include: { team: { select: safeTeamSelect }, competition: { select: safeCompetitionSelect } },
          orderBy: { uploadedAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.report.count(),
      ]);
    } catch (rErr) {
      req.log.warn({ rErr }, 'admin reports relation/orderBy failed, falling back');
      [reports, total] = [await prisma.report.findMany({ skip, take: limit }), await prisma.report.count()];
    }
    res.json(paginatedResponse({ data: reports, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin reports failed');
    res.status(500).json({ success: false, error: 'فشل في جلب التقارير: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/reports/:id', validate({ params: { id: zId('التقرير') } }), async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { team: { select: safeTeamSelect } }
    });

    if (report) {
      if (report.fileUrl) {
        const fileName = path.basename(report.fileUrl);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const fp = path.join(uploadsDir, fileName);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch (_) { }
        }

        if (report.team) {
          const safeFolderName = `Team_${report.team.username}_${report.team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
          deleteFromGoogleDrive(fileName, `03_TEAMS_DATA/${safeFolderName}/reports`, 'delete_file').catch(() => { });
        }
      }

      await prisma.report.delete({ where: { id: reportId } });
    }

    res.json({ success: true, message: 'تم حذف التقرير والملف بنجاح' });
  } catch (err) {
    req.log.error({ err }, 'admin delete report failed');
    res.status(500).json({ success: false, error: 'فشل في حذف التقرير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Admin Emergency Freeze / Unfreeze Switch
const emergencyFreezeSchema = { body: { frozen: zBoolean('الحالة') } };
router.post('/emergency-freeze', validate(emergencyFreezeSchema), async (req, res) => {
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
    req.log.error({ err }, 'admin emergency freeze failed');
    res.status(500).json({ success: false, error: 'فشل في تغيير حالة الطوارئ', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Admin Clean Slate (Reset Test Data before Event)
const cleanSlateSchema = { body: { confirmPassword: zString('كلمة السر', { min: 1, max: 256 }) } };
router.post('/clean-slate', validate(cleanSlateSchema), async (req, res) => {
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

    clearLeaderboardCache();
    await emitLeaderboardUpdate(req.io, getAnonymousLeaderboard);
    req.io?.to('admin').emit('system:clean-slate');

    res.json({ success: true, message: 'تم تصفير كافة درجات وتجارب الاختبار بنجاح!' });
  } catch (err) {
    req.log.error({ err }, 'admin clean slate failed');
    res.status(500).json({ success: false, error: 'فشل في تصفير البيانات التجريبية', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Admin Backup Trigger Endpoint
router.post('/backup/trigger', async (req, res) => {
  try {
    const result = await generateFullBackup();
    res.json(result);
  } catch (err) {
    req.log.error({ err }, 'admin backup trigger failed');
    res.status(500).json({ success: false, error: 'فشل في تشغيل المزامنة والنسخ الاحتياطي', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Seed missing competition agenda items
router.post('/seed-agenda', async (req, res) => {
  try {
    const zones = await prisma.zone.findMany();
    const zoneMap = {};
    zones.forEach(z => { zoneMap[z.numberLabel] = z.id; });

    const existing = await prisma.agendaItem.findMany();

    // Clear old agenda items to re-seed with expanded list
    if (existing.length > 0) {
      await prisma.agendaItem.deleteMany();
    }

    const items = [
      { title: 'تجمع واستقبال الوفود', type: 'ceremony', zoneId: zoneMap['١'], startTime: '08:00', endTime: '09:00', description: 'استقبال جميع الفرق والوفود المشاركة وتوزيع التعليمات التنظيمية', order: 1 },
      { title: 'تحية العلم وافتتاح المهرجان', type: 'ceremony', zoneId: zoneMap['٥'], startTime: '09:00', endTime: '10:00', description: 'مراسم رفع العلم الكشفي وافتتاح فعاليات المهرجان رسمياً', order: 2 },
      { title: 'اجتماع القادة وتسليم الأعمال الجاهزة', type: 'workshop', zoneId: zoneMap['١'], startTime: '10:00', endTime: '10:30', description: 'اجتماع فرق القادة وتسليم الأبحاث والعروض الكشفية الجاهزة', order: 3 },
      { title: 'تسميع القرآن الكريم', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة تسميع القرآن الكريم', order: 4 },
      { title: 'تسميع الأحاديث النبوية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة تسميع الأحاديث النبوية', order: 5 },
      { title: 'المجال الرياضي', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'تحديات رياضية ميدانية', order: 6 },
      { title: 'الموسيقى الفني', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'الموسيقى والإلقاء الفني', order: 7 },
      { title: 'عقد وربطات الكشفية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'عقد وربطات الكشفية', order: 8 },
      { title: 'تصميم فيديو كشفي', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'تصميم فيديو دقيقتين', order: 9 },
      { title: 'عواصم وعملات الدول العربية', type: 'competition', zoneId: zoneMap['٢'], startTime: '10:30', endTime: '11:30', description: 'مسابقة عواصم وعملات الدول العربية', order: 10 },
      { title: 'تكمية المجال الرياضي', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'تكمية المجال الرياضي', order: 11 },
      { title: 'الورشة الفنية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'الورشة الفنية', order: 12 },
      { title: 'النموذج الكشفي', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'النموذج الكشفي', order: 13 },
      { title: 'بحث ثلاث أفكار لمبتكرات علمية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'بحث ثلاث أفكار لمبتكرات علمية', order: 14 },
      { title: 'ورقة عمل على خطي الأبجية', type: 'workshop', zoneId: zoneMap['٢'], startTime: '11:30', endTime: '01:00', description: 'ورقة عمل على خطي الأبجية', order: 15 },
      { title: 'صلاة الجمعة', type: 'ceremony', zoneId: zoneMap['٣'], startTime: '01:00', endTime: '02:00', description: 'صلاة الجمعة الجماعية', order: 16 },
      { title: 'عرض تنظير الطائرات', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'طائرات ورقية', order: 17 },
      { title: 'الكرنفال الكشفي', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الكرنفال الاستعراضي', order: 18 },
      { title: 'كينج الشفرات', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'فك الشفرات', order: 19 },
      { title: 'عرض تقديمي عن الموديلات الكشفية', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الموديلات الكشفية', order: 20 },
      { title: 'حقيقتان وكذبة', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'تحدي الذكاء', order: 21 },
      { title: 'المجلة الأرضية', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'المجلة الأرضية والمعرض', order: 22 },
      { title: 'الكاشف الذكي', type: 'competition', zoneId: zoneMap['٦'], startTime: '02:00', endTime: '04:00', description: 'الكاشف الذكي', order: 23 },
      { title: 'الخدمة العامة', type: 'workshop', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'مشروع الخدمة العامة', order: 24 },
      { title: 'عرض تقديمي كوميدي', type: 'competition', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'عرض كوميدي عن مهارة كشفية', order: 25 },
      { title: 'مهرجان التلاوة', type: 'competition', zoneId: zoneMap['٥'], startTime: '04:00', endTime: '05:30', description: 'مهرجان التلاوة', order: 26 },
      { title: 'حفل الختام والسمر', type: 'ceremony', zoneId: zoneMap['٦'], startTime: '05:30', endTime: '08:30', description: 'حفل الختام والسمر الكشفي - التكريمات والجوائز', order: 27 },
    ];

    let added = 0;
    for (const item of items) {
      if (!item.zoneId) continue;
      await prisma.agendaItem.create({ data: item });
      added++;
    }

    // Seed competitions
    const existingComps = await prisma.competition.findMany();
    const existingCompSlugs = new Set(existingComps.map(e => e.slug));

    const competitions = [
      { name: 'مسابقة عبقرينو (من سيربح الكود)', slug: 'genius', type: 'auto_digital', description: 'مسابقة رقمية ذكية', passcode: '1001', duration: 900 },
      { name: 'مسابقة حقيقتان وكذبة', slug: 'two_truths', type: 'auto_digital', description: 'تحدي الذكاء', passcode: '1002', duration: 600 },
      { name: 'مسابقة الجغرافيا', slug: 'geography', type: 'auto_digital', description: 'مسابقة جغرافيا رقمية', passcode: '1003', duration: 600 },
      { name: 'مسابقة تصميم الفيديو الكشفي', slug: 'video', type: 'manual_judged', description: 'تصميم فيديو كشفي', passcode: '1234' },
      { name: 'تسميع القرآن الكريم', slug: 'quran', type: 'manual_judged', description: 'تسميع القرآن الكريم' },
      { name: 'تسميع الأحاديث النبوية', slug: 'hadith', type: 'manual_judged', description: 'تسميع الأحاديث النبوية' },
      { name: 'المجال الرياضي', slug: 'sports', type: 'manual_judged', description: 'تحديات رياضية ميدانية' },
      { name: 'الموسيقى الفني', slug: 'music', type: 'manual_judged', description: 'الموسيقى والإلقاء الفني' },
      { name: 'عقد وربطات الكشفية', slug: 'knots', type: 'manual_judged', description: 'عقد وربطات الكشفية' },
      { name: 'الورشة الفنية', slug: 'art_workshop', type: 'manual_judged', description: 'الورشة الفنية' },
      { name: 'النموذج الكشفي', slug: 'scout_model', type: 'manual_judged', description: 'النموذج الكشفي' },
      { name: 'بحث ثلاث أفكار لمبتكرات علمية', slug: 'innovation', type: 'manual_judged', description: 'مبتكرات علمية' },
      { name: 'ورقة عمل على خطي الأبجية', slug: 'calligraphy', type: 'manual_judged', description: 'خطي الأبجية' },
      { name: 'عرض تنظير الطائرات', slug: 'planes', type: 'manual_judged', description: 'طائرات ورقية' },
      { name: 'الكرنفال الكشفي', slug: 'carnival', type: 'manual_judged', description: 'الكرنفال الاستعراضي' },
      { name: 'كينج الشفرات', slug: 'ciphers', type: 'manual_judged', description: 'فك الشفرات' },
      { name: 'عرض تقديمي عن الموديلات الكشفية', slug: 'model_presentation', type: 'manual_judged', description: 'الموديلات الكشفية' },
      { name: 'المجلة الأرضية', slug: 'magazine', type: 'manual_judged', description: 'المجلة الأرضية والمعرض' },
      { name: 'الكاشف الذكي', slug: 'detector', type: 'manual_judged', description: 'الكاشف الذكي' },
      { name: 'الخدمة العامة', slug: 'service', type: 'manual_judged', description: 'مشروع الخدمة العامة' },
      { name: 'عرض تقديمي كوميدي', slug: 'comedy', type: 'manual_judged', description: 'عرض كوميدي عن مهارة كشفية' },
      { name: 'مهرجان التلاوة', slug: 'tilawa', type: 'manual_judged', description: 'مهرجان التلاوة' },
      { name: 'سهرة السمر والختام', slug: 'closing_night', type: 'manual_judged', description: 'سهرة السمر والختام' },
    ];

    let compsAdded = 0;
    for (const comp of competitions) {
      if (existingCompSlugs.has(comp.slug)) continue;
      await prisma.competition.create({ data: { ...comp, isOpen: true } });
      compsAdded++;
    }

    if (req.io) {
      req.io.emit('agenda:update', { action: 'seeded', agendaAdded: added });
      if (compsAdded > 0) req.io.emit('competition:update', { action: 'seeded', count: compsAdded });
    }
    res.json({ success: true, agendaAdded: added, compsAdded, totalAgenda: existing.length + added, totalComps: existingComps.length + compsAdded });
  } catch (err) {
    req.log.error({ err }, 'admin seed agenda failed');
    res.status(500).json({ success: false, error: 'فشل في إضافة البيانات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Report permission administration
router.get('/report-permissions', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
      prisma.reportPermission.findMany({ include: { team: { select: safeTeamSelect }, competition: { select: safeCompetitionSelect } }, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
      prisma.reportPermission.count(),
    ]);
    res.json(paginatedResponse({ data: rows, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin report permissions list failed');
    res.status(500).json({ success: false, error: 'فشل في جلب الصلاحيات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
const reportPermissionSchema = {
  params: { teamId: zId('الفريق'), competitionId: zId('المسابقة') },
  body: { canSubmit: zBoolean('canSubmit', { optional: true }), deadline: zString('الموعد النهائي', { max: 50 }).optional().nullable(), reopen: zBoolean('reopen', { optional: true }) },
};
router.patch('/report-permissions/:teamId/:competitionId', validate(reportPermissionSchema), async (req, res) => {
  try {
    const { canSubmit, deadline, reopen } = req.body;
    const row = await prisma.reportPermission.upsert({
      where: { teamId_competitionId: { teamId: req.params.teamId, competitionId: req.params.competitionId } },
      create: { teamId: req.params.teamId, competitionId: req.params.competitionId, canSubmit: canSubmit !== false, deadline: deadline ? new Date(deadline) : null, reopenedAt: reopen ? new Date() : null, updatedByAdminId: req.user.id },
      update: { ...(canSubmit !== undefined && { canSubmit: Boolean(canSubmit) }), ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }), ...(reopen && { reopenedAt: new Date(), canSubmit: true }), updatedByAdminId: req.user.id }
    });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, 'admin update report permission failed');
    res.status(400).json({ success: false, error: 'فشل في تحديث صلاحية التقرير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Judge assignments
router.get('/judges/:judgeId/assignments', validate({ params: { judgeId: zId('المحكم') } }), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { judgeId: req.params.judgeId };
    const [rows, total] = await Promise.all([
      prisma.judgeCompetition.findMany({ where, include: { competition: true }, skip, take: limit }),
      prisma.judgeCompetition.count({ where }),
    ]);
    res.json(paginatedResponse({ data: rows, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin judge assignments failed');
    res.status(500).json({ success: false, error: 'فشل في جلب تعيينات المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.get('/scores/breakdown', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [rows, total] = await Promise.all([
      prisma.score.findMany({ include: { team: { select: safeTeamSelect }, competition: { select: safeCompetitionSelect }, judgeScores: { include: { judge: { select: { id: true, name: true, username: true } } } }, audits: { orderBy: { createdAt: 'asc' } } }, skip, take: limit }),
      prisma.score.count(),
    ]);
    res.json(paginatedResponse({ data: rows, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'admin scores breakdown failed');
    res.status(500).json({ success: false, error: 'فشل في جلب تفاصيل الدرجات', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
const judgeAssignmentSchema = { params: { judgeId: zId('المحكم') }, body: { competitionId: zId('المسابقة') } };
router.post('/judges/:judgeId/assignments', validate(judgeAssignmentSchema), async (req, res) => {
  try {
    const { competitionId } = req.body;
    const row = await prisma.judgeCompetition.upsert({ where: { judgeId_competitionId: { judgeId: req.params.judgeId, competitionId } }, create: { judgeId: req.params.judgeId, competitionId }, update: {} });
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, 'admin assign judge failed');
    res.status(500).json({ success: false, error: 'فشل في تعيين المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.delete('/judges/:judgeId/assignments/:competitionId', validate({ params: { judgeId: zId('المحكم'), competitionId: zId('المسابقة') } }), async (req, res) => {
  try {
    await prisma.judgeCompetition.deleteMany({ where: { judgeId: req.params.judgeId, competitionId: req.params.competitionId } });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin remove judge assignment failed');
    res.status(500).json({ success: false, error: 'فشل في إزالة تعيين المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
const judgeUpdateSchema = { params: { id: zId('المحكم') }, body: { name: zString('الاسم', { min: 1, max: 120 }).optional(), username: zString('اسم المستخدم', { min: 1, max: 80 }).optional(), password: zString('كلمة السر', { min: 12, max: 256 }).optional() } };
router.patch('/judges/:id', validate(judgeUpdateSchema), async (req, res) => {
  try {
    const { name, username, password } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (username !== undefined) data.username = username.trim();
    if (password !== undefined) { data.passwordHash = await bcrypt.hash(password, 12); data.authVersion = { increment: 1 }; }
    res.json(await prisma.judge.update({ where: { id: req.params.id }, data, select: safeJudgeSelect }));
  } catch (err) {
    req.log.error({ err }, 'admin update judge failed');
    res.status(400).json({ success: false, error: 'فشل في تحديث المحكم', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Score finalization controls
const scoreUnlockSchema = { params: { id: zId('النتيجة') }, body: { reason: zString('السبب', { min: 1, max: 500 }) } };
router.post('/scores/:id/unlock', validate(scoreUnlockSchema), async (req, res) => {
  try {
    const { reason } = req.body;
    const score = await prisma.score.findUnique({ where: { id: req.params.id } }); if (!score) return res.status(404).json({ success: false, error: 'النتيجة غير موجودة', requestId: req.requestId, timestamp: new Date().toISOString() });
    await prisma.$transaction([prisma.score.update({ where: { id: score.id }, data: { isFinal: false, unlockedAt: new Date(), unlockedByAdminId: req.user.id, unlockReason: reason } }), prisma.scoreAudit.create({ data: { scoreId: score.id, competitionId: score.competitionId, teamId: score.teamId, adminId: req.user.id, action: 'unlock', reason, previousData: JSON.stringify(score) } })]);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, 'admin unlock score failed');
    res.status(500).json({ success: false, error: 'فشل في فتح القفل', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});
router.post('/scores/:id/lock', validate({ params: { id: zId('النتيجة') } }), async (req, res) => {
  try {
    const score = await prisma.score.update({ where: { id: req.params.id }, data: { isFinal: true } });
    res.json(score);
  } catch (err) {
    req.log.error({ err }, 'admin lock score failed');
    res.status(500).json({ success: false, error: 'فشل في قفل النتيجة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});


export default router;
