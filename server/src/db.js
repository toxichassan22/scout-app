import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

// SQLite can only handle one writer at a time. Without a single connection
// pool, concurrent interactive transactions hit the 5s engine query timeout
// (P1008) even though PRAGMA busy_timeout is much higher.
let databaseUrl = process.env.DATABASE_URL || '';
if (databaseUrl && !/[?&]connection_limit=/.test(databaseUrl)) {
  databaseUrl += (databaseUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
  process.env.DATABASE_URL = databaseUrl;
}

const prisma = new PrismaClient();

const DEFAULT_TX_MAX_WAIT = 30000;
const DEFAULT_TX_TIMEOUT = 30000;
const TX_MAX_RETRIES = 3;

function isSqliteBusyError(err) {
  if (!err) return false;
  if (err.code === 'P2034') return true;
  const message = String(err.message || '');
  if (message.includes('SQLITE_BUSY')) return true;
  if (message.includes('database is locked')) return true;
  return false;
}

const originalTransaction = prisma.$transaction.bind(prisma);
prisma.$transaction = async function withRetry(arg, options) {
  const isFunction = typeof arg === 'function';
  const txOptions = isFunction
    ? { maxWait: DEFAULT_TX_MAX_WAIT, timeout: DEFAULT_TX_TIMEOUT, ...(options || {}) }
    : options;

  for (let i = 0; i < TX_MAX_RETRIES; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await originalTransaction(arg, txOptions);
    } catch (err) {
      if (isSqliteBusyError(err) && i < TX_MAX_RETRIES - 1) {
        const delay = 50 * (i + 1);
        logger.warn({ err, attempt: i + 1, delay }, 'SQLite busy; retrying transaction');
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, delay).unref?.());
        continue;
      }
      throw err;
    }
  }
};

export async function initDatabase(client = prisma) {
  await client.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await client.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await client.$queryRawUnsafe('PRAGMA busy_timeout=30000;');
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
