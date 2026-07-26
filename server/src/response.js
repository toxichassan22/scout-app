export function success(res, payload, status = 200) {
  if (Array.isArray(payload)) {
    return res.status(status).json({ success: true, data: payload, requestId: res.req.requestId, timestamp: new Date().toISOString() });
  }
  if (payload && typeof payload === 'object') {
    return res.status(status).json({ success: true, ...payload, requestId: res.req.requestId, timestamp: new Date().toISOString() });
  }
  return res.status(status).json({ success: true, data: payload, requestId: res.req.requestId, timestamp: new Date().toISOString() });
}

export function created(res, payload) {
  return success(res, payload, 201);
}

export function paginated(res, { data, page, limit, total }) {
  return res.status(200).json({
    success: true,
    data,
    meta: { page, limit, total },
    requestId: res.req.requestId,
    timestamp: new Date().toISOString(),
  });
}

export function error(res, message, status = 500, extra = {}) {
  return res.status(status).json({
    success: false,
    error: message,
    ...extra,
    requestId: res.req.requestId,
    timestamp: new Date().toISOString(),
  });
}
