import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabasePath } from '../scripts/sqlite-operations-lib.mjs';
import logger from './logger.js';

const repo = String(process.env.GITHUB_BACKUP_REPO || '').trim();
const token = String(process.env.GITHUB_BACKUP_TOKEN || '').trim();
const branch = String(process.env.GITHUB_BACKUP_BRANCH || 'main').trim();
const rootPath = String(process.env.GITHUB_BACKUP_PATH || 'scout-data').replace(/^\/+|\/+$/g, '');
const encryptionSecret = String(process.env.GITHUB_BACKUP_ENCRYPTION_KEY || '').trim();
const intervalMs = Math.max(60_000, Number(process.env.GITHUB_BACKUP_INTERVAL_MS) || 300_000);
// A full sync re-uploads the database plus every stored upload, so event-driven
// backups are coalesced into one run instead of firing per event.
const debounceMs = Math.max(5_000, Number(process.env.GITHUB_BACKUP_DEBOUNCE_MS) || 30_000);
let timer;
let debounceTimer;
let running = false;

function configured() {
  return Boolean(repo && token);
}

function encryptedBuffer(buffer) {
  if (!encryptionSecret) return buffer;
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([Buffer.from('SCOUTENC1'), iv, cipher.getAuthTag(), encrypted]);
}

async function walk(directory, prefix = '') {
  const result = [];
  let entries = [];
  try { entries = await fs.readdir(directory, { withFileTypes: true }); } catch { return result; }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const relative = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await walk(absolute, relative));
    else result.push({ absolute, relative: relative.replaceAll('\\', '/') });
  }
  return result;
}

function apiUrl(filePath = '') {
  const encoded = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `https://api.github.com/repos/${repo}/contents/${encoded}`;
}

async function githubRequest(url, options = {}, tolerate = [404]) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && !tolerate.includes(response.status)) {
    const detail = body?.message ? ` (${body.message})` : '';
    throw new Error(`GitHub backup request failed with HTTP ${response.status}${detail}`);
  }
  return { response, body };
}

function plaintextDigest(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Previous run's plaintext digests, read from the manifest already stored in the
 * repository. Keeping them remote means a rebuilt server still knows what is there.
 * Returns the manifest's blob sha too, so writing it back costs no extra request.
 */
async function readRemoteManifest() {
  const url = apiUrl(`${rootPath}/manifest.json`);
  const { response, body } = await githubRequest(`${url}?ref=${encodeURIComponent(branch)}`, {}, [404, 409]);
  if (!response.ok || !body?.content) return { digests: {}, sha: undefined };
  try {
    const parsed = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
    return { digests: parsed?.digests && typeof parsed.digests === 'object' ? parsed.digests : {}, sha: body.sha };
  } catch {
    return { digests: {}, sha: body.sha };
  }
}

async function putFile(relativePath, buffer, message, knownSha) {
  const url = apiUrl(`${rootPath}/${relativePath}`);
  let sha = knownSha;
  if (sha === undefined) {
    // A repository with no commits yet answers 409 "Git Repository is empty" here, and
    // a path that simply does not exist answers 404. Both mean "create it", so neither
    // may abort the backup. The write below stays strict.
    const existing = await githubRequest(`${url}?ref=${encodeURIComponent(branch)}`, {}, [404, 409]);
    sha = existing.response.ok && existing.body.sha ? existing.body.sha : undefined;
  }
  const payload = { message, content: buffer.toString('base64'), branch };
  if (sha) payload.sha = sha;
  // No tolerated statuses on the write: a 404 here means the repository or the token
  // is wrong, and treating that as success would report a backup that never happened.
  const result = await githubRequest(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, []);
  return result.body;
}

export async function syncGithubBackup({ reason = 'scheduled' } = {}) {
  if (!configured()) return { skipped: true, reason: 'GitHub backup is not configured' };
  if (process.env.NODE_ENV === 'production' && !encryptionSecret) throw new Error('Production GitHub backup requires GITHUB_BACKUP_ENCRYPTION_KEY');
  if (running) return { skipped: true, reason: 'GitHub backup already running' };
  running = true;
  try {
    const databasePath = resolveDatabasePath();
    const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

    // Digests are taken over the plaintext, never the ciphertext: encryptedBuffer uses
    // a fresh random IV each run, so identical content encrypts to different bytes and
    // would always look changed.
    const entries = [{ relative: 'database/dev.db.enc', plain: await fs.readFile(databasePath) }];
    for (const file of await walk(uploadDirectory)) {
      if (/\.(?:mp4|mov|webm)$/i.test(file.relative)) continue;
      entries.push({ relative: `uploads/${file.relative}.enc`, plain: await fs.readFile(file.absolute) });
    }

    // Re-uploading every file on every run cost about two API requests per file. At one
    // run every few minutes, plus one per finalised score, that approached GitHub's
    // hourly limit — so backups would start failing during the busiest part of an event.
    const previous = await readRemoteManifest();
    const digests = {};
    const changed = [];
    for (const entry of entries) {
      const digest = plaintextDigest(entry.plain);
      digests[entry.relative] = digest;
      if (previous.digests[entry.relative] !== digest) changed.push(entry);
    }

    const generatedAt = new Date().toISOString();
    const manifest = {
      format: 'scout-private-backup-v1',
      generatedAt,
      reason,
      encrypted: Boolean(encryptionSecret),
      database: 'database/dev.db.enc',
      files: entries.map(entry => ({ path: entry.relative, bytes: entry.plain.length })),
      digests,
    };

    for (const entry of changed) {
      await putFile(entry.relative, encryptedBuffer(entry.plain), `backup: ${reason} ${generatedAt}`);
    }
    // Always written, even when nothing changed: it is the record that a backup ran.
    await putFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'), `backup manifest: ${reason} ${generatedAt}`, previous.sha);

    return {
      success: true,
      generatedAt,
      files: entries.length,
      uploaded: changed.length,
      unchanged: entries.length - changed.length,
      encrypted: Boolean(encryptionSecret),
      repository: repo,
    };
  } finally {
    running = false;
  }
}

// Request a backup after a meaningful change (e.g. a finalised score). Repeated
// calls inside the debounce window collapse into a single sync; failures are
// swallowed so the caller's request is never affected.
export function requestGithubBackup({ reason = 'event' } = {}) {
  if (!configured() || debounceTimer) return false;
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    // A swallowed failure here is the worst outcome: the data looks protected while
    // nothing is leaving the machine. Never rethrown, but always recorded.
    syncGithubBackup({ reason })
      .then(result => {
        if (result?.skipped) logger.warn({ reason, why: result.reason }, 'private repo backup skipped');
        else logger.info({ reason, files: result?.files }, 'private repo backup finished');
      })
      .catch(err => logger.error({ err, reason }, 'PRIVATE REPO BACKUP FAILED — data is not being copied off this server'));
  }, debounceMs);
  debounceTimer.unref?.();
  return true;
}

export function startGithubBackupWorker() {
  if (!configured()) {
    logger.warn('private repo backup is not configured; finalised data stays on this server only');
    return undefined;
  }
  if (timer) return timer;
  timer = setInterval(() => {
    syncGithubBackup({ reason: 'scheduled' })
      .catch(err => logger.error({ err }, 'scheduled private repo backup failed'));
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopGithubBackupWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = undefined;
}

export function isGithubBackupConfigured() {
  return configured();
}
