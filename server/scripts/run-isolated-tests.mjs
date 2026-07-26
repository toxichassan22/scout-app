import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverDirectory = path.resolve(scriptDirectory, '..');
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'scout-server-tests-'));
const databasePath = path.join(temporaryDirectory, 'test.db').replace(/\\/g, '/');
const environment = {
    ...process.env,
    NODE_ENV: 'test',
    SCOUT_NO_AUTOSTART: '1',
    DATABASE_URL: `file:${databasePath}`,
    JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-do-not-use-in-production'
};

function run(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: serverDirectory,
            env: environment,
            stdio: 'inherit',
            shell: false
        });

        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (code === 0) {
                resolve();
                return;
            }

            reject(new Error(
                signal
                    ? `${command} terminated by signal ${signal}`
                    : `${command} exited with code ${code}`
            ));
        });
    });
}

try {
    const prismaCli = path.join(
        serverDirectory,
        'node_modules',
        'prisma',
        'build',
        'index.js'
    );

    await run(process.execPath, [
        prismaCli,
        'validate'
    ]);

    await run(process.execPath, [
        prismaCli,
        'generate'
    ]);

    await run(process.execPath, [
        prismaCli,
        'migrate',
        'deploy'
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-smoke.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'unit-agendaCanonical.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'unit-quizService.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'unit-textNormalization.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-permissions.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-security.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-video-attempt-race.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-device-hard-cap.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-idempotency-race.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-finalize-session-race.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-rate-limit-race.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-admin-routes.mjs')
    ]);

    await run(process.execPath, [
        path.join(scriptDirectory, 'integration-http.mjs')
    ]);
} finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
}
