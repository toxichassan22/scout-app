import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

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

    let storedName = fileName || 'report.txt';
    let fileUrl = '';

    if (fileBase64) {
      const match = String(fileBase64).match(/^data:([^;]+);base64,(.+)$/);
      const raw = match ? match[2] : String(fileBase64);
      const buffer = Buffer.from(raw, 'base64');
      if (buffer.length > 8 * 1024 * 1024) {
        return res.status(400).json({ error: 'حجم الملف أكبر من 8 ميجابايت' });
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
        competitionId: competitionId || null,
        title: title || '',
        content: content || '',
        fileUrl,
        fileName: fileName || storedName,
      },
    });

    if (req.io) {
      req.io.to('admin').emit('admin:report:new', { reportId: report.id });
    }

    res.status(201).json({ success: true, report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل في رفع التقرير' });
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
