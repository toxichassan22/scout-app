import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_ROOT = path.join(__dirname, '..', '..', 'scout-backups');
const GDRIVE_WEBHOOK_URL = process.env.GDRIVE_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzHD74T61yvqwmYXReiDoO74vIQ_bRMuxylQy_QhGO37whehtCmzDAGHFvx1Nuf1RCyzA/exec';

/**
 * Upload a file buffer to Google Drive with structured subfolder path support
 */
async function uploadToGoogleDrive(fileName, mimeType, fileBuffer, folderPath = '') {
  try {
    const fileData = fileBuffer.toString('base64');
    const response = await fetch(GDRIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType, fileData, folderPath })
    });
    const result = await response.json().catch(() => ({}));
    console.log(`[Google Drive Sync] Uploaded ${folderPath ? folderPath + '/' : ''}${fileName}:`, result.result);
    return result;
  } catch (err) {
    console.error(`[Google Drive Error] Failed to upload ${fileName}:`, err.message);
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
export async function generateFullBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log(`[Backup] Starting full structured backup generation at ${timestamp}...`);

    // Ensure local directory structure
    const dbBackupDir = path.join(BACKUP_ROOT, '01_DATABASE');
    const summaryDir = path.join(BACKUP_ROOT, '02_SCORES_LEADERBOARD');
    const teamsBackupDir = path.join(BACKUP_ROOT, '03_TEAMS_DATA');

    fs.mkdirSync(dbBackupDir, { recursive: true });
    fs.mkdirSync(teamsBackupDir, { recursive: true });
    fs.mkdirSync(summaryDir, { recursive: true });

    // 1️⃣ Backup Living SQLite Database File
    const sourceDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
    if (fs.existsSync(sourceDbPath)) {
      const timestampedDbName = `dev-backup-${timestamp}.db`;
      const destDbPath = path.join(dbBackupDir, 'dev.db');
      const timestampedDbPath = path.join(dbBackupDir, timestampedDbName);
      fs.copyFileSync(sourceDbPath, destDbPath);
      fs.copyFileSync(sourceDbPath, timestampedDbPath);

      // Upload DB backup to Google Drive folder: 01_DATABASE
      const dbBuffer = fs.readFileSync(sourceDbPath);
      await uploadToGoogleDrive(timestampedDbName, 'application/x-sqlite3', dbBuffer, '01_DATABASE');
    }

    // 2️⃣ Fetch All Teams, Scores, Competitions & Reports
    const teams = await prisma.team.findMany({
      include: {
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

    fs.writeFileSync(
      path.join(summaryDir, 'leaderboard_summary.json'),
      summaryBuffer
    );

    // Upload Leaderboard summary to Google Drive folder: 02_SCORES_LEADERBOARD
    await uploadToGoogleDrive(`leaderboard-summary-${timestamp}.json`, 'application/json', summaryBuffer, '02_SCORES_LEADERBOARD');

    // 3️⃣ Create Individual Team Folders & Organize Reports
    const uploadsSourceDir = path.join(__dirname, '..', 'uploads');

    for (const team of teams) {
      // Safe team folder name
      const safeFolderName = `Team_${team.username}_${team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const teamFolderPath = path.join(teamsBackupDir, safeFolderName);
      const teamReportsFolderPath = path.join(teamFolderPath, 'reports');

      fs.mkdirSync(teamReportsFolderPath, { recursive: true });

      // Save Team Profile & Scores JSON
      const teamDataBuffer = Buffer.from(JSON.stringify(team, null, 2), 'utf8');
      fs.writeFileSync(
        path.join(teamFolderPath, 'scores_detail.json'),
        teamDataBuffer
      );

      // Upload Team Profile JSON to Google Drive folder: 03_TEAMS_DATA/Team_Name
      await uploadToGoogleDrive('scores_detail.json', 'application/json', teamDataBuffer, `03_TEAMS_DATA/${safeFolderName}`);

      // Copy & Upload Team PDF/Video Reports if exists
      if (team.reports && team.reports.length > 0) {
        for (const report of team.reports) {
          if (report.fileUrl) {
            const fileNameOnly = path.basename(report.fileUrl);
            const sourceFilePath = path.join(uploadsSourceDir, fileNameOnly);
            if (fs.existsSync(sourceFilePath)) {
              const safeReportName = `${report.title.replace(/[/\\?%*:|"<>]/g, '_') || 'report'}_${fileNameOnly}`;
              const reportBuffer = fs.readFileSync(sourceFilePath);
              fs.writeFileSync(path.join(teamReportsFolderPath, safeReportName), reportBuffer);

              // Upload Team Report to Google Drive folder: 03_TEAMS_DATA/Team_Name/reports
              await uploadToGoogleDrive(safeReportName, 'application/pdf', reportBuffer, `03_TEAMS_DATA/${safeFolderName}/reports`);
            }
          }
        }
      }
    }

    console.log('[Backup] Structured Backup & Google Drive Folders Sync completed!');
    return { success: true, timestamp, totalTeams: teams.length, gdriveSynced: true };

  } catch (err) {
    console.error('[Backup Error]:', err);
    return { success: false, error: err.message };
  }
}

// Allow CLI standalone execution
if (process.argv[1] && process.argv[1].endsWith('backup-exporter.js')) {
  generateFullBackup().then(() => process.exit(0));
}
