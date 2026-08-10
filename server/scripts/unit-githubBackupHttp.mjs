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
await writeFile(databasePath, 'database contents v1');

// The uploads directory it walks is resolved relative to the module, so keep it real
// but empty-ish by pointing the database elsewhere and accepting whatever is there.
process.env.SQLITE_DATABASE_PATH = databasePath;
process.env.GITHUB_BACKUP_REPO = 'owner/backup-repo';
process.env.GITHUB_BACKUP_TOKEN = 'test-token';
process.env.GITHUB_BACKUP_ENCRYPTION_KEY = 'test-encryption-key';
process.env.NODE_ENV = 'test';

const { syncGithubBackup } = await import('../src/githubBackup.js');

const realFetch = globalThis.fetch;
const reply = (status, body = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * A tiny in-memory stand-in for the repository's contents API, so a second sync sees
 * what the first one wrote and the digest comparison is exercised for real.
 */
function fakeRepo() {
  const store = new Map();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || 'GET';
    const key = decodeURIComponent(String(url).split('/contents/')[1].split('?')[0]);
    calls.push({ method, key });
    if (method === 'GET') {
      if (!store.has(key)) return reply(404, { message: 'Not Found' });
      const content = store.get(key);
      return reply(200, { sha: `sha-${key}-${content.length}`, content: Buffer.from(content).toString('base64') });
    }
    const body = JSON.parse(options.body);
    store.set(key, Buffer.from(body.content, 'base64').toString('utf8'));
    return reply(201, { content: { sha: `sha-${key}` } });
  };
  return {
    calls,
    reset: () => { calls.length = 0; },
    writes: () => calls.filter(c => c.method === 'PUT').length,
    requests: () => calls.length,
  };
}

function stubFetch(handler) {
  globalThis.fetch = async (url, options = {}) => handler({ url: String(url), method: options.method || 'GET' });
}

try {
  // ── incremental behaviour ───────────────────────────────────────────────────────
  const repo = fakeRepo();

  const first = await syncGithubBackup({ reason: 'first' });
  assert.equal(first.success, true, 'the first backup into an empty repository must succeed');
  assert.ok(first.uploaded >= 1, 'the first backup must upload the database');
  const firstRequests = repo.requests();

  repo.reset();
  const second = await syncGithubBackup({ reason: 'unchanged' });
  assert.equal(second.success, true, 'a repeat backup must succeed');
  assert.equal(second.uploaded, 0, 'nothing changed, so nothing may be re-uploaded');
  assert.equal(repo.writes(), 1, 'only the manifest is rewritten when nothing changed');
  assert.ok(repo.requests() < firstRequests, `an unchanged sync must cost fewer requests (${repo.requests()} vs ${firstRequests})`);

  repo.reset();
  await writeFile(databasePath, 'database contents v2 — a score was finalised');
  const third = await syncGithubBackup({ reason: 'db-changed' });
  assert.equal(third.uploaded, 1, 'only the changed database is re-uploaded');
  assert.equal(third.unchanged, second.files - 1, 'every other file stays untouched');

  // ── failure surfacing ──────────────────────────────────────────────────────────
  // A repository with no commits answers 409 on a probe; that must not abort.
  stubFetch(({ method }) => (method === 'GET' ? reply(409, { message: 'Git Repository is empty.' }) : reply(201, { content: { sha: 'x' } })));
  const emptyRepo = await syncGithubBackup({ reason: 'empty-repo' });
  assert.equal(emptyRepo.success, true, 'a repository with no commits must still receive the first backup');

  // A wrong repository or a token without access answers 404 on the write.
  stubFetch(() => reply(404, { message: 'Not Found' }));
  await assert.rejects(() => syncGithubBackup({ reason: 'bad-token' }), /404/, 'a rejected write must surface as an error');

  // Rate limiting must surface rather than pass silently.
  stubFetch(({ method }) => (method === 'GET' ? reply(404) : reply(403, { message: 'rate limit exceeded' })));
  await assert.rejects(() => syncGithubBackup({ reason: 'rate-limited' }), /403/, 'a refused write must surface');

  console.log('github backup http unit tests passed: incremental uploads, empty repo succeeds, rejected writes fail loudly');
} finally {
  globalThis.fetch = realFetch;
  await rm(workspace, { recursive: true, force: true });
}
