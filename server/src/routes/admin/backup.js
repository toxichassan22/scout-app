import { Router } from 'express';
import { generateFullBackup } from '../../backup-exporter.js';

const router = Router();

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

export default router;
