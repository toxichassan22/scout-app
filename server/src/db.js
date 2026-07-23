import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enable SQLite Write-Ahead Logging (WAL) for high concurrency & non-blocking writes
async function enableWALMode() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    console.log('[DB] SQLite WAL mode & busy timeout 5000ms enabled successfully.');
  } catch (err) {
    console.error('[DB WAL Error]:', err);
  }
}

enableWALMode();

export default prisma;
