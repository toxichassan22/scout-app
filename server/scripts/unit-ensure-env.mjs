import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'scout-ensure-env-'));
const temporaryScripts = path.join(temporaryDirectory, 'scripts');
const temporaryScript = path.join(temporaryScripts, 'ensure-env.mjs');
const temporaryEnv = path.join(temporaryDirectory, '.env');

function run(command, args, environment) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: temporaryDirectory,
      env: environment,
      stdio: 'ignore',
      shell: false,
    });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

try {
  await mkdir(temporaryScripts, { recursive: true });
  await copyFile(path.join(scriptDirectory, 'ensure-env.mjs'), temporaryScript);
  await writeFile(temporaryEnv, '');

  const pool = ['key-a', 'key-b', 'key-c', 'key-d', 'key-e', 'key-f', 'key-g', 'key-h', 'key-i'];
  await run(process.execPath, [temporaryScript], {
    ...process.env,
    AI_CHAT_TOKEN: '',
    AI_CHAT_TOKEN_POOL: pool.join('\n'),
  });

  const lines = (await readFile(temporaryEnv, 'utf8')).split(/\r?\n/);
  assert.equal(lines.find(line => line.startsWith('AI_CHAT_TOKEN_POOL=')), `AI_CHAT_TOKEN_POOL=${pool.join(',')}`);
  assert.equal(lines.filter(line => pool.includes(line)).length, 0, 'pool entries must not spill into standalone .env lines');
  console.log('ensure-env unit tests passed: multiline AI token pools are persisted safely');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
