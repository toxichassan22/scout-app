import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient();

export async function initDatabase(client = prisma) {
  await client.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await client.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await client.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
  await client.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
  await client.$queryRaw`SELECT 1`;
  await client.team.findFirst({ select: { id: true } });
  logger.info('SQLite connected and validated (WAL, foreign keys, busy timeout, synchronous=NORMAL)');
}

export const databaseReady = initDatabase().catch((error) => {
  logger.fatal({ error }, 'Database is unavailable or schema validation failed');
  throw error;
});

export default prisma;
