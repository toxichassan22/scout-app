import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Enable SQLite WAL mode & busy timeout for concurrent reads/writes.
// Do NOT auto-delete or reset the database here; migrations/seed are managed manually.
async function initDatabase() {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
    await prisma.team.findFirst();
    console.log('[DB] SQLite database connected and validated (WAL mode).');
  } catch (err) {
    console.warn('[DB Init Warning]:', err.message || err);
  }
}

initDatabase();

export default prisma;
