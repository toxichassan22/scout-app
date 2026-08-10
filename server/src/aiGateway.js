import crypto from 'node:crypto';

// OpenCode/provider limits are usually shared by the token, not by one browser.
// A single in-process queue smooths bursts from all teams before they reach the
// provider. All values are configurable because the provider's actual RPM may vary.
const providerRpm = Math.max(1, Number(process.env.AI_PROVIDER_RPM) || 20);
const minIntervalMs = Math.max(
  0,
  Number(process.env.AI_PROVIDER_MIN_INTERVAL_MS) || Math.ceil(60_000 / providerRpm),
);
const maxQueue = Math.max(1, Number(process.env.AI_MAX_QUEUE) || 12);
const providerTimeoutMs = Math.max(5_000, Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 30_000);
const cacheTtlMs = Math.max(5_000, Number(process.env.AI_RESPONSE_CACHE_TTL_MS) || 60_000);

const queue = [];
const responseCache = new Map();
let draining = false;
let lastStartedAt = 0;
let providerBlockedUntil = 0;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function queueError() {
  return Object.assign(new Error('مساعد الذكاء الاصطناعي مشغول حالياً؛ حاول بعد قليل'), {
    status: 429,
    retryAfter: Math.max(1, Math.ceil(((queue.length + 1) * minIntervalMs) / 1000)),
  });
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length) {
      const wait = Math.max(0, lastStartedAt + minIntervalMs, providerBlockedUntil) - Date.now();
      if (wait) await sleep(wait);
      const job = queue.shift();
      lastStartedAt = Date.now();
      try {
        job.resolve(await job.task());
      } catch (error) {
        if (error?.status === 429) {
          providerBlockedUntil = Math.max(providerBlockedUntil, Date.now() + (Number(error.retryAfter) || 10) * 1000);
        }
        job.reject(error);
      }
    }
  } finally {
    draining = false;
    if (queue.length) drainQueue();
  }
}

export function enqueueAiRequest(task) {
  if (queue.length >= maxQueue) return Promise.reject(queueError());
  const result = new Promise((resolve, reject) => queue.push({ task, resolve, reject }));
  drainQueue();
  return result;
}

function cacheGet(key) {
  if (!key) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.content;
}

function cacheSet(key, content) {
  if (!key) return;
  responseCache.set(key, { content, expiresAt: Date.now() + cacheTtlMs });
  // Keep this bounded even if the app gets many different FAQ questions.
  if (responseCache.size > 500) responseCache.delete(responseCache.keys().next().value);
}

export function getAiCacheKey({ model, messages, festivalContext }) {
  // Only cache a standalone FAQ. Follow-up conversations depend on their history
  // and must always reach the model. Ignore the system prompt when deciding this.
  const userMessages = messages.filter(message => message.role === 'user');
  if (userMessages.length !== 1) return null;
  return crypto.createHash('sha256').update(JSON.stringify({
    model,
    question: userMessages[0].content.trim().toLocaleLowerCase('ar'),
    festivalContext,
  })).digest('hex');
}

export async function requestAiProvider({ url, token, model, messages, festivalContext }) {
  const cacheKey = getAiCacheKey({ model, messages, festivalContext });
  const cached = cacheGet(cacheKey);
  if (cached) return { content: cached, cached: true };

  const result = await enqueueAiRequest(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: Math.max(64, Number(process.env.AI_MAX_OUTPUT_TOKENS) || 350),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(response.status === 429
          ? 'مزود الذكاء الاصطناعي وصل للحد المؤقت'
          : 'تعذر الاتصال بمزود الذكاء الاصطناعي');
        error.status = response.status === 429 ? 429 : 502;
        error.retryAfter = Number(response.headers.get('retry-after')) || undefined;
        throw error;
      }
      const content = data.choices?.[0]?.message?.content || data.output?.[0]?.content?.[0]?.text;
      if (!content) throw Object.assign(new Error('رد مزود الذكاء الاصطناعي غير صالح'), { status: 502 });
      return String(content);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw Object.assign(new Error('مساعد الذكاء الاصطناعي استغرق وقتاً طويلاً؛ حاول مرة أخرى'), { status: 504 });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });

  cacheSet(cacheKey, result);
  return { content: result, cached: false };
}

export function getAiGatewayStats() {
  return { queued: queue.length, providerRpm, minIntervalMs, maxQueue, providerTimeoutMs };
}
