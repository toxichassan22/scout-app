import { access, copyFile, mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import prisma from './db.js';
import {
  assertSafeBackupTarget,
  quoteSqliteString,
  resolveDatabasePath,
  sqliteFileUrl,
  timestampForFilename,
} from '../scripts/sqlite-operations-lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_ROOT = path.resolve(process.env.SQLITE_BACKUP_DIR || path.join(__dirname, '..', '..', 'scout-backups'));
const GDRIVE_WEBHOOK_URL = String(process.env.GDRIVE_WEBHOOK_URL || '').trim();
const GDRIVE_BEARER = String(process.env.GDRIVE_WEBHOOK_BEARER_TOKEN || '').trim();
const GDRIVE_SIGNING_SECRET = String(process.env.GDRIVE_WEBHOOK_SIGNING_SECRET || '').trim();

/**
 * Upload a file buffer to Google Drive with structured subfolder path support
 */
export async function uploadToGoogleDrive(fileName, mimeType, fileBuffer, folderPath = '') {
  if (!GDRIVE_WEBHOOK_URL) return { skipped: true, reason: 'GDRIVE_WEBHOOK_URL is not configured' };
  try {
    const fileData = fileBuffer.toString('base64');
    const body = JSON.stringify({ fileName, mimeType, fileData, folderPath });
    const headers = { 'Content-Type': 'application/json' };
    if (GDRIVE_BEARER) headers.Authorization = `Bearer ${GDRIVE_BEARER}`;
    if (GDRIVE_SIGNING_SECRET) headers['X-Webhook-Signature'] = crypto.createHmac('sha256', GDRIVE_SIGNING_SECRET).update(body).digest('hex');
    const response = await fetch(GDRIVE_WEBHOOK_URL, { method: 'POST', headers, body });
    if (!response.ok) throw new Error(`Drive webhook returned HTTP ${response.status}`);
    return await response.json().catch(() => ({}));
  } catch (err) {
    console.error(`[Google Drive Error] Failed to upload ${fileName}:`, err.message);
    return null;
  }
}

/**
 * Delete / Trash a file or team folder from Google Drive via Webhook
 */
export async function deleteFromGoogleDrive(fileName = '', folderPath = '', action = 'delete_file') {
  if (!GDRIVE_WEBHOOK_URL) return { skipped: true, reason: 'GDRIVE_WEBHOOK_URL is not configured' };
  try {
    const body = JSON.stringify({ action, fileName, folderPath });
    const headers = { 'Content-Type': 'application/json' };
    if (GDRIVE_BEARER) headers.Authorization = `Bearer ${GDRIVE_BEARER}`;
    if (GDRIVE_SIGNING_SECRET) headers['X-Webhook-Signature'] = crypto.createHmac('sha256', GDRIVE_SIGNING_SECRET).update(body).digest('hex');
    const response = await fetch(GDRIVE_WEBHOOK_URL, { method: 'POST', headers, body });
    if (!response.ok) throw new Error(`Drive webhook returned HTTP ${response.status}`);
    const result = await response.json().catch(() => ({}));
    console.log(`[Google Drive Delete Sync] ${action} ${folderPath ? folderPath + '/' : ''}${fileName}:`, result.result);
    return result;
  } catch (err) {
    console.error(`[Google Drive Delete Error] Failed to delete ${fileName}:`, err.message);
    return null;
  }
}

/**
 * Main Export & Backup Generator
 * Creates organized backup directory with:
 * 1. 01_DATABASE: Living SQLite database copy
 * 2. 02_SCORES_LEADERBOARD: Full JSON leaderboard & scores summary
 * 3. 03_TEAMS_DATA: Individual team folders with user info, scores, and uploaded PDF/Video reports
 */
export async function createVerifiedSqliteSnapshot({ destinationDirectory = path.join(BACKUP_ROOT, '01_DATABASE'), filePrefix = 'dev-backup' } = {}) {
  let source;
  let backup;
  let temporaryDirectory;
  let snapshotPath;
  try {
    await mkdir(destinationDirectory, { recursive: true });
    const sourceDbPath = resolveDatabasePath();
    const sourceInfo = await stat(sourceDbPath);
    if (!sourceInfo.isFile() || sourceInfo.size === 0) throw new Error(`SQLite database is not a non-empty file: ${sourceDbPath}`);
    source = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(sourceDbPath) } } });
    await source.$connect();
    const sourceIntegrity = await source.$queryRawUnsafe('PRAGMA integrity_check;');
    if (sourceIntegrity.length !== 1 || String(Object.values(sourceIntegrity[0])[0]).toLowerCase() !== 'ok') throw new Error(`Source database integrity check failed: ${JSON.stringify(sourceIntegrity)}`);
    await source.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE);');
    const name = `${filePrefix}-${timestampForFilename()}-${crypto.randomBytes(6).toString('hex')}.db`;
    snapshotPath = path.join(destinationDirectory, name);
    assertSafeBackupTarget(sourceDbPath, snapshotPath);
    await source.$executeRawUnsafe(`VACUUM INTO ${quoteSqliteString(snapshotPath.replaceAll('\\', '/'))};`);
    backup = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(snapshotPath) } } });
    await backup.$connect();
    const backupIntegrity = await backup.$queryRawUnsafe('PRAGMA integrity_check;');
    if (backupIntegrity.length !== 1 || String(Object.values(backupIntegrity[0])[0]).toLowerCase() !== 'ok') throw new Error(`Backup integrity check failed: ${JSON.stringify(backupIntegrity)}`);
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'scout-backup-verify-'));
    const restoreCandidate = path.join(temporaryDirectory, 'restore.db');
    await copyFile(snapshotPath, restoreCandidate);
    const restored = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(restoreCandidate) } } });
    try {
      await restored.$connect();
      const restoreIntegrity = await restored.$queryRawUnsafe('PRAGMA integrity_check;');
      if (restoreIntegrity.length !== 1 || String(Object.values(restoreIntegrity[0])[0]).toLowerCase() !== 'ok') throw new Error(`Restore candidate integrity check failed: ${JSON.stringify(restoreIntegrity)}`);
    } finally {
      await restored.$disconnect();
    }
    return { snapshotPath, sourceDbPath, sourceBytes: sourceInfo.size };
  } catch (error) {
    if (snapshotPath) await unlink(snapshotPath).catch(() => { });
    throw error;
  } finally {
    await backup?.$disconnect().catch(() => { });
    await source?.$disconnect().catch(() => { });
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function generateFullBackup() {
  let snapshotPath;
  try {
    const timestamp = timestampForFilename();
    console.log(`[Backup] Starting full structured backup generation at ${timestamp}...`);

    // Ensure local directory structure
    const dbBackupDir = path.join(BACKUP_ROOT, '01_DATABASE');
    const summaryDir = path.join(BACKUP_ROOT, '02_SCORES_LEADERBOARD');
    const teamsBackupDir = path.join(BACKUP_ROOT, '03_TEAMS_DATA');

    await Promise.all([
      mkdir(dbBackupDir, { recursive: true }),
      mkdir(teamsBackupDir, { recursive: true }),
      mkdir(summaryDir, { recursive: true }),
    ]);

    const snapshot = await createVerifiedSqliteSnapshot({ destinationDirectory: dbBackupDir, filePrefix: 'dev-backup' });
    snapshotPath = snapshot.snapshotPath;
    const timestampedDbName = path.basename(snapshotPath);
    const dbBuffer = await readFile(snapshotPath);
    await uploadToGoogleDrive(timestampedDbName, 'application/x-sqlite3', dbBuffer, '01_DATABASE');

    // 2️⃣ Fetch All Teams, Scores, Competitions & Reports
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        username: true,
        label: true,
        createdAt: true,
        scores: { include: { competition: true } },
        reports: true
      }
    });

    const competitions = await prisma.competition.findMany();

    // Calculate Summary & Leaderboard
    const leaderboard = teams.map(team => {
      const totalScore = team.scores.reduce((acc, curr) => acc + (curr.total || 0), 0);
      return {
        teamId: team.id,
        teamLabel: team.label,
        username: team.username,
        totalScore: Math.round(totalScore * 10) / 10,
        breakdown: team.scores.map(s => ({
          competition: s.competition?.name || s.competitionId,
          score: s.total,
          submittedAt: s.submittedAt
        }))
      };
    }).sort((a, b) => b.totalScore - a.totalScore);

    // Save Summary File
    const summaryData = {
      generatedAt: new Date().toISOString(),
      totalTeams: teams.length,
      competitionsCount: competitions.length,
      leaderboard
    };

    const summaryBuffer = Buffer.from(JSON.stringify(summaryData, null, 2), 'utf8');

    await writeFile(path.join(summaryDir, 'leaderboard_summary.json'), summaryBuffer);

    // Upload Leaderboard summary to Google Drive folder: 02_SCORES_LEADERBOARD
    await uploadToGoogleDrive(`leaderboard-summary-${timestamp}.json`, 'application/json', summaryBuffer, '02_SCORES_LEADERBOARD');

    // 3️⃣ Create Individual Team Folders & Organize Reports
    const uploadsSourceDir = path.join(__dirname, '..', 'uploads');

    for (const team of teams) {
      // Safe team folder name
      const safeFolderName = `Team_${team.username}_${team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const teamFolderPath = path.join(teamsBackupDir, safeFolderName);
      const teamReportsFolderPath = path.join(teamFolderPath, 'reports');

      await mkdir(teamReportsFolderPath, { recursive: true });

      // Save Team Profile & Scores JSON
      const teamDataBuffer = Buffer.from(JSON.stringify(team, null, 2), 'utf8');
      await writeFile(path.join(teamFolderPath, 'scores_detail.json'), teamDataBuffer);

      // Upload Team Profile JSON to Google Drive folder: 03_TEAMS_DATA/Team_Name
      await uploadToGoogleDrive('scores_detail.json', 'application/json', teamDataBuffer, `03_TEAMS_DATA/${safeFolderName}`);

      // Copy & Upload Team PDF/Video Reports if exists
      if (team.reports && team.reports.length > 0) {
        for (const report of team.reports) {
          if (report.fileUrl) {
            const fileNameOnly = path.basename(report.fileUrl);
            const sourceFilePath = path.join(uploadsSourceDir, fileNameOnly);
            try {
              await access(sourceFilePath);
              const safeReportName = `${String(report.title || 'report').replace(/[/\\?%*:|"<>]/g, '_') || 'report'}_${fileNameOnly}`;
              const reportBuffer = await readFile(sourceFilePath);
              await writeFile(path.join(teamReportsFolderPath, safeReportName), reportBuffer);

              // Upload Team Report to Google Drive folder: 03_TEAMS_DATA/Team_Name/reports
              await uploadToGoogleDrive(safeReportName, 'application/pdf', reportBuffer, `03_TEAMS_DATA/${safeFolderName}/reports`);
            } catch (fileError) {
              if (fileError.code !== 'ENOENT') throw fileError;
            }
          }
        }
      }
    }

    console.log('[Backup] Structured Backup & Google Drive Folders Sync completed!');
    return { success: true, timestamp, databaseBackup: snapshotPath, totalTeams: teams.length, gdriveSynced: Boolean(GDRIVE_WEBHOOK_URL) };

  } catch (err) {
    if (snapshotPath) await unlink(snapshotPath).catch(() => { });
    console.error('[Backup Error]:', err);
    return { success: false, error: err.message };
  }
}

// Allow CLI standalone execution
if (process.argv[1] && process.argv[1].endsWith('backup-exporter.js')) {
  generateFullBackup().then(result => process.exit(result.success ? 0 : 1));
}
