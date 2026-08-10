import assert from 'node:assert/strict';

// syncGithubBackup only activates when a repo and token are present, so configure a
// throwaway pair and intercept fetch to assert how each HTTP status is treated.
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
  // An empty repository answers 409 on the probe. That must not abort the backup.
  let calls = stubFetch(({ method }) => {
    if (method === 'GET') return reply(409, { message: 'Git Repository is empty.' });
    return reply(201, { content: { sha: 'abc' } });
  });
  const emptyRepoResult = await syncGithubBackup({ reason: 'test-empty-repo' });
  assert.equal(emptyRepoResult.success, true, 'a repository with no commits must still receive the first backup');
  assert.ok(calls.some(c => c.method === 'PUT'), 'the backup must actually write something');

  // A wrong repo or a token without access answers 404 on the write. Silently
  // reporting success there would claim a backup that never happened.
  stubFetch(({ method }) => {
    if (method === 'GET') return reply(404, { message: 'Not Found' });
    return reply(404, { message: 'Not Found' });
  });
  await assert.rejects(
    () => syncGithubBackup({ reason: 'test-bad-token' }),
    /404/,
    'a rejected write must surface as an error, not a success',
  );

  // Rate limiting or an outage must also surface rather than pass silently.
  stubFetch(({ method }) => (method === 'GET' ? reply(404) : reply(403, { message: 'rate limit exceeded' })));
  await assert.rejects(() => syncGithubBackup({ reason: 'test-rate-limited' }), /403/, 'a refused write must surface');

  console.log('github backup http unit tests passed: empty repo succeeds, rejected writes fail loudly');
} finally {
  globalThis.fetch = realFetch;
}
