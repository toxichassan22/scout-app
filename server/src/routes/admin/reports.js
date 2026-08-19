import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import prisma from '../../db.js';
import { deleteFromGoogleDrive } from '../../backup-exporter.js';
import { getReportDriveLocations } from '../../uploadSecurity.js';
import { isHuggingFaceReportsConfigured, deleteReportFromHuggingFace } from '../../huggingfaceReports.js';
import { requestDataBackup } from '../../backupScheduler.js';
import { requestGithubBackup } from '../../githubBackup.js';
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
    res.status(500).json({ success: false, error: 'فشل في جلب التقارير: ' + (err.message || ''), requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.delete('/reports/:id', validate({ params: { id: zId('التقرير') } }), async (req, res) => {
  try {
    const reportId = req.params.id;
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        team: { select: safeTeamSelect },
        competition: { select: { name: true } },
      }
    });

    if (report) {
      if (report.fileUrl) {
        const fileName = path.basename(report.fileUrl);
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const fp = path.join(uploadsDir, fileName);
        if (fs.existsSync(fp)) {
          try { fs.unlinkSync(fp); } catch (_) { }
        }

      }

      if (report.team) {
        if (isHuggingFaceReportsConfigured()) {
          await deleteReportFromHuggingFace({ team: report.team, competitionName: report.competition?.name || report.competitionId, report });
        } else {
          const locations = getReportDriveLocations({
            team: report.team,
            competitionName: report.competition?.name || report.competitionId || 'مسابقة',
            report,
          });
          const results = await Promise.all(locations.map(location => deleteFromGoogleDrive(location.fileName, location.folderPath)));
          if (results.some(result => result === null)) {
            req.log.warn({ reportId, locations }, 'some Google Drive report deletions failed');
          }
        }
      }

      await prisma.report.delete({ where: { id: reportId } });
      if (isHuggingFaceReportsConfigured()) requestGithubBackup({ reason: 'admin-report-deleted' });
      else requestDataBackup({ reason: 'admin-report-deleted' });
    }

    res.json({ success: true, message: 'تم حذف التقرير والملف بنجاح' });
  } catch (err) {
    req.log.error({ err }, 'admin delete report failed');
    res.status(500).json({ success: false, error: 'فشل في حذف التقرير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
