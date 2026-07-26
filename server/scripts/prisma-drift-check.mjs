import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireExistingDatabase, resolveDatabasePath, sqliteFileUrl } from './sqlite-operations-lib.mjs';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(serverRoot, 'prisma', 'schema.prisma');
const databasePath = resolveDatabasePath();

try {
    await requireExistingDatabase(databasePath);
    const prismaCommand = process.execPath;
    const prismaEntrypoint = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
    const args = [
        prismaEntrypoint, 'migrate', 'diff',
        '--from-url', sqliteFileUrl(databasePath),
        '--to-schema-datamodel', schemaPath,
        '--exit-code',
    ];
    const result = spawnSync(prismaCommand, args, {
        cwd: serverRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
    });
    if (result.error) {
        throw new Error(`Could not execute Prisma CLI: ${result.error.message}`);
    }
    // Prisma documents 0 = empty diff, 2 = schema differences, 1 = command error.
    if (result.status === 2) {
        throw new Error(`Prisma schema drift detected.\n${result.stdout.trim()}\nReview the difference manually; do not run db push --accept-data-loss against production.`);
    }
    if (result.status !== 0) {
        const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
        throw new Error(`Prisma drift check failed (exit ${result.status}).\n${details}`);
    }
    console.log(JSON.stringify({ status: 'ok', databasePath, schemaPath, drift: false }, null, 2));
} catch (error) {
    console.error(`[prisma-drift-check] ${error.message}`);
    process.exitCode = 1;
}
