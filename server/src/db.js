import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const isCorruptOrMissing = (err) => {
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('malformed') ||
    msg.includes('corrupt') ||
    msg.includes('no such table') ||
    msg.includes('database disk image is malformed') ||
    msg.includes('unable to open database file') ||
    msg.includes('cannot open database')
  );
};

async function resetDatabaseFiles() {
  try {
    await prisma.$disconnect();
  } catch (_) {
    // ignore disconnect errors
  }
  const dbDir = path.resolve(process.cwd(), 'prisma');
  const files = ['dev.db', 'dev.db-wal', 'dev.db-shm'];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  files.forEach((f) => {
    const fp = path.join(dbDir, f);
    if (fs.existsSync(fp)) {
      try {
        // keep a one-time backup of the corrupt DB before deleting it
        if (f === 'dev.db') {
          const backup = path.join(dbDir, `dev.db.corrupt.${timestamp}`);
          fs.renameSync(fp, backup);
          console.warn(`[DB Auto-Repair] Backed up corrupt DB to ${backup}`);
        } else {
          fs.unlinkSync(fp);
        }
      } catch (e) {
        console.warn('[DB Auto-Repair] Could not remove DB file', fp, e.message);
      }
    }
  });
}

async function runSchemaAndSeed() {
  const cwd = process.cwd();
  console.log('[DB Auto-Repair] Pushing schema...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', cwd });
  console.log('[DB Auto-Repair] Seeding idempotent base data...');
  execSync('node src/seed.js', { stdio: 'inherit', cwd });
}

async function initDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    await prisma.team.findFirst();
    console.log('[DB] SQLite database connected and validated (WAL mode).');
  } catch (err) {
    console.warn('[DB Init Warning]:', err.message || err);
    if (isCorruptOrMissing(err)) {
      console.warn('[DB Auto-Repair] Database is missing or corrupt. Rebuilding schema and re-seeding...');
      try {
        await resetDatabaseFiles();
        await runSchemaAndSeed();
        console.log('[DB Auto-Repair] Database rebuilt and seeded successfully.');
      } catch (repairErr) {
        console.error('[DB Auto-Repair] Failed to repair database:', repairErr.message || repairErr);
      }
    }
  }
}

initDatabase();

export default prisma;
