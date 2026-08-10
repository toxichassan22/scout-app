import logger from './logger.js';
import { requestGithubBackup } from './githubBackup.js';
import { generateFullBackup } from './backup-exporter.js';

// Both targets are driven from one place so a meaningful change — a finalised score,
// for example — reaches the private repo and Drive without the caller knowing which
// backends exist. Calls are coalesced: a burst of finalised scores produces one run,
// not one per score.
const debounceMs = Math.max(5_000, Number(process.env.BACKUP_DEBOUNCE_MS) || 30_000);
let driveTimer;
let driveRunning = false;

async function runDriveBackup(reason) {
  if (driveRunning) return;
  driveRunning = true;
  try {
    const result = await generateFullBackup();
    if (result?.success) {
      logger.info({ reason, uploaded: result.uploaded, unchanged: result.unchanged }, 'drive backup finished');
    } else if (result?.error) {
      logger.warn({ reason, error: result.error }, 'drive backup reported a failure');
    }
  } catch (err) {
    logger.warn({ err, reason }, 'drive backup threw');
  } finally {
    driveRunning = false;
  }
}

/**
 * Ask for the data to be backed up soon. Never awaited by request handlers: a
 * backup problem must not fail the operation that triggered it.
 */
export function requestDataBackup({ reason = 'event' } = {}) {
  requestGithubBackup({ reason });

  if (driveTimer) return;
  driveTimer = setTimeout(() => {
    driveTimer = undefined;
    runDriveBackup(reason);
  }, debounceMs);
  driveTimer.unref?.();
}

export function stopDataBackupScheduler() {
  if (driveTimer) clearTimeout(driveTimer);
  driveTimer = undefined;
}
