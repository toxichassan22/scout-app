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

function readEnvValue(lines, key) {
    return lines.find(l => l.startsWith(`${key}=`))?.slice(key.length + 1)?.trim() || '';
}

function normalizeTokenPool(value) {
    return String(value || '')
        .split(/[\s,]+/)
        .map(token => token.trim())
        .filter(Boolean)
        .join(',');
}

function isEnvBoundary(line) {
    const value = line.trim();
    return !value || value.startsWith('#') || /^[A-Z_][A-Z0-9_]*=/.test(value);
}

function readTokenPoolValue(lines) {
    const index = lines.findIndex(line => line.startsWith('AI_CHAT_TOKEN_POOL='));
    if (index < 0) return '';
    const values = [lines[index].slice('AI_CHAT_TOKEN_POOL='.length).trim()];
    for (let cursor = index + 1; cursor < lines.length && !isEnvBoundary(lines[cursor]); cursor += 1) {
        values.push(lines[cursor].trim());
    }
    return values.join('\n');
}

function upsertTokenPool(lines, value) {
    const line = `AI_CHAT_TOKEN_POOL=${value}`;
    const index = lines.findIndex(entry => entry.startsWith('AI_CHAT_TOKEN_POOL='));
    if (index < 0) {
        lines.push(line);
        return;
    }
    lines[index] = line;
    while (index + 1 < lines.length && !isEnvBoundary(lines[index + 1])) lines.splice(index + 1, 1);
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

// AI chat credentials. The deploy pipeline may supply these from repository
// secrets; when it does not, whatever is already deployed is preserved so a
// normal deploy never wipes a working token. The token is never logged.
const aiChatUrl = process.env.AI_CHAT_URL
    || readEnvValue(lines, 'AI_CHAT_URL')
    || 'https://opencode.ai/zen/v1';
const aiChatModel = process.env.AI_CHAT_MODEL
    || readEnvValue(lines, 'AI_CHAT_MODEL')
    || 'mimo-v2.5-free';
const aiChatToken = process.env.AI_CHAT_TOKEN || readEnvValue(lines, 'AI_CHAT_TOKEN');
const aiChatTokenPool = normalizeTokenPool(process.env.AI_CHAT_TOKEN_POOL || readTokenPoolValue(lines));

upsertEnv(lines, 'AI_CHAT_URL', aiChatUrl, 'OpenAI-compatible base URL; chat returns 503 while the token is empty.');
upsertEnv(lines, 'AI_CHAT_MODEL', aiChatModel);
upsertEnv(lines, 'AI_CHAT_TOKEN', aiChatToken);
upsertTokenPool(lines, aiChatTokenPool);

// Non-secret AI pool controls can be changed as repository variables without
// touching the server manually. Empty pipeline values preserve deployed settings.
const AI_CONFIG_KEYS = [
    'AI_POOL_CONCURRENCY',
    'AI_PROVIDER_TIMEOUT_MS',
    'AI_MAX_OUTPUT_TOKENS',
    'AI_RESPONSE_CACHE_TTL_MS',
    'AI_CONTEXT_TTL_MS',
];
for (const key of AI_CONFIG_KEYS) {
    const value = process.env[key] || readEnvValue(lines, key);
    if (value) upsertEnv(lines, key, value);
}

console.log(aiChatToken || aiChatTokenPool
    ? `[ensure-env] AI chat configured (model ${aiChatModel}, keys ${aiChatTokenPool ? aiChatTokenPool.split(/[\s,]+/).filter(Boolean).length : 1}).`
    : '[ensure-env] AI chat token missing; the assistant will report that it is not enabled.');

// Off-box backup credentials. Same rule as the chat token: a deploy that does not
// supply them keeps whatever is already on the server, so backups never silently
// switch off after a routine deploy. No secret is logged.
// GitHub refuses to store any secret or variable whose name begins with GITHUB_,
// and its UI drops such a name silently, so the pipeline supplies these under an
// unreserved alias which is translated to the key the application reads.
const BACKUP_KEYS = [
    ['GITHUB_BACKUP_REPO', 'BACKUP_REPO'],
    ['GITHUB_BACKUP_TOKEN', 'BACKUP_REPO_TOKEN'],
    ['GITHUB_BACKUP_BRANCH', 'BACKUP_REPO_BRANCH'],
    ['GITHUB_BACKUP_PATH', 'BACKUP_REPO_PATH'],
    ['GITHUB_BACKUP_ENCRYPTION_KEY', 'BACKUP_ENCRYPTION_KEY'],
    ['GDRIVE_WEBHOOK_URL', 'GDRIVE_WEBHOOK_URL'],
    ['GDRIVE_WEBHOOK_BEARER_TOKEN', 'GDRIVE_WEBHOOK_BEARER_TOKEN'],
    ['GDRIVE_WEBHOOK_SIGNING_SECRET', 'GDRIVE_WEBHOOK_SIGNING_SECRET'],
];
for (const [key, alias] of BACKUP_KEYS) {
    const value = process.env[alias] || process.env[key] || readEnvValue(lines, key);
    if (value) upsertEnv(lines, key, value);
}

const githubBackupReady = Boolean(readEnvValue(lines, 'GITHUB_BACKUP_REPO') && readEnvValue(lines, 'GITHUB_BACKUP_TOKEN'));
const driveBackupReady = Boolean(readEnvValue(lines, 'GDRIVE_WEBHOOK_URL'));
console.log(`[ensure-env] off-box backups — private repo: ${githubBackupReady ? 'configured' : 'MISSING'}, google drive: ${driveBackupReady ? 'configured' : 'MISSING'}`);

if (!githubBackupReady) {
    // Name what is absent, so a wrong or missing repository setting is obvious from
    // the deploy log instead of requiring a look at the server.
    const absent = BACKUP_KEYS
        .filter(([key]) => key.startsWith('GITHUB_BACKUP_') && !readEnvValue(lines, key))
        .map(([, alias]) => alias);
    console.warn('[ensure-env] WARNING: no private repo backup configured; finalised scores exist only on this server.');
    console.warn(`[ensure-env] not supplied: ${absent.join(', ')} — add them as repository secrets or variables.`);
} else if (!readEnvValue(lines, 'GITHUB_BACKUP_ENCRYPTION_KEY')) {
    // This script always writes NODE_ENV=production, so the server always ends up in
    // the mode where syncGithubBackup refuses to run without an encryption key. The
    // check must not read process.env.NODE_ENV: this runs over SSH where it is unset,
    // which is how the condition silently never fired.
    console.warn('[ensure-env] WARNING: BACKUP_ENCRYPTION_KEY is missing; the repo looks configured but every backup will refuse to run.');
}

writeEnvLines(lines);
