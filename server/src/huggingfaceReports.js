import crypto from 'node:crypto';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { commit, downloadFile } from '@huggingface/hub';

const repoId = String(process.env.HF_REPORTS_REPO || '').trim();
const token = String(process.env.HF_REPORTS_TOKEN || '').trim();
const revision = String(process.env.HF_REPORTS_REVISION || 'main').trim() || 'main';
const prefix = String(process.env.HF_REPORTS_PREFIX || 'reports').trim().replace(/^\/+|\/+$/g, '') || 'reports';
const repo = { type: 'dataset', name: repoId };
let operationQueue = Promise.resolve();
let bulkSyncStatus = {
  running: false,
  jobId: null,
  startedAt: null,
  finishedAt: null,
  processed: 0,
  total: 0,
  synced: 0,
  skipped: 0,
  failed: 0,
  failures: [],
  error: null,
};

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safePathPart(value, fallback) {
  return String(value || fallback)
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 100) || fallback;
}

function reportLocation({ team, report }) {
  const teamKey = safePathPart(team?.id, 'team');
  const competitionKey = safePathPart(report?.competitionId, 'competition');
  const storedName = path.basename(String(report?.fileUrl || report?.fileName || 'report.txt'));
  const extension = path.extname(storedName).toLowerCase() || '.txt';
  const folder = `${prefix}/${teamKey}/${competitionKey}`;
  return {
    filePath: `${folder}/current${extension}`,
    metadataPath: `${folder}/metadata.json`,
  };
}

function withOperationLock(operation) {
  const next = operationQueue.catch(() => {}).then(operation);
  operationQueue = next;
  return next.finally(() => {
    if (operationQueue === next) operationQueue = Promise.resolve();
  });
}

async function readRemoteMetadata(metadataPath) {
  try {
    const file = await downloadFile({ repo, path: metadataPath, revision, accessToken: token });
    if (!file) return null;
    return JSON.parse(await file.text());
  } catch (error) {
    if (String(error?.message || '').includes('404')) return null;
    throw error;
  }
}

async function createCommit(operations, title) {
  return commit({
    repo,
    accessToken: token,
    branch: revision,
    title,
    operations,
  });
}

function publicMetadata({ team, competitionName, report, filePath, contentHash, mimeType }) {
  const base = {
    version: 1,
    teamLabel: team?.label || team?.username || 'فريق',
    competitionId: report.competitionId || null,
    competitionName: competitionName || 'مسابقة',
    fileName: report.fileName || path.basename(String(report.fileUrl || 'report.txt')),
    filePath,
    contentHash,
    mimeType,
  };
  return { ...base, metadataHash: sha256(Buffer.from(JSON.stringify(base), 'utf8')) };
}

export function isHuggingFaceReportsConfigured() {
  return Boolean(repoId && token);
}

export function getHuggingFaceReportLocation({ team, report }) {
  return reportLocation({ team, report });
}

export async function syncReportToHuggingFace({ team, competitionName, report, filePath, previousReport }) {
  if (!isHuggingFaceReportsConfigured()) return { skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  const fileBuffer = await readFile(filePath);
  const location = reportLocation({ team, report });
  const previousLocation = previousReport ? reportLocation({ team, report: previousReport }) : null;
  const mimeType = String(report.fileName || '').toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
  const metadata = publicMetadata({ team, competitionName, report, filePath: location.filePath, contentHash: sha256(fileBuffer), mimeType });

  return withOperationLock(async () => {
    const remoteMetadata = await readRemoteMetadata(location.metadataPath);
    const contentChanged = remoteMetadata?.contentHash !== metadata.contentHash || remoteMetadata?.filePath !== location.filePath;
    const metadataChanged = remoteMetadata?.metadataHash !== metadata.metadataHash;
    const operations = [];

    if (contentChanged) {
      operations.push({ operation: 'addOrUpdate', path: location.filePath, content: new Blob([fileBuffer]) });
    }
    if (metadataChanged || contentChanged || !remoteMetadata) {
      operations.push({ operation: 'addOrUpdate', path: location.metadataPath, content: new Blob([JSON.stringify(metadata, null, 2)]) });
    }
    const oldFilePath = previousLocation?.filePath || remoteMetadata?.filePath;
    if (oldFilePath && oldFilePath !== location.filePath) {
      operations.push({ operation: 'delete', path: oldFilePath });
    }

    if (operations.length === 0) return { success: true, skipped: true, verified: true, filePath: location.filePath };
    const result = await createCommit(operations, `Sync report ${report.competitionId || report.id}`);
    const verifiedMetadata = await readRemoteMetadata(location.metadataPath);
    if (!verifiedMetadata || verifiedMetadata.contentHash !== metadata.contentHash || verifiedMetadata.filePath !== location.filePath) {
      throw new Error(`Hugging Face verification failed for ${location.filePath}`);
    }
    return { success: true, skipped: false, verified: true, filePath: location.filePath, commit: result };
  });
}

export async function deleteReportFromHuggingFace({ team, report }) {
  if (!isHuggingFaceReportsConfigured()) return { skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  const location = reportLocation({ team, report });

  return withOperationLock(async () => {
    const remoteMetadata = await readRemoteMetadata(location.metadataPath);
    if (!remoteMetadata) return { success: true, skipped: true, reason: 'report is not present in Hugging Face' };
    const paths = new Set([location.filePath, remoteMetadata.filePath, location.metadataPath].filter(Boolean));
    const result = await createCommit([...paths].map(pathInRepo => ({ operation: 'delete', path: pathInRepo })), `Delete report ${report.competitionId || report.id}`);
    return { success: true, skipped: false, deleted: [...paths], commit: result };
  });
}

export async function syncReportsToHuggingFace(reports, uploadsDir, onProgress) {
  if (!isHuggingFaceReportsConfigured()) return { skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  const failures = [];
  const eligibleReports = reports.filter(report => report.fileUrl && report.team);

  for (let index = 0; index < eligibleReports.length; index += 1) {
    const report = eligibleReports[index];
    const filePath = path.join(uploadsDir, path.basename(report.fileUrl));
    try {
      const result = await syncReportToHuggingFace({
        team: report.team,
        competitionName: report.competition?.name || report.competitionId,
        report,
        filePath,
      });
      if (result.skipped) skipped += 1;
      else synced += 1;
    } catch (error) {
      failed += 1;
      if (failures.length < 25) failures.push({ reportId: report.id, error: error.message || 'Unknown Hugging Face sync error' });
    }
    onProgress?.({ processed: index + 1, total: eligibleReports.length, synced, skipped, failed, failures });
  }

  return { success: failed === 0, synced, skipped, failed, failures, total: eligibleReports.length, repository: repoId };
}

export function getHuggingFaceSyncStatus() {
  return { ...bulkSyncStatus, repository: repoId };
}

export function startHuggingFaceReportsSync(reports, uploadsDir) {
  if (!isHuggingFaceReportsConfigured()) return { started: false, skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  if (bulkSyncStatus.running) return { started: false, running: true, jobId: bulkSyncStatus.jobId, ...getHuggingFaceSyncStatus() };

  const jobId = crypto.randomUUID();
  bulkSyncStatus = {
    running: true,
    jobId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    processed: 0,
    total: reports.filter(report => report.fileUrl && report.team).length,
    synced: 0,
    skipped: 0,
    failed: 0,
    failures: [],
    error: null,
  };

  syncReportsToHuggingFace(reports, uploadsDir, progress => {
    bulkSyncStatus = { ...bulkSyncStatus, ...progress };
  }).then(result => {
    bulkSyncStatus = {
      ...bulkSyncStatus,
      ...result,
      running: false,
      finishedAt: new Date().toISOString(),
    };
  }).catch(error => {
    bulkSyncStatus = {
      ...bulkSyncStatus,
      running: false,
      finishedAt: new Date().toISOString(),
      error: error.message || 'Hugging Face sync failed',
    };
  });

  return { started: true, running: true, jobId, ...getHuggingFaceSyncStatus() };
}
