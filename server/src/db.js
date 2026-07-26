import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function initDatabase(client = prisma) {
  await client.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await client.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await client.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
  await client.$queryRaw`SELECT 1`;
  await client.team.findFirst({ select: { id: true } });
  console.log('[DB] SQLite database connected and validated (WAL and foreign keys enabled).');
}

export const databaseReady = initDatabase().catch((error) => {
  console.error('[DB Init Error] Database is unavailable or schema validation failed:', error.message || error);
  throw error;
});

export default prisma;
