import { copyFile, mkdtemp, rm, unlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import {
    assertSafeBackupTarget,
    ensureBackupDirectory,
    quoteSqliteString,
    requireExistingDatabase,
    resolveBackupDirectory,
    resolveDatabasePath,
    sqliteFileUrl,
    timestampForFilename,
} from './sqlite-operations-lib.mjs';

const databasePath = resolveDatabasePath();
const backupDirectory = resolveBackupDirectory();
const backupPath = path.join(backupDirectory, `scout-${timestampForFilename()}.db`);
const verifyRestore = !process.argv.includes('--no-verify-restore');
let source;
let backup;
let temporaryDirectory;

async function integrityCheck(client, label) {
    const rows = await client.$queryRawUnsafe('PRAGMA integrity_check;');
    const values = rows.map(row => String(Object.values(row)[0]).toLowerCase());
    if (values.length !== 1 || values[0] !== 'ok') {
        throw new Error(`${label} integrity check failed: ${JSON.stringify(rows)}`);
    }
}

try {
    const sourceInfo = await requireExistingDatabase(databasePath);
    await ensureBackupDirectory(backupDirectory);
    assertSafeBackupTarget(databasePath, backupPath);

    source = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(databasePath) } } });
    await source.$connect();
    await integrityCheck(source, 'Source database');

    // Checkpoint committed WAL pages, then use SQLite's online VACUUM INTO snapshot.
    // This never modifies or overwrites the active database or an existing backup.
    const checkpoint = await source.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE);');
    await source.$executeRawUnsafe(`VACUUM INTO ${quoteSqliteString(backupPath.replaceAll('\\', '/'))};`);

    backup = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(backupPath) } } });
    await backup.$connect();
    await integrityCheck(backup, 'Backup');
    const tables = await backup.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
    await backup.$disconnect();
    backup = undefined;

    if (verifyRestore) {
        temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'scout-restore-verification-'));
        const restoreCandidate = path.join(temporaryDirectory, 'restore-candidate.db');
        await copyFile(backupPath, restoreCandidate);
        const restored = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(restoreCandidate) } } });
        try {
            await restored.$connect();
            await integrityCheck(restored, 'Temporary restore candidate');
            await restored.$queryRawUnsafe('SELECT 1;');
        } finally {
            await restored.$disconnect();
        }
    }

    console.log(JSON.stringify({
        status: 'ok',
        databasePath,
        sourceBytes: sourceInfo.size,
        backupPath,
        tableCount: tables.length,
        checkpoint: checkpoint.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value]))),
        restoreVerified: verifyRestore,
    }, null, 2));
} catch (error) {
    // Remove only the newly allocated backup if creation/verification did not finish.
    await unlink(backupPath).catch(() => { });
    console.error(`[sqlite-backup] ${error.message}`);
    process.exitCode = 1;
} finally {
    await backup?.$disconnect().catch(() => { });
    await source?.$disconnect().catch(() => { });
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
}
