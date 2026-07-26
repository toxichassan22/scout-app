import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import {
    ensureBackupDirectory,
    requireExistingDatabase,
    resolveBackupDirectory,
    resolveDatabasePath,
    sqliteFileUrl,
} from './sqlite-operations-lib.mjs';

const expectedTables = [
    'Admin', 'AgendaItem', 'Competition', 'DraftAnswer', 'GeographyCountry',
    'Judge', 'JudgeCompetition', 'JudgeScore', 'News', 'Question', 'QuizSession',
    'Report', 'ReportPermission', 'Score', 'ScoreAudit', 'SystemSetting', 'Team',
    'TeamDevice', 'TeamMember', 'Zone',
];
const databasePath = resolveDatabasePath();
const backupDirectory = resolveBackupDirectory();
let prisma;

try {
    const info = await requireExistingDatabase(databasePath);
    await ensureBackupDirectory(backupDirectory);
    await access(backupDirectory, constants.R_OK | constants.W_OK);

    prisma = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(databasePath) } } });
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');

    const integrityRows = await prisma.$queryRawUnsafe('PRAGMA integrity_check;');
    const integrity = integrityRows.map(row => String(Object.values(row)[0]));
    if (integrity.length !== 1 || integrity[0].toLowerCase() !== 'ok') {
        throw new Error(`PRAGMA integrity_check failed: ${JSON.stringify(integrityRows)}`);
    }

    const foreignKeyEnabledRows = await prisma.$queryRawUnsafe('PRAGMA foreign_keys;');
    const foreignKeysEnabled = Number(Object.values(foreignKeyEnabledRows[0] || {})[0]) === 1;
    // Prisma SQLite connections should enforce FK relations. Explicitly enable it for this
    // operational connection before checking relational consistency.
    if (!foreignKeysEnabled) await prisma.$executeRawUnsafe('PRAGMA foreign_keys=ON;');
    const foreignKeyCheck = await prisma.$queryRawUnsafe('PRAGMA foreign_key_check;');
    if (foreignKeyCheck.length) throw new Error(`Foreign key violations: ${JSON.stringify(foreignKeyCheck)}`);

    const journalRows = await prisma.$queryRawUnsafe('PRAGMA journal_mode;');
    const journalMode = String(Object.values(journalRows[0] || {})[0] || '').toLowerCase();
    if (journalMode !== 'wal') throw new Error(`Expected WAL journal mode, found ${journalMode || 'unknown'}`);

    const tableRows = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    const actualTables = new Set(tableRows.map(row => row.name));
    const missingTables = expectedTables.filter(table => !actualTables.has(table));
    if (missingTables.length) throw new Error(`Missing schema tables: ${missingTables.join(', ')}`);

    console.log(JSON.stringify({
        status: 'ready',
        databasePath,
        databaseBytes: info.size,
        integrity: 'ok',
        journalMode,
        foreignKeys: 'enabled',
        foreignKeyViolations: 0,
        expectedTables: expectedTables.length,
        backupDirectory: path.resolve(backupDirectory),
        backupDirectoryWritable: true,
    }, null, 2));
} catch (error) {
    console.error(`[sqlite-readiness] ${error.message}`);
    process.exitCode = 1;
} finally {
    await prisma?.$disconnect().catch(() => { });
}
