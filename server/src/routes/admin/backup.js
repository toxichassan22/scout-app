import { Router } from 'express';
import { generateFullBackup } from '../../backup-exporter.js';
import { syncGithubBackup } from '../../githubBackup.js';

const router = Router();

// Admin Backup Trigger Endpoint
router.post('/backup/github', async (req, res) => {
  try {
    res.json(await syncGithubBackup({ reason: 'admin-triggered' }));
  } catch (err) {
    req.log.error({ err }, 'admin GitHub backup trigger failed');
    res.status(500).json({ success: false, error: 'فشل في مزامنة النسخة الخاصة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

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
