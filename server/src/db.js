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

async function ensureTeamColumns(client) {
  try {
    const columns = await client.$queryRawUnsafe('PRAGMA table_info(Team);');
    const columnNames = new Set(columns.map(c => c.name));
    if (!columnNames.has('logoUrl')) {
      await client.$queryRawUnsafe('ALTER TABLE Team ADD COLUMN logoUrl TEXT;');
    }
  } catch (err) {
    logger.warn({ err }, 'failed to auto-migrate Team columns');
  }
}

async function ensureCompetitionColumns(client) {
  try {
    await ensureTeamColumns(client);
    const columns = await client.$queryRawUnsafe('PRAGMA table_info(Competition);');
    const columnNames = new Set(columns.map(c => c.name));

    if (!columnNames.has('requiresQr')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN requiresQr BOOLEAN NOT NULL DEFAULT 1;');
    }
    if (!columnNames.has('qrCode')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN qrCode TEXT;');
    }
    if (!columnNames.has('startsAt')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN startsAt DATETIME;');
    }
    if (!columnNames.has('endsAt')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN endsAt DATETIME;');
    }
    if (!columnNames.has('passcode')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN passcode TEXT;');
    }
    if (!columnNames.has('entryCode')) {
      await client.$queryRawUnsafe('ALTER TABLE Competition ADD COLUMN entryCode TEXT;');
    }

    await client.$queryRawUnsafe("UPDATE Competition SET requiresQr = 1 WHERE type = 'auto_digital';");
    await client.$queryRawUnsafe("UPDATE Competition SET qrCode = 'scout-qr-geography' WHERE slug = 'geography' AND (qrCode IS NULL OR qrCode = '');");
    await client.$queryRawUnsafe("UPDATE Competition SET qrCode = 'scout-qr-genius' WHERE slug = 'genius' AND (qrCode IS NULL OR qrCode = '');");
    await client.$queryRawUnsafe("UPDATE Competition SET qrCode = 'scout-qr-two-truths' WHERE slug = 'two_truths' AND (qrCode IS NULL OR qrCode = '');");
  } catch (err) {
    logger.warn({ err }, 'failed to auto-migrate Competition columns');
  }
}

async function deduplicateCompetitions(client) {
  try {
    const competitions = await client.competition.findMany({ select: { id: true, name: true, slug: true } });
    if (competitions.length === 0) return;

    const canonicalIdByLegacyId = {
      'comp-report-5': 'comp-report-catalog-12',
      'comp-report-6': 'comp-report-catalog-13',
      'comp-report-8': 'comp-report-catalog-08',
      'comp-report-9': 'comp-report-catalog-10',
      'comp-report-10': 'comp-report-catalog-10',
      'comp-report-11': 'comp-report-catalog-05',
      'comp-report-12': 'comp-report-catalog-01',
      'comp-report-13': 'comp-report-catalog-14',
      'comp-report-15': 'comp-report-catalog-16',
      'comp-report-17': 'comp-report-catalog-02',
      'comp-report-18': 'comp-report-catalog-04',
      'comp-report-19': 'comp-report-catalog-03',
      'comp-report-21': 'comp-report-catalog-06',
      'comp-report-23': 'comp-report-catalog-15',
      'comp-report-24': 'comp-report-catalog-07',
    };

    const canonicalMap = new Map();
    for (const comp of competitions) {
      if (comp.id.startsWith('comp-report-catalog-')) {
        canonicalMap.set(comp.name, comp.id);
        canonicalMap.set(comp.slug, comp.id);
      }
    }

    for (const comp of competitions) {
      if (comp.id.startsWith('comp-report-catalog-')) continue;
      const targetId = canonicalIdByLegacyId[comp.id] || canonicalMap.get(comp.name) || canonicalMap.get(comp.slug);
      if (!targetId || targetId === comp.id) continue;

      const targetExists = competitions.some(c => c.id === targetId);
      if (!targetExists) continue;

      try {
        await client.$executeRawUnsafe(`UPDATE OR IGNORE Score SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE JudgeCompetition SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE JudgeScore SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE ScoreAudit SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE Report SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE ReportPermission SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`UPDATE OR IGNORE AgendaItem SET competitionId = '${targetId}' WHERE competitionId = '${comp.id}';`);
        await client.$executeRawUnsafe(`DELETE FROM Competition WHERE id = '${comp.id}';`);
      } catch (err) {
        logger.warn({ err, compId: comp.id, targetId }, 'deduplication error for competition');
      }
    }
  } catch (err) {
    logger.warn({ err }, 'failed to deduplicate competitions');
  }
}

export async function initDatabase(client = prisma) {
  await client.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await client.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await client.$queryRawUnsafe('PRAGMA busy_timeout=30000;');
  await client.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
  await ensureCompetitionColumns(client);
  await deduplicateCompetitions(client);
  await client.$queryRaw`SELECT 1`;
  await client.team.findFirst({ select: { id: true } });
  logger.info('SQLite connected and validated (WAL, foreign keys, busy timeout, synchronous=NORMAL)');
}

export const databaseReady = initDatabase().catch((error) => {
  logger.fatal({ error }, 'Database is unavailable or schema validation failed');
  throw error;
});

export default prisma;
