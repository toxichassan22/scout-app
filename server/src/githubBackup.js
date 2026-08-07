import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveDatabasePath } from '../scripts/sqlite-operations-lib.mjs';

const repo = String(process.env.GITHUB_BACKUP_REPO || '').trim();
const token = String(process.env.GITHUB_BACKUP_TOKEN || '').trim();
const branch = String(process.env.GITHUB_BACKUP_BRANCH || 'main').trim();
const rootPath = String(process.env.GITHUB_BACKUP_PATH || 'scout-data').replace(/^\/+|\/+$/g, '');
const encryptionSecret = String(process.env.GITHUB_BACKUP_ENCRYPTION_KEY || '').trim();
const intervalMs = Math.max(60_000, Number(process.env.GITHUB_BACKUP_INTERVAL_MS) || 300_000);
let timer;
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

async function githubRequest(url, options = {}) {
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
  if (!response.ok && response.status !== 404) throw new Error(`GitHub backup request failed with HTTP ${response.status}`);
  return { response, body };
}

async function putFile(relativePath, buffer, message) {
  const url = apiUrl(`${rootPath}/${relativePath}`);
  const existing = await githubRequest(`${url}?ref=${encodeURIComponent(branch)}`);
  const payload = { message, content: buffer.toString('base64'), branch };
  if (existing.response.ok && existing.body.sha) payload.sha = existing.body.sha;
  const result = await githubRequest(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return result.body;
}

export async function syncGithubBackup({ reason = 'scheduled' } = {}) {
  if (!configured()) return { skipped: true, reason: 'GitHub backup is not configured' };
  if (process.env.NODE_ENV === 'production' && !encryptionSecret) throw new Error('Production GitHub backup requires GITHUB_BACKUP_ENCRYPTION_KEY');
  if (running) return { skipped: true, reason: 'GitHub backup already running' };
  running = true;
  try {
    const databasePath = resolveDatabasePath();
    const database = await fs.readFile(databasePath);
    const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
    const files = [{ relative: 'database/dev.db.enc', buffer: encryptedBuffer(database) }];
    for (const file of await walk(uploadDirectory)) {
      if (/\.(?:mp4|mov|webm)$/i.test(file.relative)) continue;
      files.push({ relative: `uploads/${file.relative}.enc`, buffer: encryptedBuffer(await fs.readFile(file.absolute)) });
    }
    const generatedAt = new Date().toISOString();
    const manifest = {
      format: 'scout-private-backup-v1',
      generatedAt,
      reason,
      encrypted: Boolean(encryptionSecret),
      database: 'database/dev.db.enc',
      files: files.map(file => ({ path: file.relative, bytes: file.buffer.length })),
    };
    for (const file of files) await putFile(file.relative, file.buffer, `backup: ${reason} ${generatedAt}`);
    await putFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'), `backup manifest: ${reason} ${generatedAt}`);
    return { success: true, generatedAt, files: files.length, encrypted: Boolean(encryptionSecret), repository: repo };
  } finally {
    running = false;
  }
}

export function startGithubBackupWorker() {
  if (!configured() || timer) return timer;
  timer = setInterval(() => syncGithubBackup({ reason: 'scheduled' }).catch(() => {}), intervalMs);
  timer.unref?.();
  return timer;
}

export function stopGithubBackupWorker() {
  if (timer) clearInterval(timer);
  timer = undefined;
}

export function isGithubBackupConfigured() {
  return configured();
}
