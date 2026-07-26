import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(serverRoot, '.env');

const PLACEHOLDER_SECRETS = new Set([
    'digital_scout_camp_secret_key_2026',
    'your_super_secret_jwt_key_here',
    'change-me',
    'secret',
]);

function isWeakJwtSecret(value) {
    return value.length < 32
        || PLACEHOLDER_SECRETS.has(value.toLowerCase())
        || new RegExp('^(.)\\1+$').test(value);
}

function generateJwtSecret() {
    return crypto.randomBytes(48).toString('hex');
}

function readEnvLines() {
    try {
        return fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    } catch {
        return [];
    }
}

function writeEnvLines(lines) {
    fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

function upsertEnv(lines, key, value, comment = null) {
    const prefix = comment ? `# ${comment}` : null;
    const line = `${key}=${value}`;
    const index = lines.findIndex(l => l.startsWith(`${key}=`));
    if (index >= 0) {
        lines[index] = line;
    } else {
        if (prefix) lines.push(prefix);
        lines.push(line);
    }
}

const lines = readEnvLines();

let jwtSecret = lines.find(l => l.startsWith('JWT_SECRET='))?.slice('JWT_SECRET='.length)?.trim() || '';
if (jwtSecret.length === 0 || isWeakJwtSecret(jwtSecret)) {
    jwtSecret = generateJwtSecret();
    upsertEnv(lines, 'JWT_SECRET', jwtSecret, 'Generated automatically; set a fixed value in production for consistency across restarts.');
    console.log(`[ensure-env] Generated JWT_SECRET and persisted to ${envPath}`);
} else {
    console.log('[ensure-env] JWT_SECRET already set.');
}

upsertEnv(lines, 'NODE_ENV', 'production');
upsertEnv(lines, 'PORT', '5000');

const dbPath = process.env.SQLITE_DATABASE_PATH
    || '/var/www/scout-app/server/prisma/dev.db';
const dbUrl = process.env.DATABASE_URL
    || `file:${dbPath}`;

upsertEnv(lines, 'DATABASE_URL', dbUrl);
upsertEnv(lines, 'SQLITE_DATABASE_PATH', dbPath);

const PUBLIC_DOMAIN = process.env.SCOUT_PUBLIC_DOMAIN || 'manshya-festival-30.cfd';
const DEFAULT_ORIGINS = [
    `https://${PUBLIC_DOMAIN}`,
    `https://www.${PUBLIC_DOMAIN}`,
    `http://${PUBLIC_DOMAIN}`,
    `http://www.${PUBLIC_DOMAIN}`,
].join(',');

const existingOrigins = lines.find(l => l.startsWith('CORS_ORIGINS='))?.slice('CORS_ORIGINS='.length)?.trim() || '';
const corsOrigins = process.env.CORS_ORIGINS || existingOrigins || DEFAULT_ORIGINS;
upsertEnv(lines, 'CORS_ORIGINS', corsOrigins, 'Explicit production allowlist; startup is refused when this is empty.');
upsertEnv(lines, 'FRONTEND_URL', `https://${PUBLIC_DOMAIN}`);

// Nginx is the only hop in front of the backend, so trust exactly one proxy for correct client IPs.
upsertEnv(lines, 'TRUST_PROXY', process.env.TRUST_PROXY || '1');

console.log(`[ensure-env] CORS_ORIGINS set to ${corsOrigins}`);

writeEnvLines(lines);
