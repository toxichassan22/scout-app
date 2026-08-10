import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { requireExistingDatabase, resolveDatabasePath, sqliteFileUrl } from './sqlite-operations-lib.mjs';

/**
 * Adds columns the schema expects but the live database lacks.
 *
 * The production database predates Prisma Migrate — `migrate deploy` refuses with
 * P3005 because the schema is not empty and nothing is recorded as applied. The
 * deploy therefore relies on `db:drift` as its guarantee, and a purely additive
 * column would otherwise fail that check and abort every deploy.
 *
 * Only `ALTER TABLE ... ADD COLUMN` with a default belongs here. That form does not
 * move data, rebuild a table or drop anything, so it is safe to run unattended and
 * is a no-op when the column is already present. Prisma's own SQLite output for the
 * same change rebuilds the table via CREATE/INSERT/DROP/RENAME, which is not
 * something to run without review.
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
