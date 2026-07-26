import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Verifies the latest SQLite backup by restoring it to a temporary file,
// running pragmas, and counting critical tables. Use from cron or after deploy.

const backupDir = process.env.SQLITE_BACKUP_DIR || 'scout-backups';

async function latestBackup() {
  const files = await fs.readdir(backupDir).catch(() => []);
  const backups = [];
  for (const f of files) {
    if (!f.endsWith('.db') || !f.startsWith('scout-')) continue;
    const { mtime } = await fs.stat(path.join(backupDir, f));
    backups.push({ file: f, mtime });
  }
  backups.sort((a, b) => b.mtime - a.mtime);
  return backups[0]?.file;
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: 'pipe' });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('exit', (code) => {
      if (code === 0) resolve(out.trim());
      else reject(new Error(`${cmd} ${args.join(' ')} failed: ${err || out}`));
    });
  });
}

async function main() {
  const latest = await latestBackup();
  if (!latest) throw new Error('No backup found');

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scout-backup-verify-'));
  const restored = path.join(tmpDir, 'restored.db');
  try {
    await run('sqlite3', [path.join(backupDir, latest), `VACUUM INTO '${restored}';`]);
    await run('sqlite3', [restored, 'PRAGMA integrity_check;']);
    await run('sqlite3', [restored, 'PRAGMA foreign_key_check;']);
    const counts = await run('sqlite3', [restored, "SELECT count(*) FROM Team; SELECT count(*) FROM Score; SELECT count(*) FROM Report;"]);
    console.log(`Backup verified: ${latest}`);
    console.log(counts);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((err) => {
  console.error('Backup verification failed:', err.message);
  process.exit(1);
});
