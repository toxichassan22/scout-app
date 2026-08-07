import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = String(process.env.GITHUB_BACKUP_REPO || '').trim();
const token = String(process.env.GITHUB_BACKUP_TOKEN || '').trim();
const branch = String(process.env.GITHUB_BACKUP_BRANCH || 'main').trim();
const rootPath = String(process.env.GITHUB_BACKUP_PATH || 'scout-data').replace(/^\/+|\/+$/g, '');
const encryptionSecret = String(process.env.GITHUB_BACKUP_ENCRYPTION_KEY || '').trim();
const target = path.resolve(process.env.RESTORE_TARGET_DIR || path.join(serverRoot, `restore-candidate-${Date.now()}`));

if (!repo || !token) throw new Error('GITHUB_BACKUP_REPO and GITHUB_BACKUP_TOKEN are required');
try { await fs.access(target); throw new Error(`Restore target already exists: ${target}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }

function apiUrl(filePath) {
  const encoded = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `https://api.github.com/repos/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`;
}

async function getFile(filePath) {
  const response = await fetch(apiUrl(filePath), { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
  if (!response.ok) throw new Error(`Could not download ${filePath}: HTTP ${response.status}`);
  const data = await response.json();
  return Buffer.from(data.content.replace(/\s/g, ''), 'base64');
}

function decryptBuffer(buffer) {
  if (!buffer.subarray(0, 9).equals(Buffer.from('SCOUTENC1'))) return buffer;
  if (!encryptionSecret) throw new Error('Backup is encrypted; GITHUB_BACKUP_ENCRYPTION_KEY is required');
  const key = crypto.createHash('sha256').update(encryptionSecret).digest();
  const iv = buffer.subarray(9, 21);
  const tag = buffer.subarray(21, 37);
  const encrypted = buffer.subarray(37);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

const manifest = JSON.parse((await getFile(`${rootPath}/manifest.json`)).toString('utf8'));
if (manifest.format !== 'scout-private-backup-v1') throw new Error('Unsupported backup format');
await fs.mkdir(path.join(target, 'database'), { recursive: true });
await fs.mkdir(path.join(target, 'uploads'), { recursive: true });
await fs.writeFile(path.join(target, 'database', 'dev.db'), decryptBuffer(await getFile(`${rootPath}/${manifest.database}`)));
for (const file of manifest.files || []) {
  if (file.path === manifest.database) continue;
  const relative = file.path.replace(/^uploads\//, '');
  const destination = path.resolve(target, 'uploads', relative.replace(/\.enc$/, ''));
  if (!destination.startsWith(`${path.resolve(target, 'uploads')}${path.sep}`)) throw new Error(`Unsafe restore path: ${file.path}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, decryptBuffer(await getFile(`${rootPath}/${file.path}`)));
}
await fs.writeFile(path.join(target, 'manifest.json'), JSON.stringify({ ...manifest, restoredAt: new Date().toISOString() }, null, 2));
console.log(`Restore candidate created at ${target}`);
console.log(`Validate it before any maintenance promotion: SQLITE_DATABASE_PATH=${path.join(target, 'database', 'dev.db')}`);
