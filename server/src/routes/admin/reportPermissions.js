import { error } from '../../response.js';
import { Router } from 'express';
import prisma from '../../db.js';
import { validate, zString, zId, zBoolean } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, criteria: true, createdAt: true };

const router = Router();

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
    error(res, 'فشل في جلب الصلاحيات', 500);
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
    error(res, 'فشل في تحديث صلاحية التقرير', 400);
  }
});

export default router;
