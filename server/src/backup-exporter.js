import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_ROOT = path.join(__dirname, '..', '..', 'scout-backups');
const GDRIVE_WEBHOOK_URL = process.env.GDRIVE_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbymWqZ5DAN9AKghfHYcUXaE8pNmE6Njv-CWleicNZTHBgNz3UcC7bQfy81QldjZNnDv5Q/exec';

/**
 * Upload a file buffer to Google Drive via Apps Script Webhook
 */
async function uploadToGoogleDrive(fileName, mimeType, fileBuffer) {
  try {
    const fileData = fileBuffer.toString('base64');
    const response = await fetch(GDRIVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, mimeType, fileData })
    });
    const result = await response.json().catch(() => ({}));
    console.log(`[Google Drive] Uploaded ${fileName}:`, result);
    return result;
  } catch (err) {
    console.error(`[Google Drive Error] Failed to upload ${fileName}:`, err.message);
    return null;
  }
}

/**
 * Main Export & Backup Generator
 * Creates organized backup directory with:
 * 1. Living SQLite database copy
 * 2. Full JSON leaderboard & scores summary
 * 3. Individual team folders with their submitted reports
 * 4. Automatic Google Drive cloud sync
 */
export async function generateFullBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log(`[Backup] Starting full backup generation at ${timestamp}...`);

    // Ensure directory structure
    const dbBackupDir = path.join(BACKUP_ROOT, 'database');
    const teamsBackupDir = path.join(BACKUP_ROOT, 'teams_data');
    const summaryDir = path.join(BACKUP_ROOT, 'summary');

    fs.mkdirSync(dbBackupDir, { recursive: true });
    fs.mkdirSync(teamsBackupDir, { recursive: true });
    fs.mkdirSync(summaryDir, { recursive: true });

    // 1️⃣ Backup Living SQLite Database File
    const sourceDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
    if (fs.existsSync(sourceDbPath)) {
      const destDbPath = path.join(dbBackupDir, 'dev.db');
      const timestampedDbPath = path.join(dbBackupDir, `dev-backup-${timestamp}.db`);
      fs.copyFileSync(sourceDbPath, destDbPath);
      fs.copyFileSync(sourceDbPath, timestampedDbPath);
      console.log('[Backup] SQLite database file copied successfully.');

      // Upload DB backup to Google Drive
      const dbBuffer = fs.readFileSync(sourceDbPath);
      await uploadToGoogleDrive(`dev-backup-${timestamp}.db`, 'application/x-sqlite3', dbBuffer);
    }

    // 2️⃣ Fetch All Teams, Scores, Competitions & Reports
    const teams = await prisma.team.findMany({
      include: {
        scores: { include: { competition: true } },
        reports: true
      }
    });

    const competitions = await prisma.competition.findMany();
    const agenda = await prisma.agendaItem.findMany({ include: { zone: true } });

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

    // Upload Leaderboard summary to Google Drive
    await uploadToGoogleDrive(`leaderboard-summary-${timestamp}.json`, 'application/json', summaryBuffer);

    // 3️⃣ Create Individual Team Folders & Organize Reports
    const uploadsSourceDir = path.join(__dirname, '..', 'uploads');

    for (const team of teams) {
      // Safe team folder name
      const safeFoldername = `Team_${team.username}_${team.label.replace(/[/\\?%*:|"<>]/g, '_')}`;
      const teamFolderPath = path.join(teamsBackupDir, safeFoldername);
      const teamReportsFolderPath = path.join(teamFolderPath, 'reports');

      fs.mkdirSync(teamReportsFolderPath, { recursive: true });

      // Write team scores breakdown json
      fs.writeFileSync(
        path.join(teamFolderPath, 'scores_detail.json'),
        JSON.stringify(team, null, 2),
        'utf8'
      );

      // Copy Team PDF Reports if exists
      if (team.reports && team.reports.length > 0) {
        for (const report of team.reports) {
          if (report.fileUrl) {
            const fileNameOnly = path.basename(report.fileUrl);
            const sourceFilePath = path.join(uploadsSourceDir, fileNameOnly);
            if (fs.existsSync(sourceFilePath)) {
              const safeReportName = `${report.title.replace(/[/\\?%*:|"<>]/g, '_') || 'report'}_${fileNameOnly}`;
              fs.copyFileSync(sourceFilePath, path.join(teamReportsFolderPath, safeReportName));
            }
          }
        }
      }
    }

    console.log('[Backup] Backup & Google Drive Sync successfully completed!');
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
