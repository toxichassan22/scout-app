import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { uploadToGoogleDrive } from '../backup-exporter.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Team uploads a report (base64 file optional)
router.post('/', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const { title, content, competitionId, fileName, fileBase64 } = req.body || {};

    if (!title && !content && !fileBase64) {
      return res.status(400).json({ error: 'أدخل عنواناً أو محتوى أو ملفاً' });
    }

    // Verify valid competition ID or fallback to null (to satisfy foreign key)
    let validCompId = null;
    if (competitionId) {
      const comp = await prisma.competition.findFirst({
        where: {
          OR: [
            { id: String(competitionId) },
            { slug: String(competitionId) }
          ]
        }
      });
      if (comp) validCompId = comp.id;
    }

    let storedName = fileName || 'report.txt';
    let fileUrl = '';

    if (fileBase64) {
      const match = String(fileBase64).match(/^data:([^;]+);base64,(.+)$/);
      const raw = match ? match[2] : String(fileBase64);
      const buffer = Buffer.from(raw, 'base64');
      if (buffer.length > 50 * 1024 * 1024) {
        return res.status(400).json({ error: 'حجم الملف أكبر من 50 ميجابايت' });
      }
      const safeBase = (fileName || `report-${Date.now()}`).replace(/[^a-zA-Z0-9._\-\u0600-\u06FF]/g, '_');
      storedName = `${Date.now()}-${safeBase}`;
      const diskPath = path.join(uploadsDir, storedName);
      fs.writeFileSync(diskPath, buffer);
      fileUrl = `/uploads/${storedName}`;
    } else {
      // Text-only report saved as .txt
      storedName = `${Date.now()}-${req.user.id}.txt`;
      const body = `العنوان: ${title || ''}\n\n${content || ''}`;
      fs.writeFileSync(path.join(uploadsDir, storedName), body, 'utf8');
      fileUrl = `/uploads/${storedName}`;
    }

    const report = await prisma.report.create({
      data: {
        teamId: req.user.id,
        competitionId: validCompId,
        title: title || '',
        content: content || '',
        fileUrl,
        fileName: fileName || storedName,
      },
    });

    // 🚀 Instant Google Drive Cloud Upload for Submitted Team Report
    (async () => {
      try {
        const team = await prisma.team.findUnique({ where: { id: req.user.id } });
        const teamLabel = team ? team.label : req.user.username;
        const safeFolderName = `Team_${req.user.username}_${teamLabel.replace(/[/\\?%*:|"<>]/g, '_')}`;
        const folderPath = `03_TEAMS_DATA/${safeFolderName}/reports`;
        
        const diskPath = path.join(uploadsDir, storedName);
        if (fs.existsSync(diskPath)) {
          const fileBuffer = fs.readFileSync(diskPath);
          const ext = path.extname(storedName).toLowerCase();
          let mimeType = 'application/pdf';
          if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
          else if (ext === '.png') mimeType = 'image/png';
          else if (ext === '.mp4') mimeType = 'video/mp4';
          else if (ext === '.zip') mimeType = 'application/zip';
          else if (ext === '.txt') mimeType = 'text/plain';

          const uploadRes = await uploadToGoogleDrive(storedName, mimeType, fileBuffer, folderPath);
          console.log(`[Instant Drive Upload] Report ${storedName} uploaded to Google Drive folder: ${folderPath}`, uploadRes?.result);
        }
      } catch (driveErr) {
        console.error('[Instant Drive Upload Error]:', driveErr.message);
      }
    })();

    if (req.io) {
      req.io.to('admin').emit('admin:report:new', { reportId: report.id });
    }

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error('[Report Upload Backend Error]:', err);
    res.status(500).json({ error: 'فشل في رفع التقرير: ' + err.message });
  }
});

// Team: list own reports
router.get('/mine', authenticateToken, requireRole(['team']), async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: { teamId: req.user.id },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'فشل في جلب التقارير' });
  }
});

export default router;
