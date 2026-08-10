import { Router } from 'express';
import { generateFullBackup } from '../../backup-exporter.js';
import { syncGithubBackup } from '../../githubBackup.js';

const router = Router();

// A full backup snapshots the database and walks every team's files, so it can run
// for minutes. Awaiting it inside the request meant Nginx timed the admin out with
// no way to tell whether it had succeeded. State is kept here so the dashboard can
// poll instead.
let lastRun = null;
let running = false;

async function runFullBackup(log) {
  running = true;
  const startedAt = new Date().toISOString();
  try {
    const result = await generateFullBackup();
    lastRun = { ...result, startedAt, finishedAt: new Date().toISOString() };
  } catch (err) {
    log?.error({ err }, 'background full backup failed');
    lastRun = { success: false, error: err.message, startedAt, finishedAt: new Date().toISOString() };
  } finally {
    running = false;
  }
}

// Admin Backup Trigger Endpoint
router.post('/backup/github', async (req, res) => {
  try {
    res.json(await syncGithubBackup({ reason: 'admin-triggered' }));
  } catch (err) {
    req.log.error({ err }, 'admin GitHub backup trigger failed');
    res.status(500).json({ success: false, error: 'فشل في مزامنة النسخة الخاصة', requestId: req.requestId, timestamp: new Date().toISOString() });
  }
});

router.post('/backup/trigger', (req, res) => {
  if (running) {
    return res.status(409).json({ success: false, error: 'النسخ الاحتياطي يعمل بالفعل', running: true, requestId: req.requestId, timestamp: new Date().toISOString() });
  }
  const log = req.log;
  // Deliberately not awaited: the response returns immediately and the dashboard
  // polls GET /admin/backup/status for the outcome.
  runFullBackup(log);
  res.status(202).json({ success: true, started: true, message: 'بدأ النسخ الاحتياطي في الخلفية' });
});

router.get('/backup/status', (req, res) => {
  res.json({ success: true, running, lastRun });
});

export default router;
