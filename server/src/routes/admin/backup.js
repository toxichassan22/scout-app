import { error } from '../../response.js';
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
    error(res, 'فشل في تشغيل المزامنة والنسخ الاحتياطي', 500);
  }
});

export default router;
