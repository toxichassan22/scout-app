import crypto from 'node:crypto';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { pathToFileURL } from 'node:url';
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

async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function safePathPart(value, fallback) {
  return String(value || fallback)
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 100) || fallback;
}

function reportLocation({ team, competitionName, report }) {
  const teamName = safePathPart(team?.label || team?.username, 'team');
  const teamId = safePathPart(team?.id, 'team').slice(0, 8);
  const teamKey = `${teamName}-${teamId}`;
  const competitionNamePart = safePathPart(competitionName || report?.competitionName, 'competition');
  const competitionId = safePathPart(report?.competitionId, 'competition');
  const competitionKey = `${competitionNamePart}-${competitionId}`;
  const storedName = path.basename(String(report?.fileUrl || report?.fileName || 'report.txt'));
  const extension = path.extname(storedName).toLowerCase() || '.txt';
  const folder = `${prefix}/${teamKey}/${competitionKey}`;
  return {
    filePath: `${folder}/current${extension}`,
    metadataPath: `${folder}/metadata.json`,
  };
}

function legacyReadableReportLocation({ team, report }) {
  const teamName = safePathPart(team?.label || team?.username, 'team');
  const teamId = safePathPart(team?.id, 'team').slice(0, 8);
  const teamKey = `${teamName}-${teamId}`;
  const competitionKey = safePathPart(report?.competitionId, 'competition');
  const storedName = path.basename(String(report?.fileUrl || report?.fileName || 'report.txt'));
  const extension = path.extname(storedName).toLowerCase() || '.txt';
  const folder = `${prefix}/${teamKey}/${competitionKey}`;
  return {
    filePath: `${folder}/current${extension}`,
    metadataPath: `${folder}/metadata.json`,
  };
}

function legacyReportLocation({ team, report }) {
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

export function getHuggingFaceReportLocation({ team, competitionName, report }) {
  return reportLocation({ team, competitionName, report });
}

export async function syncReportToHuggingFace({ team, competitionName, report, filePath, previousReport }) {
  if (!isHuggingFaceReportsConfigured()) return { skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  const contentHash = await sha256File(filePath);
  const location = reportLocation({ team, competitionName, report });
  const previousLocation = previousReport ? reportLocation({ team, competitionName, report: previousReport }) : null;
  const legacyLocations = [legacyReadableReportLocation({ team, report }), legacyReportLocation({ team, report })]
    .filter((candidate, index, list) => candidate.metadataPath !== location.metadataPath && list.findIndex(item => item.metadataPath === candidate.metadataPath) === index);
  const ext = path.extname(String(report.fileName || '')).toLowerCase();
  const mimeType = ext === '.pdf'
    ? 'application/pdf'
    : ext === '.pptx'
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : ext === '.docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/octet-stream';
  const metadata = publicMetadata({ team, competitionName, report, filePath: location.filePath, contentHash, mimeType });

  return withOperationLock(async () => {
    const remoteMetadata = await readRemoteMetadata(location.metadataPath);
    const legacyEntries = [];
    for (const legacyLocation of legacyLocations) {
      const legacyMetadata = await readRemoteMetadata(legacyLocation.metadataPath);
      if (legacyMetadata) legacyEntries.push({ location: legacyLocation, metadata: legacyMetadata });
    }
    const knownMetadata = remoteMetadata || legacyEntries[0]?.metadata;
    const contentChanged = knownMetadata?.contentHash !== metadata.contentHash || knownMetadata?.filePath !== location.filePath;
    const metadataChanged = remoteMetadata?.metadataHash !== metadata.metadataHash;
    const operations = [];

    if (contentChanged) {
      operations.push({ operation: 'addOrUpdate', path: location.filePath, content: pathToFileURL(filePath) });
    }
    if (metadataChanged || contentChanged || !remoteMetadata) {
      operations.push({ operation: 'addOrUpdate', path: location.metadataPath, content: new Blob([JSON.stringify(metadata, null, 2)]) });
    }
    const oldFilePaths = new Set([
      previousLocation?.filePath,
      knownMetadata?.filePath,
      ...legacyEntries.map(entry => entry.metadata.filePath),
    ].filter(Boolean));
    for (const oldFilePath of oldFilePaths) {
      if (oldFilePath !== location.filePath) operations.push({ operation: 'delete', path: oldFilePath });
    }
    const oldMetadataPaths = new Set([
      previousLocation?.metadataPath,
      ...legacyEntries.map(entry => entry.location.metadataPath),
    ].filter(Boolean));
    for (const oldMetadataPath of oldMetadataPaths) {
      if (oldMetadataPath !== location.metadataPath) operations.push({ operation: 'delete', path: oldMetadataPath });
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

export async function deleteReportFromHuggingFace({ team, competitionName, report }) {
  if (!isHuggingFaceReportsConfigured()) return { skipped: true, reason: 'HF_REPORTS_REPO or HF_REPORTS_TOKEN is not configured' };
  const location = reportLocation({ team, competitionName, report });
  const legacyLocations = [legacyReadableReportLocation({ team, report }), legacyReportLocation({ team, report })]
    .filter((candidate, index, list) => candidate.metadataPath !== location.metadataPath && list.findIndex(item => item.metadataPath === candidate.metadataPath) === index);

  return withOperationLock(async () => {
    const remoteMetadata = await readRemoteMetadata(location.metadataPath);
    const legacyEntries = [];
    for (const legacyLocation of legacyLocations) {
      const legacyMetadata = await readRemoteMetadata(legacyLocation.metadataPath);
      if (legacyMetadata) legacyEntries.push({ location: legacyLocation, metadata: legacyMetadata });
    }
    if (!remoteMetadata && legacyEntries.length === 0) return { success: true, skipped: true, reason: 'report is not present in Hugging Face' };
    const paths = new Set([
      remoteMetadata?.filePath,
      remoteMetadata ? location.metadataPath : null,
      ...legacyEntries.flatMap(entry => [entry.metadata.filePath, entry.location.metadataPath]),
    ].filter(Boolean));
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
