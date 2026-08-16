import { Router } from 'express';
import prisma from '../../db.js';
import { z } from 'zod';
import { validate, zString, zId, zBoolean } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';
import { OFFICIAL_REPORT_IDS } from '../../reportCatalog.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, criteria: true, createdAt: true };

const router = Router();
const reportCompetitionWhere = { id: { in: OFFICIAL_REPORT_IDS } };

const bulkPermissionSchema = {
  params: { teamId: zId('الفريق') },
  body: {
    competitionIds: z.array(zId('المسابقة')).min(1, { message: 'اختر مسابقة واحدة على الأقل' }).max(OFFICIAL_REPORT_IDS.length, { message: 'عدد المسابقات أكبر من الحد المسموح' }),
    canSubmit: zBoolean('canSubmit', { optional: true }),
    deadline: zString('الموعد النهائي', { max: 50 }).optional().nullable(),
    reopen: zBoolean('reopen', { optional: true }),
  },
};

const parseDeadline = deadline => {
  if (!deadline) return null;
  const value = new Date(deadline);
  if (Number.isNaN(value.getTime())) {
    const error = new Error('الموعد النهائي غير صالح');
    error.statusCode = 400;
    throw error;
  }
  return value;
};

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

router.patch('/report-permissions/revoke-all', async (req, res) => {
  try {
    const result = await prisma.$transaction(async tx => {
      const teams = await tx.team.findMany({ select: { id: true } });
      const competitions = await tx.competition.findMany({ where: reportCompetitionWhere, select: { id: true } });
      if (teams.length === 0 || competitions.length === 0) return { teams: teams.length, competitions: competitions.length, updated: 0, created: 0 };

      const teamIds = teams.map(team => team.id);
      const competitionIds = competitions.map(competition => competition.id);
      const revokedAt = new Date();
      const updated = await tx.reportPermission.updateMany({
        where: { teamId: { in: teamIds }, competitionId: { in: competitionIds } },
        data: { canSubmit: false, deadline: null, reopenedAt: null, revokedAt, updatedByAdminId: req.user.id },
      });
      const existing = await tx.reportPermission.findMany({
        where: { teamId: { in: teamIds }, competitionId: { in: competitionIds } },
        select: { teamId: true, competitionId: true },
      });
      const existingKeys = new Set(existing.map(row => `${row.teamId}:${row.competitionId}`));
      const missing = [];
      for (const teamId of teamIds) {
        for (const competitionId of competitionIds) {
          if (!existingKeys.has(`${teamId}:${competitionId}`)) {
            missing.push({ teamId, competitionId, canSubmit: false, revokedAt, updatedByAdminId: req.user.id });
          }
        }
      }
      if (missing.length > 0) await tx.reportPermission.createMany({ data: missing });
      return { teams: teams.length, competitions: competitions.length, updated: updated.count, created: missing.length };
    });
    res.json({ success: true, ...result, total: result.updated + result.created });
  } catch (err) {
    req.log.error({ err }, 'admin revoke all report permissions failed');
    res.status(400).json({ success: false, error: 'فشل في سحب صلاحية التقارير من كل الفرق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.patch('/report-permissions/:teamId/bulk', validate(bulkPermissionSchema), async (req, res) => {
  try {
    const { competitionIds, canSubmit, deadline, reopen } = req.body;
    const uniqueCompetitionIds = [...new Set(competitionIds)];
    if (uniqueCompetitionIds.some(competitionId => !OFFICIAL_REPORT_IDS.includes(competitionId))) {
      return res.status(400).json({ success: false, error: 'توجد مسابقة غير صالحة ضمن الاختيار' });
    }
    const [team, competitions] = await Promise.all([
      prisma.team.findUnique({ where: { id: req.params.teamId }, select: { id: true } }),
      prisma.competition.findMany({ where: { id: { in: uniqueCompetitionIds } }, select: { id: true } }),
    ]);
    if (!team) return res.status(404).json({ success: false, error: 'الفريق غير موجود' });
    if (competitions.length !== uniqueCompetitionIds.length) return res.status(400).json({ success: false, error: 'توجد مسابقة غير صالحة ضمن الاختيار' });

    const parsedDeadline = deadline === undefined ? undefined : parseDeadline(deadline);
    const allow = canSubmit !== false || Boolean(reopen);
    const now = new Date();
    const rows = await prisma.$transaction(async tx => {
      const result = [];
      for (const competitionId of uniqueCompetitionIds) {
        result.push(await tx.reportPermission.upsert({
          where: { teamId_competitionId: { teamId: team.id, competitionId } },
          create: {
            teamId: team.id,
            competitionId,
            canSubmit: allow,
            ...(parsedDeadline !== undefined && { deadline: parsedDeadline }),
            ...(reopen && { reopenedAt: now }),
            revokedAt: allow ? null : now,
            updatedByAdminId: req.user.id,
          },
          update: {
            canSubmit: allow,
            ...(parsedDeadline !== undefined && { deadline: parsedDeadline }),
            ...(reopen && { reopenedAt: now }),
            revokedAt: allow ? null : now,
            updatedByAdminId: req.user.id,
          },
        }));
      }
      return result;
    });
    res.json({ success: true, count: rows.length, permissions: rows });
  } catch (err) {
    req.log.error({ err }, 'admin bulk update report permissions failed');
    res.status(400).json({ success: false, error: 'فشل في تحديث صلاحيات التقارير للفريق', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

const reportPermissionSchema = {
  params: { teamId: zId('الفريق'), competitionId: zId('المسابقة') },
  body: { canSubmit: zBoolean('canSubmit', { optional: true }), deadline: zString('الموعد النهائي', { max: 50 }).optional().nullable(), reopen: zBoolean('reopen', { optional: true }) },
};
router.patch('/report-permissions/:teamId/:competitionId', validate(reportPermissionSchema), async (req, res) => {
  try {
    const { canSubmit, deadline, reopen } = req.body;
    const parsedDeadline = deadline === undefined ? undefined : parseDeadline(deadline);
    const now = new Date();
    const allow = canSubmit !== false || Boolean(reopen);
    const row = await prisma.reportPermission.upsert({
      where: { teamId_competitionId: { teamId: req.params.teamId, competitionId: req.params.competitionId } },
      create: { teamId: req.params.teamId, competitionId: req.params.competitionId, canSubmit: allow, ...(parsedDeadline !== undefined && { deadline: parsedDeadline }), reopenedAt: reopen ? now : null, revokedAt: allow ? null : now, updatedByAdminId: req.user.id },
      update: { ...(canSubmit !== undefined && { canSubmit: allow }), ...(parsedDeadline !== undefined && { deadline: parsedDeadline }), ...(reopen && { reopenedAt: now, canSubmit: true }), ...(canSubmit !== undefined || reopen ? { revokedAt: allow ? null : now } : {}), updatedByAdminId: req.user.id }
    });
    res.json(row);
  } catch (err) {
    req.log.error({ err }, 'admin update report permission failed');
    res.status(400).json({ success: false, error: 'فشل في تحديث صلاحية التقرير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
