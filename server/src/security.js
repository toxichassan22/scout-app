import crypto from 'node:crypto';

const DEVELOPMENT_SECRET = 'digital_scout_camp_local_development_only_2026';
const PLACEHOLDER_SECRETS = new Set([
    'digital_scout_camp_secret_key_2026',
    'your_super_secret_jwt_key_here',
    'change-me',
    'secret',
]);

export const isProduction = process.env.NODE_ENV === 'production';

export function getJwtSecret() {
    const configured = String(process.env.JWT_SECRET || '').trim();
    if (!isProduction) return configured || DEVELOPMENT_SECRET;

    const weak = configured.length < 32
        || PLACEHOLDER_SECRETS.has(configured.toLowerCase())
        || /^(.)\1+$/.test(configured);
    if (weak) {
        throw new Error('Startup refused: production JWT_SECRET must be a unique, non-placeholder secret of at least 32 characters.');
    }
    return configured;
}

export const JWT_SECRET = getJwtSecret();

function normalizeOrigin(value) {
    try {
        const url = new URL(value);
        return `${url.protocol}//${url.host}`;
    } catch {
        return null;
    }
}

export function getAllowedOrigins() {
    const configured = String(process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
        .split(',')
        .map(value => normalizeOrigin(value.trim()))
        .filter(Boolean);

    if (isProduction && configured.length === 0) {
        console.warn('[security] FRONTEND_URL/CORS_ORIGINS not set in production; CORS will reflect the request origin. Set an explicit allowlist for stricter security.');
    }

    return new Set(isProduction ? configured : [
        ...configured,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:7860',
    ]);
}

export function createCorsOptions() {
    const allowedOrigins = getAllowedOrigins();
    const allowAnyOrigin = allowedOrigins.size === 0;
    return {
        origin(origin, callback) {
            if (!origin || allowAnyOrigin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true);
            return callback(new Error('Origin is not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type', 'X-Device-Id'],
        maxAge: 86400,
    };
}

export function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
}

const stores = new Set();

export function createMemoryRateLimiter({ windowMs, max, keyGenerator, message = 'Too many requests; please try again later.' }) {
    const hits = new Map();
    stores.add(hits);
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, value] of hits) if (value.resetAt <= now) hits.delete(key);
    }, Math.min(windowMs, 60_000));
    timer.unref?.();

    return (req, res, next) => {
        const key = String(keyGenerator?.(req) || req.ip || req.socket?.remoteAddress || 'unknown');
        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) entry = { count: 0, resetAt: now + windowMs };
        entry.count += 1;
        hits.set(key, entry);
        const remaining = Math.max(0, max - entry.count);
        res.setHeader('RateLimit-Limit', String(max));
        res.setHeader('RateLimit-Remaining', String(remaining));
        res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
        if (entry.count > max) {
            res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ error: message });
        }
        next();
    };
}

export function requestId(req, res, next) {
    req.requestId = crypto.randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
}
