import { access, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function resolveDatabasePath() {
    const configured = process.env.SQLITE_DATABASE_PATH?.trim();
    return path.resolve(configured || path.join(serverRoot, 'prisma', 'dev.db'));
}

export function resolveBackupDirectory() {
    const configured = process.env.SQLITE_BACKUP_DIR?.trim();
    return path.resolve(configured || path.join(serverRoot, '..', 'scout-backups'));
}

export function sqliteFileUrl(databasePath) {
    return `file:${databasePath.replaceAll('\\', '/')}`;
}

export function timestampForFilename(date = new Date()) {
    return date.toISOString().replaceAll(':', '-').replaceAll('.', '-');
}

export async function requireExistingDatabase(databasePath) {
    await access(databasePath);
    const info = await stat(databasePath);
    if (!info.isFile() || info.size === 0) {
        throw new Error(`SQLite database is not a non-empty file: ${databasePath}`);
    }
    return info;
}

export async function ensureBackupDirectory(backupDirectory) {
    await mkdir(backupDirectory, { recursive: true });
    const info = await stat(backupDirectory);
    if (!info.isDirectory()) throw new Error(`Backup path is not a directory: ${backupDirectory}`);
}

export function quoteSqliteString(value) {
    return `'${String(value).replaceAll("'", "''")}'`;
}

export function assertSafeBackupTarget(databasePath, backupPath) {
    if (path.resolve(databasePath) === path.resolve(backupPath)) {
        throw new Error('Backup target must not be the active database');
    }
    if (path.extname(backupPath).toLowerCase() !== '.db') {
        throw new Error('Backup target must use the .db extension');
    }
}
