import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadToGoogleDrive } from '../backup-exporter.js';
import { MAX_UPLOAD_BYTES, safeStoredName, validateBase64Upload } from '../uploadSecurity.js';
import { isEmergencyFrozen } from '../freeze.js';
import { validate, zString, zId } from '../middleware/validate.js';
import { parsePagination, paginatedResponse } from '../pagination.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

const uploadsReady = fs.mkdir(uploadsDir, { recursive: true });
const safeCompetitionSelect = { id: true, name: true, slug: true, type: true, description: true, isOpen: true, duration: true, createdAt: true };

function rejectFileUrl(req, res, next) {
  if (Object.hasOwn(req.body || {}, 'fileUrl')) {
    return res.status(400).json({ success: false, error: 'لا يمكن تعيين رابط الملف مباشرة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
  next();
}

const reportBodySchema = {
  body: {
    title: zString('عنوان التقرير', { max: 300 }).optional(),
    content: zString('محتوى التقرير', { max: 100000 }).optional(),
    competitionId: zString('المسابقة', { min: 1, max: 100 }),
    fileName: zString('اسم الملف', { max: 255 }).optional(),
    fileBase64: zString('الملف', { max: 10000000 }).optional(),
  },
};

const reportPatchSchema = {
  params: { id: zId('التقرير') },
  body: {
    title: zString('عنوان التقرير', { max: 300 }).optional(),
    content: zString('محتوى التقرير', { max: 100000 }).optional(),
    fileName: zString('اسم الملف', { max: 255 }).optional(),
  },
};

const downloadSchema = { params: { id: zId('التقرير') } };

function validateReportFields({ title, content, fileName }) {
  if (title !== undefined && (typeof title !== 'string' || title.length > 300)) throw Object.assign(new Error('عنوان التقرير غير صالح'), { status: 400 });
  if (content !== undefined && (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_UPLOAD_BYTES)) throw Object.assign(new Error('محتوى التقرير أكبر من الحد المسموح'), { status: 400 });
  if (fileName !== undefined && (typeof fileName !== 'string' || fileName.length > 255)) throw Object.assign(new Error('اسم الملف غير صالح'), { status: 400 });
}

async function removeStoredFile(fileUrl) {
  const name = path.basename(fileUrl || '');
  if (name) await fs.unlink(path.join(uploadsDir, name)).catch(() => { });
}

// Team uploads a report (base64 file optional)
router.get('/permissions', authenticateToken, requireRole(['team']), async (req, res) => {
  const competitions = await prisma.competition.findMany({ orderBy: { createdAt: 'asc' }, select: safeCompetitionSelect });
  const permissions = await prisma.reportPermission.findMany({ where: { teamId: req.user.id } });
  const reports = await prisma.report.findMany({ where: { teamId: req.user.id, competitionId: { not: null } }, select: { competitionId: true, uploadedAt: true } });
  const byComp = Object.fromEntries(permissions.map(p => [p.competitionId, p]));
  const reportByComp = Object.fromEntries(reports.map(r => [r.competitionId, r]));
  const now = new Date();
  res.json(competitions.map(c => { const p = byComp[c.id]; const report = reportByComp[c.id]; const deadlinePassed = p?.deadline && new Date(p.deadline) < now; return { competitionId: c.id, competition: c, canSubmit: Boolean(p?.canSubmit !== false && !deadlinePassed), deadline: p?.deadline || null, reopened: Boolean(p?.reopenedAt), hasReport: Boolean(report), uploadedAt: report?.uploadedAt || null }; }));
});

router.post('/', authenticateToken, requireRole(['team']), rejectFileUrl, validate(reportBodySchema), async (req, res) => {
  try {
    const { title, content, competitionId, fileName, fileBase64 } = req.body;
    validateReportFields({ title, content, fileName });
    if (await isEmergencyFrozen()) return res.status(423).json({ error: 'تم إيقاف العمليات مؤقتاً', frozen: true });
    await uploadsReady;

    if (!title && !content && !fileBase64) {
      return res.status(400).json({ error: 'أدخل عنواناً أو محتوى أو ملفاً' });
    }

    if (!competitionId) return res.status(400).json({ error: 'competitionId مطلوب للتقارير الجديدة' });
    const competition = await prisma.competition.findFirst({ where: { OR: [{ id: String(competitionId) }, { slug: String(competitionId) }] } });
    if (!competition) return res.status(404).json({ error: 'المسابقة غير موجودة' });
    const permission = await prisma.reportPermission.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: competition.id } } });
    if (permission && (permission.canSubmit === false || (permission.deadline && new Date(permission.deadline) < new Date()))) return res.status(403).json({ error: 'لا تملك صلاحية إرسال التقرير حالياً' });

    const validCompId = competition.id;
    let storedName = fileName || 'report.txt';
    let fileUrl = '';

    if (fileBase64) {
      try {
        const validated = validateBase64Upload(fileBase64, fileName, req.body?.mimeType || req.body?.fileMime);
        storedName = safeStoredName(fileName, validated.ext);
        const diskPath = path.join(uploadsDir, storedName);
        await fs.writeFile(diskPath, validated.buffer, { flag: 'wx' });
        fileUrl = `/uploads/${storedName}`;
      } catch (uploadError) {
        return res.status(400).json({ error: uploadError.message });
      }
    } else {
      // Text-only report saved as .txt
      storedName = safeStoredName('report.txt', '.txt');
      const body = `العنوان: ${title || ''}\n\n${content || ''}`;
      if (Buffer.byteLength(body, 'utf8') > MAX_UPLOAD_BYTES) return res.status(400).json({ error: 'حجم التقرير أكبر من الحد المسموح' });
      await fs.writeFile(path.join(uploadsDir, storedName), body, { encoding: 'utf8', flag: 'wx' });
      fileUrl = `/uploads/${storedName}`;
    }

    const existingReport = await prisma.report.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: validCompId } } });
    let report;
    try {
      report = existingReport ? await prisma.report.update({ where: { id: existingReport.id }, data: { title: title || '', content: content || '', fileUrl, fileName: fileName || storedName, uploadedAt: new Date() } }) : await prisma.report.create({
        data: { teamId: req.user.id, competitionId: validCompId, title: title || '', content: content || '', fileUrl, fileName: fileName || storedName },
      });
    } catch (databaseError) {
      await removeStoredFile(fileUrl);
      throw databaseError;
    }
    if (existingReport?.fileUrl && existingReport.fileUrl !== fileUrl) await removeStoredFile(existingReport.fileUrl);

    // 🚀 Instant Google Drive Cloud Upload for Submitted Team Report
    (async () => {
      try {
        const team = await prisma.team.findUnique({ where: { id: req.user.id } });
        const teamLabel = team ? team.label : req.user.username;
        const safeFolderName = `Team_${req.user.username}_${teamLabel.replace(/[/\\?%*:|"<>]/g, '_')}`;
        const folderPath = `03_TEAMS_DATA/${safeFolderName}/reports`;

        const diskPath = path.join(uploadsDir, storedName);
        try {
          const fileBuffer = await fs.readFile(diskPath);
          const ext = path.extname(storedName).toLowerCase();
          let mimeType = 'application/pdf';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.mp4') mimeType = 'video/mp4';
          else if (ext === '.zip') mimeType = 'application/zip';
          else if (ext === '.txt') mimeType = 'text/plain';

          const uploadRes = await uploadToGoogleDrive(storedName, mimeType, fileBuffer, folderPath);
          req.log.info({ storedName, folderPath, result: uploadRes?.result }, 'report uploaded to Google Drive');
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }
      } catch (driveErr) {
        req.log.error({ driveErr }, 'report Google Drive upload failed');
      }
    })();

    if (req.io) {
      req.io.to('admin').emit('admin:report:new', { reportId: report.id });
    }

    res.status(201).json({ success: true, report });
  } catch (err) {
    req.log.error({ err }, 'report upload failed');
    res.status(err.statusCode || err.status || 500).json({ success: false, error: err.statusCode || err.status ? err.message : 'فشل في رفع التقرير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

// Team: resubmit an existing report using the same permission checks as POST
router.patch('/:id', authenticateToken, requireRole(['team']), rejectFileUrl, validate(reportPatchSchema), async (req, res) => {
  const existing = await prisma.report.findFirst({ where: { id: req.params.id, teamId: req.user.id } });
  if (!existing || !existing.competitionId) return res.status(404).json({ error: 'التقرير غير موجود' });
  const permission = await prisma.reportPermission.findUnique({ where: { teamId_competitionId: { teamId: req.user.id, competitionId: existing.competitionId } } });
  if (permission && (permission.canSubmit === false || (permission.deadline && new Date(permission.deadline) < new Date()))) return res.status(403).json({ error: 'إعادة الإرسال غير مسموحة حالياً' });
  const { title, content, fileName } = req.body || {};
  try { validateReportFields({ title, content, fileName }); } catch (error) { return res.status(error.status).json({ error: error.message }); }
  if (await isEmergencyFrozen()) return res.status(423).json({ error: 'تم إيقاف العمليات مؤقتاً', frozen: true });
  const report = await prisma.report.update({ where: { id: existing.id }, data: { ...(title !== undefined && { title }), ...(content !== undefined && { content }), ...(fileName !== undefined && { fileName: String(fileName).slice(0, 255) }), uploadedAt: new Date() } });
  res.json({ success: true, report });
});

// Authorized report download; the public static upload route is intentionally absent.
router.get('/:id/download', authenticateToken, validate(downloadSchema), async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id }, select: { id: true, teamId: true, fileUrl: true, fileName: true, competitionId: true } });
  if (!report) return res.status(404).json({ error: 'التقرير غير موجود' });
  let allowed = req.user.role === 'admin' || report.teamId === req.user.id;
  if (req.user.role === 'judge' && report.competitionId) {
    allowed = Boolean(await prisma.judgeCompetition.findUnique({ where: { judgeId_competitionId: { judgeId: req.user.id, competitionId: report.competitionId } }, select: { id: true } }));
  }
  if (!allowed) return res.status(403).json({ error: 'غير مصرح بتحميل هذا التقرير' });
  const fileName = path.basename(report.fileUrl || '');
  const filePath = path.join(uploadsDir, fileName);
  if (!fileName || !filePath.startsWith(`${uploadsDir}${path.sep}`)) return res.status(404).json({ error: 'ملف التقرير غير موجود' });
  try { await fs.access(filePath); } catch { return res.status(404).json({ error: 'ملف التقرير غير موجود' }); }
  return res.download(filePath, report.fileName || fileName);
});

// Team: list own reports
router.get('/mine', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const where = { teamId: req.user.id };
    const [reports, total] = await Promise.all([
      prisma.report.findMany({ where, orderBy: { uploadedAt: 'desc' }, skip, take: limit }),
      prisma.report.count({ where }),
    ]);
    res.json(paginatedResponse({ data: reports, page, limit, total }));
  } catch (err) {
    req.log.error({ err }, 'failed to fetch reports');
    res.status(500).json({ success: false, error: 'فشل في جلب التقارير', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

export default router;
