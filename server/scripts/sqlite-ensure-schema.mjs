import { stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { resolveDatabasePath, sqliteFileUrl } from './sqlite-operations-lib.mjs';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databasePath = resolveDatabasePath();
const databaseUrl = sqliteFileUrl(databasePath);
const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');

let needsSchema = false;
let fileInfo;
try {
    fileInfo = await stat(databasePath);
    if (!fileInfo.isFile() || fileInfo.size === 0) {
        needsSchema = true;
    }
} catch (error) {
    if (error.code === 'ENOENT') {
        needsSchema = true;
    } else {
        console.error(`[ensure-schema] ${error.message}`);
        process.exit(1);
    }
}

let prisma;

try {
    if (!needsSchema) {
        prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
        await prisma.$connect();
        const tableRows = await prisma.$queryRawUnsafe(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1;",
        );
        if (tableRows.length === 0) {
            needsSchema = true;
        }
    }

    if (!needsSchema) {
        console.log(JSON.stringify({ status: 'ok', initialized: false, databasePath }, null, 2));
        process.exit(0);
    }

    console.error(`[ensure-schema] Database is empty (${databasePath}); creating schema from Prisma...`);

    const prismaCommand = process.execPath;
    const prismaEntrypoint = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
    const result = spawnSync(
        prismaCommand,
        [prismaEntrypoint, 'db', 'push', '--accept-data-loss', '--schema', schemaPath],
        {
            cwd: serverRoot,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false,
            env: { ...process.env, DATABASE_URL: databaseUrl },
        },
    );

    if (result.error) {
        throw new Error(`Could not run Prisma db push: ${result.error.message}`);
    }
    if (result.status !== 0) {
        const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        throw new Error(`Prisma db push failed (exit ${result.status}).\n${details}`);
    }

    // db push creates the file but does not enable WAL; db:ready expects WAL mode.
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
    await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
    await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');

    const tableRows = await prisma.$queryRawUnsafe(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1;",
    );
    if (tableRows.length === 0) {
        throw new Error('Schema was applied but no tables were found afterwards.');
    }

    console.log(JSON.stringify({ status: 'ok', initialized: true, databasePath }, null, 2));
} catch (error) {
    console.error(`[ensure-schema] ${error.message}`);
    process.exitCode = 1;
} finally {
    await prisma?.$disconnect().catch(() => { });
}
