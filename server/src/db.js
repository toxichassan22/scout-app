import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    await prisma.team.findFirst();
    console.log('[DB] SQLite database connected and validated (WAL and foreign keys enabled).');
  } catch (err) {
    // Never reset, move, seed, or force-push a database during application startup.
    // Operators can inspect and recover it using the documented readiness/backup runbook.
    console.error('[DB Init Error] Database is unavailable or schema validation failed:', err.message || err);
    process.exitCode = 1;
  }
}

initDatabase();

export default prisma;
