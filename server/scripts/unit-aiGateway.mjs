import assert from 'node:assert/strict';

process.env.AI_CHAT_TOKEN_POOL = 'key-a,key-b,key-c';
process.env.AI_KEY_RPM = '6000';
process.env.AI_GLOBAL_RPM = '6000';
process.env.AI_KEY_MIN_INTERVAL_MS = '5';
process.env.AI_GLOBAL_MIN_INTERVAL_MS = '5';
process.env.AI_POOL_CONCURRENCY = '3';
process.env.AI_MAX_QUEUE = '4';
process.env.AI_PROVIDER_TIMEOUT_MS = '5000';
process.env.AI_RESPONSE_CACHE_TTL_MS = '1000';

const { requestAiProvider } = await import('../src/aiGateway.js');
const realFetch = globalThis.fetch;
let calls = 0;
let active = 0;
let maxActive = 0;
const usedKeys = new Set();

globalThis.fetch = async (_url, options = {}) => {
  calls += 1;
  usedKeys.add(options.headers?.Authorization || '');
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise(resolve => setTimeout(resolve, 30));
  active -= 1;
  return new Response(JSON.stringify({ choices: [{ message: { content: 'إجابة الاختبار' } }] }), { status: 200 });
};

try {
  const first = await requestAiProvider({
    url: 'https://provider.test/chat', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'ما موعد الافتتاح؟' }],
  });
  const cached = await requestAiProvider({
    url: 'https://provider.test/chat', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'ما موعد الافتتاح؟' }],
  });
  assert.equal(first.content, 'إجابة الاختبار');
  assert.equal(first.cached, false);
  assert.equal(cached.cached, true, 'the same standalone FAQ should use the short cache');
  assert.equal(calls, 1, 'the cache must prevent a second provider request');

  const results = await Promise.all(['سؤال 1', 'سؤال 2', 'سؤال 3'].map(question => requestAiProvider({
    url: 'https://provider.test/chat', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: question }],
  })));
  assert.equal(results.length, 3);
  assert.ok(maxActive > 1, 'pool keys should allow safe concurrent provider requests');
  assert.equal(usedKeys.size, 3, 'three concurrent requests should be distributed across three keys');
  assert.equal(calls, 4, 'only uncached questions reach the provider');

  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(
    () => requestAiProvider({ url: 'https://provider.test/chat', token: 'token', model: 'test-model', festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'سؤال شبكة' }] }),
    error => error.status === 502 && error.message === 'تعذر الوصول إلى مزود الذكاء الاصطناعي حالياً',
    'provider network failures must become an actionable 502 error',
  );

  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'rate' }), { status: 429, headers: { 'Retry-After': '7' } });
  await assert.rejects(
    () => requestAiProvider({ url: 'https://provider.test/chat', token: 'token', model: 'test-model', festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'سؤال جديد' }] }),
    error => error.status === 429 && error.retryAfter === 7,
    'provider rate-limit responses must preserve status and retry-after',
  );

  console.log('AI gateway unit tests passed: cache, key pool distribution, concurrency, and provider 429 handling');
} finally {
  globalThis.fetch = realFetch;
}
