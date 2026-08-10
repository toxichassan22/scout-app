import assert from 'node:assert/strict';

process.env.AI_PROVIDER_RPM = '6000';
process.env.AI_PROVIDER_MIN_INTERVAL_MS = '10';
process.env.AI_MAX_QUEUE = '4';
process.env.AI_PROVIDER_TIMEOUT_MS = '5000';
process.env.AI_RESPONSE_CACHE_TTL_MS = '1000';

const { requestAiProvider } = await import('../src/aiGateway.js');
const realFetch = globalThis.fetch;
let calls = 0;
let active = 0;
let maxActive = 0;

globalThis.fetch = async () => {
  calls += 1;
  active += 1;
  maxActive = Math.max(maxActive, active);
  await new Promise(resolve => setTimeout(resolve, 5));
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
  assert.equal(maxActive, 1, 'provider requests must be serialized through the queue');
  assert.equal(calls, 4, 'only uncached questions reach the provider');

  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'rate' }), { status: 429, headers: { 'Retry-After': '7' } });
  await assert.rejects(
    () => requestAiProvider({ url: 'https://provider.test/chat', token: 'token', model: 'test-model', festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'سؤال جديد' }] }),
    error => error.status === 429 && error.retryAfter === 7,
    'provider rate-limit responses must preserve status and retry-after',
  );

  console.log('AI gateway unit tests passed: cache, serialized queue, and provider 429 handling');
} finally {
  globalThis.fetch = realFetch;
}
