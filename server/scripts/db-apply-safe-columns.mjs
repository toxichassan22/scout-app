import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { requireExistingDatabase, resolveDatabasePath, sqliteFileUrl } from './sqlite-operations-lib.mjs';

/**
 * Adds additive schema pieces the live database may lack.
 *
 * The production database predates Prisma Migrate — `migrate deploy` refuses with
 * P3005 because the schema is not empty and nothing is recorded as applied. The
 * deploy therefore relies on `db:drift` as its guarantee, and a purely additive
 * column would otherwise fail that check and abort every deploy.
 *
 * Only additive ALTER TABLE statements, CREATE TABLE IF NOT EXISTS statements, and
 * indexes belong here. They do not remove or rewrite existing data, so they are safe
 * to run unattended and are no-ops when the schema piece is already present.
 *
 * Anything that removes, renames or narrows a column must be a reviewed migration
 * run deliberately, never from here. `db:drift` still runs afterwards and will abort
 * the deploy if this did not bring the database in line with the schema.
 */
const ADDITIVE_COLUMNS = [
    {
        table: 'TeamDevice',
        column: 'role',
        sql: `ALTER TABLE "TeamDevice" ADD COLUMN "role" TEXT NOT NULL DEFAULT ''`,
        reason: 'each device records the scouting role of the person using it',
    },
    {
        table: 'Judge',
        column: 'judgeDeviceId',
        sql: 'ALTER TABLE "Judge" ADD COLUMN "judgeDeviceId" TEXT',
        reason: 'binds each judge account to one browser device',
    },
    {
        table: 'AgendaItem',
        column: 'competitionId',
        sql: `ALTER TABLE "AgendaItem" ADD COLUMN "competitionId" TEXT`,
        reason: 'links a program entry to its canonical competition record',
    },
    {
        table: 'AgendaItem',
        column: 'locationNote',
        sql: `ALTER TABLE "AgendaItem" ADD COLUMN "locationNote" TEXT NOT NULL DEFAULT ''`,
        reason: 'stores a temporary or free-text location note when a zone is not confirmed',
    },
];

const ADDITIVE_INDEXES = [
    {
        name: 'AgendaItem_competitionId_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "AgendaItem_competitionId_idx" ON "AgendaItem"("competitionId")',
    },
];

const ADDITIVE_TABLES = [
    {
        name: 'JudgeTeamClaim',
        sql: `
            CREATE TABLE IF NOT EXISTS "JudgeTeamClaim" (
                "id" TEXT NOT NULL PRIMARY KEY,
                "competitionId" TEXT NOT NULL,
                "teamId" TEXT NOT NULL,
                "judgeId" TEXT NOT NULL,
                "expiresAt" DATETIME NOT NULL,
                "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "JudgeTeamClaim_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "JudgeTeamClaim_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "JudgeTeamClaim_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "Judge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
            )
        `,
        indexes: [
            'CREATE UNIQUE INDEX IF NOT EXISTS "JudgeTeamClaim_competitionId_teamId_key" ON "JudgeTeamClaim"("competitionId", "teamId")',
            'CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_judgeId_competitionId_idx" ON "JudgeTeamClaim"("judgeId", "competitionId")',
            'CREATE INDEX IF NOT EXISTS "JudgeTeamClaim_expiresAt_idx" ON "JudgeTeamClaim"("expiresAt")',
        ],
    },
];

const databasePath = resolveDatabasePath();
let prisma;

try {
    await requireExistingDatabase(databasePath);
    prisma = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(databasePath) } } });
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');

    const applied = [];
    const alreadyPresent = [];

    for (const entry of ADDITIVE_COLUMNS) {
        const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${entry.table}")`);
        if (!columns.length) {
            throw new Error(`Table ${entry.table} does not exist; refusing to guess at the schema.`);
        }
        if (columns.some(column => column.name === entry.column)) {
            alreadyPresent.push(`${entry.table}.${entry.column}`);
            continue;
        }
        await prisma.$executeRawUnsafe(entry.sql);
        applied.push(`${entry.table}.${entry.column}`);
        console.log(`[db-apply-safe-columns] added ${entry.table}.${entry.column} — ${entry.reason}`);
    }

    for (const index of ADDITIVE_INDEXES) {
        await prisma.$executeRawUnsafe(index.sql);
        alreadyPresent.push(index.name);
    }

    for (const table of ADDITIVE_TABLES) {
        await prisma.$executeRawUnsafe(table.sql);
        for (const index of table.indexes) await prisma.$executeRawUnsafe(index);
        alreadyPresent.push(table.name);
    }

    console.log(JSON.stringify({
        status: 'ok',
        databasePath,
        added: applied,
        alreadyPresent,
    }, null, 2));
} catch (error) {
    console.error(`[db-apply-safe-columns] ${error.message}`);
    process.exitCode = 1;
} finally {
    await prisma?.$disconnect().catch(() => { });
}
