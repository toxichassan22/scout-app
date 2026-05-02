const sanitizeBaseUrl = (url) => {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
};

const buildHeaders = (token, { json = false } = {}) => {
  const headers = { 'ngrok-skip-browser-warning': 'true' };
  if (json) headers['Content-Type'] = 'application/json';
  const trimmed = (token || '').trim();
  if (trimmed) headers['x-api-token'] = trimmed;
  return headers;
};

const parseError = async (response) => {
  try {
    const payload = await response.json();
    return payload?.detail || payload?.error || `${response.status} ${response.statusText}`;
  } catch {
    try {
      const text = await response.text();
      return text || `${response.status} ${response.statusText}`;
    } catch {
      return `${response.status} ${response.statusText}`;
    }
  }
};

export const isVideoApiConfigured = (settings) => Boolean(sanitizeBaseUrl(settings?.videoApiBaseUrl));

export const buildVideoUrl = (baseUrl, jobId) => {
  const url = sanitizeBaseUrl(baseUrl);
  if (!url || !jobId) return '';
  return `${url}/videos/${jobId}.mp4`;
};

export const generateVideo = async ({ baseUrl, token, prompt, teamName, numFrames }) => {
  const url = sanitizeBaseUrl(baseUrl);
  if (!url) throw new Error('لم يتم إعداد رابط خادم StreamingT2V بعد. تواصل مع الأدمن.');

  const body = {
    prompt: String(prompt || '').trim(),
    team_name: teamName || null,
  };
  if (numFrames) body.num_frames = Number(numFrames);

  const response = await fetch(`${url}/generate`, {
    method: 'POST',
    headers: buildHeaders(token, { json: true }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`تعذّر بدء توليد الفيديو: ${await parseError(response)}`);
  }
  return response.json();
};

export const fetchJobStatus = async ({ baseUrl, token, jobId }) => {
  const url = sanitizeBaseUrl(baseUrl);
  if (!url) throw new Error('لم يتم إعداد رابط خادم StreamingT2V بعد.');
  if (!jobId) throw new Error('رقم المهمة غير صالح');

  const response = await fetch(`${url}/status/${encodeURIComponent(jobId)}`, {
    headers: buildHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`تعذّر جلب حالة المهمة: ${await parseError(response)}`);
  }
  return response.json();
};

export const fetchHealth = async ({ baseUrl, token }) => {
  const url = sanitizeBaseUrl(baseUrl);
  if (!url) throw new Error('رابط الخادم فارغ');

  const response = await fetch(`${url}/`, { headers: buildHeaders(token) });
  if (!response.ok) {
    throw new Error(`فحص الحالة فشل: ${await parseError(response)}`);
  }
  return response.json();
};

export const VIDEO_JOB_STATUSES = Object.freeze({
  queued: 'queued',
  processing: 'processing',
  done: 'done',
  failed: 'failed',
});
