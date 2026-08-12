import assert from 'node:assert/strict';

process.env.AI_CHAT_TOKEN_POOL = 'key-a,key-b,key-c';
process.env.AI_POOL_CONCURRENCY = '3';
process.env.AI_PROVIDER_TIMEOUT_MS = '5000';
process.env.AI_RESPONSE_CACHE_TTL_MS = '1000';

const { requestAiProvider, resolveAiChatUrl, streamAiProvider } = await import('../src/aiGateway.js');
const realFetch = globalThis.fetch;
let calls = 0;
let active = 0;
let maxActive = 0;
const usedKeys = new Set();
const requestedUrls = [];

assert.equal(resolveAiChatUrl('https://provider.test/v1'), 'https://provider.test/v1/chat/completions');
assert.equal(resolveAiChatUrl('https://provider.test/v1/chat/completions'), 'https://provider.test/v1/chat/completions');

globalThis.fetch = async (_url, options = {}) => {
  requestedUrls.push(_url);
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
    url: 'https://provider.test/v1', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'ما موعد الافتتاح؟' }],
  });
  const cached = await requestAiProvider({
    url: 'https://provider.test/v1', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'ما موعد الافتتاح؟' }],
  });
  assert.equal(first.content, 'إجابة الاختبار');
  assert.equal(first.cached, false);
  assert.equal(cached.cached, true, 'the same standalone FAQ should use the short cache');
  assert.equal(calls, 1, 'the cache must prevent a second provider request');
  assert.equal(requestedUrls[0], 'https://provider.test/v1/chat/completions', 'base URLs should resolve to chat completions');

  const results = await Promise.all(['سؤال 1', 'سؤال 2', 'سؤال 3'].map(question => requestAiProvider({
    url: 'https://provider.test/v1', token: 'token', model: 'test-model',
    festivalContext: 'schedule-v1', messages: [{ role: 'user', content: question }],
  })));
  assert.equal(results.length, 3);
  assert.ok(maxActive > 1, 'pool keys should allow safe concurrent provider requests');
  assert.equal(usedKeys.size, 3, 'three concurrent requests should be distributed across three keys');
  assert.equal(calls, 4, 'only uncached questions reach the provider');

  let failoverCalls = 0;
  globalThis.fetch = async () => {
    failoverCalls += 1;
    if (failoverCalls === 1) return new Response(JSON.stringify({ error: 'invalid key' }), { status: 401 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'إجابة بالمفتاح البديل' } }] }), { status: 200 });
  };
  const failover = await requestAiProvider({
    url: 'https://provider.test/v1',
    token: 'token',
    model: 'test-model',
    festivalContext: 'schedule-v1',
    messages: [{ role: 'user', content: 'سؤال تبديل مفتاح' }],
  });
  assert.equal(failover.content, 'إجابة بالمفتاح البديل');
  assert.equal(failoverCalls, 2, 'an invalid provider key should fail over to another pool key');

  globalThis.fetch = async (_url, options = {}) => {
    assert.equal(JSON.parse(options.body).stream, true);
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"أهلاً "}}]}\n'));
        controller.enqueue(encoder.encode('\ndata: {"choices":[{"delta":{"content":"بكم"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  let streamedContent = '';
  const streamed = await streamAiProvider({
    url: 'https://provider.test/v1',
    token: 'token',
    model: 'test-model',
    festivalContext: 'schedule-v1',
    messages: [{ role: 'user', content: 'سؤال بث' }],
    onToken: chunk => { streamedContent += chunk; },
  });
  assert.equal(streamed.content, 'أهلاً بكم');
  assert.equal(streamedContent, 'أهلاً بكم');
  assert.equal(streamed.cached, false);

  let streamFailoverCalls = 0;
  globalThis.fetch = async () => {
    streamFailoverCalls += 1;
    if (streamFailoverCalls === 1) return new Response(JSON.stringify({ error: 'invalid key' }), { status: 403 });
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"نجح البث"}}]}\n\ndata: [DONE]\n\n'));
        controller.close();
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  let streamFailoverContent = '';
  const streamFailover = await streamAiProvider({
    url: 'https://provider.test/v1',
    token: 'token',
    model: 'test-model',
    festivalContext: 'schedule-v1',
    messages: [{ role: 'user', content: 'سؤال تبديل بث' }],
    onToken: chunk => { streamFailoverContent += chunk; },
  });
  assert.equal(streamFailover.content, 'نجح البث');
  assert.equal(streamFailoverContent, 'نجح البث');
  assert.equal(streamFailoverCalls, 2, 'streaming should fail over after an invalid provider key');

  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(
    () => requestAiProvider({ url: 'https://provider.test/v1', token: 'token', model: 'test-model', festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'سؤال شبكة' }] }),
    error => error.status === 502 && error.message === 'تعذر الوصول إلى مزود الذكاء الاصطناعي حالياً',
    'provider network failures must become an actionable 502 error',
  );

  globalThis.fetch = async () => new Response(JSON.stringify({ message: 'rate' }), { status: 429, headers: { 'Retry-After': '7' } });
  await assert.rejects(
    () => requestAiProvider({ url: 'https://provider.test/v1', token: 'token', model: 'test-model', festivalContext: 'schedule-v1', messages: [{ role: 'user', content: 'سؤال جديد' }] }),
    error => error.status === 429 && error.retryAfter === 7,
    'provider rate-limit responses must preserve status and retry-after',
  );

  console.log('AI gateway unit tests passed: cache, key pool distribution, concurrency, and provider 429 handling');
} finally {
  globalThis.fetch = realFetch;
}
