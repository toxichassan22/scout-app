import crypto from 'node:crypto';

const configuredPool = String(process.env.AI_CHAT_TOKEN_POOL || '')
  .split(/[\s,]+/)
  .map(token => token.trim())
  .filter(Boolean);
const fallbackToken = String(process.env.AI_CHAT_TOKEN || '').trim();
const tokens = [...new Set(configuredPool.length ? configuredPool : (fallbackToken ? [fallbackToken] : []))];
const keyRpm = Math.max(1, Number(process.env.AI_KEY_RPM || process.env.AI_PROVIDER_RPM) || 20);
const globalRpm = Math.max(1, Number(process.env.AI_GLOBAL_RPM) || keyRpm * Math.max(1, tokens.length));
const keyMinIntervalMs = Math.max(0, Number(process.env.AI_KEY_MIN_INTERVAL_MS) || Math.ceil(60_000 / keyRpm));
const globalMinIntervalMs = Math.max(0, Number(process.env.AI_GLOBAL_MIN_INTERVAL_MS) || Math.ceil(60_000 / globalRpm));
const maxQueue = Math.max(1, Number(process.env.AI_MAX_QUEUE) || 12);
const providerTimeoutMs = Math.max(5_000, Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 30_000);
const cacheTtlMs = Math.max(5_000, Number(process.env.AI_RESPONSE_CACHE_TTL_MS) || 60_000);
const maxConcurrency = Math.max(1, Math.min(tokens.length || 1, Number(process.env.AI_POOL_CONCURRENCY) || tokens.length || 1));

const keyPool = (tokens.length ? tokens : ['']).map((token, index) => ({
  id: index + 1,
  token,
  lastStartedAt: 0,
  blockedUntil: 0,
  inFlight: 0,
}));
const queue = [];
const responseCache = new Map();
let activeJobs = 0;
let nextGlobalStartAt = 0;
let globalBlockedUntil = 0;
let drainTimer;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function extractContent(data) {
  const content = data.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content.map(part => typeof part === 'string' ? part : part?.text || '').join('');
  }
  return content || data.output?.[0]?.content?.[0]?.text;
}

function queueError() {
  return Object.assign(new Error('مساعد الذكاء الاصطناعي مشغول حالياً؛ حاول بعد قليل'), {
    status: 429,
    retryAfter: Math.max(1, Math.ceil(((queue.length + 1) * globalMinIntervalMs) / 1000)),
  });
}

function scheduleDrain(delay = 0) {
  if (drainTimer) return;
  drainTimer = setTimeout(() => {
    drainTimer = undefined;
    drainQueue();
  }, Math.max(0, delay));
}

function drainQueue() {
  while (queue.length && activeJobs < maxConcurrency) {
    const wait = Math.max(0, nextGlobalStartAt, globalBlockedUntil) - Date.now();
    if (wait > 0) {
      scheduleDrain(wait);
      return;
    }
    const job = queue.shift();
    activeJobs += 1;
    nextGlobalStartAt = Date.now() + globalMinIntervalMs;
    Promise.resolve(job.task())
      .then(job.resolve, job.reject)
      .finally(() => {
        activeJobs -= 1;
        drainQueue();
      });
  }
}

export function enqueueAiRequest(task) {
  if (queue.length >= maxQueue) return Promise.reject(queueError());
  const result = new Promise((resolve, reject) => queue.push({ task, resolve, reject }));
  drainQueue();
  return result;
}

async function acquireKey() {
  let selected;
  while (!selected) {
    const now = Date.now();
    const available = keyPool
      .filter(key => key.inFlight === 0 && key.blockedUntil <= now && key.lastStartedAt + keyMinIntervalMs <= now)
      .sort((a, b) => a.lastStartedAt - b.lastStartedAt);
    if (available.length) {
      selected = available[0];
      selected.inFlight += 1;
      selected.lastStartedAt = now;
      break;
    }
    const nextAvailable = Math.min(...keyPool.map(key => Math.max(key.blockedUntil, key.lastStartedAt + keyMinIntervalMs)));
    await sleep(Math.max(10, nextAvailable - now));
  }
  return selected;
}

function releaseKey(key, error) {
  key.inFlight = Math.max(0, key.inFlight - 1);
  if (error?.status === 429) {
    const cooldownMs = (Number(error.retryAfter) || 10) * 1000;
    key.blockedUntil = Math.max(key.blockedUntil, Date.now() + cooldownMs);
    globalBlockedUntil = Math.max(globalBlockedUntil, key.blockedUntil);
  }
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
  if (responseCache.size > 500) responseCache.delete(responseCache.keys().next().value);
}

export function getAiCacheKey({ model, messages, festivalContext }) {
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
    const key = await acquireKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
    let failure;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key?.token || token}` },
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
      const content = extractContent(data);
      if (!content) throw Object.assign(new Error('رد مزود الذكاء الاصطناعي غير صالح'), { status: 502 });
      return String(content);
    } catch (error) {
      failure = error;
      if (error.name === 'AbortError') {
        throw Object.assign(new Error('مساعد الذكاء الاصطناعي استغرق وقتاً طويلاً؛ حاول مرة أخرى'), { status: 504 });
      }
      if (error.status) throw error;
      throw Object.assign(new Error('تعذر الوصول إلى مزود الذكاء الاصطناعي حالياً'), { status: 502, cause: error });
    } finally {
      clearTimeout(timeout);
      releaseKey(key, failure);
    }
  });

  cacheSet(cacheKey, result);
  return { content: result, cached: false };
}

export function getAiGatewayStats() {
  return {
    keys: keyPool.length,
    queued: queue.length,
    active: activeJobs,
    keyRpm,
    globalRpm,
    keyMinIntervalMs,
    globalMinIntervalMs,
    maxConcurrency,
    maxQueue,
    providerTimeoutMs,
  };
}
