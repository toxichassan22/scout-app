import { error } from '../../response.js';
import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import prisma from '../../db.js';
import { deleteFromGoogleDrive } from '../../backup-exporter.js';
import { validate, zId } from '../../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../../pagination.js';

const safeTeamSelect = { id: true, username: true, label: true, maxDevices: true, authVersion: true, createdAt: true };
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, passcode: true, entryCode: true, duration: true, criteria: true, createdAt: true };

const router = Router();

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
    error(res, 'فشل في جلب التقارير: ' + (err.message || ''), 500);
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
    error(res, 'فشل في حذف التقرير', 500);
  }
});

export default router;
