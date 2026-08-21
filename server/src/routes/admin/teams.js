import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../db.js';
import { deleteFromGoogleDrive, uploadToGoogleDrive } from '../../backup-exporter.js';
import { boundedString, strongPassword } from '../../validation.js';
import { validate, zString, zId, zNumber } from '../../middleware/validate.js';
import { z } from 'zod';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };

const router = Router();

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
          select: {
            ...safeTeamSelect,
            _count: { select: { members: true, devices: { where: { revokedAt: null } } } },
          },
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
    // Revoked rows are retained so a removed device can re-register later, but they
    // are not active registrations and must not consume a team's device quota.
    const where = { teamId, revokedAt: null };
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

// Revoke a device — frees its slot and allows the same browser to re-register later
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

const teamUpdateSchema = { params: { id: zId('الفريق') }, body: { username: zString('اسم المستخدم', { min: 1, max: 80 }).optional(), label: zString('الاسم', { min: 1, max: 160 }).optional(), password: zString('كلمة السر', { min: 6, max: 256 }).optional(), maxDevices: zNumber('حد الأجهزة', { min: 1, max: 1000, int: true, optional: true }) } };
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

const teamCreateSchema = { body: { username: zString('اسم المستخدم', { min: 1, max: 80 }), label: zString('الاسم', { min: 1, max: 160 }), password: zString('كلمة السر', { min: 6, max: 256 }), maxDevices: zNumber('حد الأجهزة', { min: 1, max: 1000, int: true, optional: true }) } };
router.post('/teams', validate(teamCreateSchema), async (req, res) => {
  try {
    const { username, password, label, maxDevices } = req.body || {};
    const cleanUsername = boundedString(username, 'username', { min: 1, max: 80 });
    const cleanLabel = boundedString(label, 'label', { min: 1, max: 160 });
    const cleanPassword = strongPassword(password);

    const passwordHash = await bcrypt.hash(cleanPassword, 12);
    const data = { username: cleanUsername, passwordHash, label: cleanLabel };
    if (maxDevices !== undefined) {
      const n = Number(maxDevices);
      if (!Number.isInteger(n) || n < 1 || n > 1000) return res.status(400).json({ error: 'حد الأجهزة غير صالح' });
      data.maxDevices = n;
    }
    const team = await prisma.team.create({ data, select: safeTeamSelect });

    if (req.io) {
      req.io.emit('team:created', { teamId: team.id, username: team.username });
    }

    // Google Drive: Create team folder and info file immediately
    (async () => {
      try {
        const safeName = (team.label || team.username).replace(/[/\\?%*:|"<>]/g, '_');
        const buf = Buffer.from(JSON.stringify({ ...team, createdAt: new Date().toISOString() }, null, 2), 'utf8');
        await uploadToGoogleDrive(`بيانات_ودرجات_${safeName}.json`, 'application/json', buf, `الفرق_الكشفية/${safeName}`);
      } catch (e) {
        req.log.warn({ err: e.message }, 'Failed to create team folder on Google Drive');
      }
    })();

    res.status(201).json(team);
  } catch (err) {
    req.log.error({ err }, 'admin create team failed');
    res.status(400).json({ success: false, error: 'فشل في إنشاء الفريق (ربما اسم المستخدم مكرر)', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const teamImportSchema = { body: { teams: z.array(z.object({ username: zString('اسم المستخدم', { min: 1, max: 80 }), label: zString('الاسم', { min: 1, max: 160 }), password: zString('كلمة السر', { min: 6, max: 256 }), maxDevices: zNumber('حد الأجهزة', { min: 1, max: 1000, int: true, optional: true }) })).min(1).max(500) } };
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
        const data = { username, passwordHash, label };
        if (item?.maxDevices !== undefined) {
          const n = Number(item.maxDevices);
          if (Number.isInteger(n) && n >= 1 && n <= 1000) {
            data.maxDevices = n;
          }
        }
        const team = await prisma.team.create({ data, select: safeTeamSelect });
        created.push(team);

        // Google Drive: create folder for each imported team
        (async () => {
          try {
            const safeName = (team.label || team.username).replace(/[/\\?%*:|"<>]/g, '_');
            const buf = Buffer.from(JSON.stringify({ ...team, createdAt: new Date().toISOString() }, null, 2), 'utf8');
            await uploadToGoogleDrive(`بيانات_ودرجات_${safeName}.json`, 'application/json', buf, `الفرق_الكشفية/${safeName}`);
          } catch {}
        })();
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


export default router;
