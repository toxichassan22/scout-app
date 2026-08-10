import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

// syncGithubBackup reads the live SQLite file, so point it at a throwaway one. Without
// this the test only passes on a machine that happens to have a dev database, which is
// how it first broke in CI. SQLITE_DATABASE_PATH is what resolveDatabasePath honours —
// DATABASE_URL is not consulted.
const workspace = await mkdtemp(path.join(os.tmpdir(), 'scout-backup-http-'));
const databasePath = path.join(workspace, 'test.db');
await writeFile(databasePath, 'not a real database, only bytes to upload');

process.env.SQLITE_DATABASE_PATH = databasePath;
process.env.GITHUB_BACKUP_REPO = 'owner/backup-repo';
process.env.GITHUB_BACKUP_TOKEN = 'test-token';
process.env.GITHUB_BACKUP_ENCRYPTION_KEY = 'test-encryption-key';
process.env.NODE_ENV = 'test';

const { syncGithubBackup } = await import('../src/githubBackup.js');

const realFetch = globalThis.fetch;
function stubFetch(handler) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    calls.push({ url: String(url), method });
    return handler({ url: String(url), method });
  };
  return calls;
}
const reply = (status, body = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

try {
  // A repository with no commits answers 409 on the probe. The first backup into a
  // freshly created repository must still succeed.
  const calls = stubFetch(({ method }) => (
    method === 'GET' ? reply(409, { message: 'Git Repository is empty.' }) : reply(201, { content: { sha: 'abc' } })
  ));
  const emptyRepo = await syncGithubBackup({ reason: 'test-empty-repo' });
  assert.equal(emptyRepo.success, true, 'a repository with no commits must still receive the first backup');
  assert.ok(calls.some(c => c.method === 'PUT'), 'the backup must actually write something');

  // A wrong repository or a token without access answers 404 on the write. Reporting
  // success there would claim a backup that never happened.
  stubFetch(({ method }) => (method === 'GET' ? reply(404, { message: 'Not Found' }) : reply(404, { message: 'Not Found' })));
  await assert.rejects(
    () => syncGithubBackup({ reason: 'test-bad-token' }),
    /404/,
    'a rejected write must surface as an error, not a success',
  );

  // Rate limiting or an outage must surface rather than pass silently.
  stubFetch(({ method }) => (method === 'GET' ? reply(404) : reply(403, { message: 'rate limit exceeded' })));
  await assert.rejects(() => syncGithubBackup({ reason: 'test-rate-limited' }), /403/, 'a refused write must surface');

  console.log('github backup http unit tests passed: empty repo succeeds, rejected writes fail loudly');
} finally {
  globalThis.fetch = realFetch;
  await rm(workspace, { recursive: true, force: true });
}
