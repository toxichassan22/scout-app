import crypto from 'node:crypto';

const configuredPool = String(process.env.AI_CHAT_TOKEN_POOL || '')
  .split(/[\s,]+/)
  .map(token => token.trim())
  .filter(Boolean);
const fallbackToken = String(process.env.AI_CHAT_TOKEN || '').trim();
const tokens = [...new Set(configuredPool.length ? configuredPool : (fallbackToken ? [fallbackToken] : []))];
const providerTimeoutMs = Math.max(5_000, Number(process.env.AI_PROVIDER_TIMEOUT_MS) || 30_000);
const cacheTtlMs = Math.max(5_000, Number(process.env.AI_RESPONSE_CACHE_TTL_MS) || 60_000);
const maxConcurrency = Math.max(1, Math.min(tokens.length || 1, Number(process.env.AI_POOL_CONCURRENCY) || tokens.length || 1));
const invalidKeyCooldownMs = Math.max(60_000, Number(process.env.AI_INVALID_KEY_COOLDOWN_MS) || 15 * 60_000);

const keyPool = (tokens.length ? tokens : ['']).map((token, index) => ({
  id: index + 1,
  token,
  blockedUntil: 0,
  inFlight: 0,
}));
const queue = [];
const responseCache = new Map();
let activeJobs = 0;
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

export function resolveAiChatUrl(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (!normalized || normalized.endsWith('/chat/completions')) return normalized;
  return `${normalized}/chat/completions`;
}

function isOpenCodeUrl(value) {
  try {
    const hostname = new URL(resolveAiChatUrl(value)).hostname;
    return hostname === 'opencode.ai' || hostname.endsWith('.opencode.ai');
  } catch {
    return false;
  }
}

function createProviderHeaders({ url, token, stream = false }) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (stream) headers.Accept = 'text/event-stream';
  if (isOpenCodeUrl(url)) {
    headers['x-opencode-client'] = 'cli';
    headers['x-opencode-project'] = 'scout-festival';
    headers['x-opencode-session'] = `ses_${crypto.randomUUID()}`;
    headers['x-opencode-request'] = `msg_${crypto.randomUUID()}`;
  }
  return headers;
}

function extractStreamContent(data) {
  if (data?.type === 'response.output_text.delta') return data.delta || '';
  const content = data.choices?.[0]?.delta?.content;
  if (Array.isArray(content)) {
    return content.map(part => typeof part === 'string' ? part : part?.text || '').join('');
  }
  return content || data.choices?.[0]?.message?.content || '';
}

function createProviderController(signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  return {
    controller,
    cleanup: () => signal?.removeEventListener('abort', abort),
  };
}

async function consumeProviderStream(body, onToken, controller) {
  if (!body?.getReader) throw Object.assign(new Error('رد مزود الذكاء الاصطناعي لا يدعم البث'), { status: 502 });
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let raw = '';
  let content = '';
  let stopped = false;

  const processEvent = async eventText => {
    const dataText = eventText
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .join('\n')
      .trim();
    if (!dataText || dataText === '[DONE]') return;
    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      return;
    }
    if (data.error) throw Object.assign(new Error(data.error.message || 'تعذر إكمال بث المساعد'), { status: 502 });
    const chunk = String(extractStreamContent(data) || '');
    if (!chunk) return;
    content += chunk;
    if (await onToken?.(chunk) === false) {
      stopped = true;
      controller.abort();
    }
  };

  while (!stopped) {
    const { value, done } = await reader.read();
    const text = decoder.decode(value || new Uint8Array(), { stream: !done });
    raw += text;
    buffer += text;
    let boundary;
    while (!stopped && (boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const eventText = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, '');
      await processEvent(eventText);
    }
    if (done) break;
  }
  if (!stopped && buffer.trim()) await processEvent(buffer);
  if (!content && raw.trim() && !raw.includes('data:')) {
    try {
      const data = JSON.parse(raw);
      content = String(extractContent(data) || '');
      if (content) await onToken?.(content);
    } catch {
    }
  }
  return { content, stopped };
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
    const wait = Math.max(0, globalBlockedUntil - Date.now());
    if (wait > 0) {
      scheduleDrain(wait);
      return;
    }
    const job = queue.shift();
    activeJobs += 1;
    Promise.resolve(job.task())
      .then(job.resolve, job.reject)
      .finally(() => {
        activeJobs -= 1;
        drainQueue();
      });
  }
}

export function enqueueAiRequest(task) {
  const result = new Promise((resolve, reject) => queue.push({ task, resolve, reject }));
  drainQueue();
  return result;
}

async function acquireKey() {
  let selected;
  while (!selected) {
    const now = Date.now();
    const available = keyPool.filter(key => key.inFlight === 0 && key.blockedUntil <= now);
    if (available.length) {
      selected = available[0];
      selected.inFlight += 1;
      break;
    }
    const nextAvailable = Math.min(...keyPool.map(key => key.blockedUntil));
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

function isProviderKeyError(error) {
  return error?.providerStatus === 401 || error?.providerStatus === 403;
}

function isProviderRateLimitError(error) {
  return error?.providerStatus === 429;
}

async function withProviderKey(task) {
  const maxAttempts = keyPool.length || 1;
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const key = await acquireKey();
    let failure;
    try {
      return await task(key);
    } catch (error) {
      failure = error;
      lastError = error;
      const canFailover = isProviderKeyError(error) || isProviderRateLimitError(error);
      if (!canFailover || attempt === maxAttempts - 1) {
        if (isProviderKeyError(error)) {
          error.code = 'AI_PROVIDER_AUTH';
          error.message = 'مفاتيح مزود الذكاء الاصطناعي غير مقبولة';
        }
        throw error;
      }
      if (isProviderKeyError(error)) key.blockedUntil = Math.max(key.blockedUntil, Date.now() + invalidKeyCooldownMs);
    } finally {
      releaseKey(key, failure);
    }
  }
  throw lastError;
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

  const result = await enqueueAiRequest(() => withProviderKey(async key => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
    try {
      const response = await fetch(resolveAiChatUrl(url), {
        method: 'POST',
        headers: createProviderHeaders({ url, token: key?.token || token }),
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
        error.code = response.status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : undefined;
        error.providerStatus = response.status;
        error.retryAfter = Number(response.headers.get('retry-after')) || undefined;
        throw error;
      }
      const content = extractContent(data);
      if (!content) throw Object.assign(new Error('رد مزود الذكاء الاصطناعي غير صالح'), { status: 502 });
      return String(content);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw Object.assign(new Error('مساعد الذكاء الاصطناعي استغرق وقتاً طويلاً؛ حاول مرة أخرى'), { status: 504 });
      }
      if (error.status) throw error;
      throw Object.assign(new Error('تعذر الوصول إلى مزود الذكاء الاصطناعي حالياً'), { status: 502, cause: error });
    } finally {
      clearTimeout(timeout);
    }
  }));

  cacheSet(cacheKey, result);
  return { content: result, cached: false };
}

export async function streamAiProvider({ url, token, model, messages, festivalContext, onToken, signal }) {
  const cacheKey = getAiCacheKey({ model, messages, festivalContext });
  const cached = cacheGet(cacheKey);
  if (cached) {
    const stopped = await onToken?.(cached) === false;
    return { content: cached, cached: true, stopped };
  }

  const result = await enqueueAiRequest(() => withProviderKey(async key => {
    const provider = createProviderController(signal);
    const timeout = setTimeout(() => provider.controller.abort(), providerTimeoutMs);
    try {
      const response = await fetch(resolveAiChatUrl(url), {
        method: 'POST',
        headers: createProviderHeaders({ url, token: key?.token || token, stream: true }),
        signal: provider.controller.signal,
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: Math.max(64, Number(process.env.AI_MAX_OUTPUT_TOKENS) || 350),
          stream: true,
        }),
      });
      if (!response.ok) {
        const error = new Error(response.status === 429
          ? 'مزود الذكاء الاصطناعي وصل للحد المؤقت'
          : 'تعذر الاتصال بمزود الذكاء الاصطناعي');
        error.status = response.status === 429 ? 429 : 502;
        error.code = response.status === 429 ? 'AI_PROVIDER_RATE_LIMITED' : undefined;
        error.providerStatus = response.status;
        error.retryAfter = Number(response.headers.get('retry-after')) || undefined;
        throw error;
      }
      const streamed = await consumeProviderStream(response.body, onToken, provider.controller);
      if (!streamed.stopped && !streamed.content) throw Object.assign(new Error('رد مزود الذكاء الاصطناعي غير صالح'), { status: 502 });
      return streamed;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw Object.assign(new Error('مساعد الذكاء الاصطناعي استغرق وقتاً طويلاً؛ حاول مرة أخرى'), { status: 504 });
      }
      if (error.status) throw error;
      throw Object.assign(new Error('تعذر الوصول إلى مزود الذكاء الاصطناعي حالياً'), { status: 502, cause: error });
    } finally {
      clearTimeout(timeout);
      provider.cleanup();
    }
  }));

  if (!result.stopped && result.content) cacheSet(cacheKey, result.content);
  return { content: result.content, cached: false, stopped: result.stopped };
}

export function getAiGatewayStats() {
  return {
    keys: keyPool.length,
    queued: queue.length,
    active: activeJobs,
    maxConcurrency,
    providerBlockedUntil: globalBlockedUntil,
    providerTimeoutMs,
  };
}
