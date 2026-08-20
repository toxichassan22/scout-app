import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024 * 1024;
const configuredMaxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES);
export const MAX_UPLOAD_BYTES = Number.isFinite(configuredMaxUploadBytes) && configuredMaxUploadBytes > 0
    ? Math.max(configuredMaxUploadBytes, DEFAULT_MAX_UPLOAD_BYTES)
    : DEFAULT_MAX_UPLOAD_BYTES;
export const UPLOAD_TYPES = Object.freeze({
    '.pdf': [
        'application/pdf',
        'application/x-pdf',
        'application/acrobat',
        'applications/vnd.pdf',
        'text/pdf',
        'text/x-pdf',
        'application/octet-stream',
    ],
    '.pptx': [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
        'application/vnd.ms-powerpoint.presentation.macroenabled.12',
        'application/vnd.ms-powerpoint',
        'application/x-mspowerpoint',
        'application/mspowerpoint',
        'application/powerpoint',
        'application/x-powerpoint',
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed',
        'application/octet-stream',
    ],
    '.ppt': [
        'application/vnd.ms-powerpoint',
        'application/mspowerpoint',
        'application/x-mspowerpoint',
        'application/powerpoint',
        'application/x-powerpoint',
        'application/x-ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/octet-stream',
    ],
    '.docx': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
        'application/vnd.ms-word',
        'application/zip',
        'application/x-zip',
        'application/x-zip-compressed',
        'application/octet-stream',
    ],
    '.doc': [
        'application/msword',
        'application/doc',
        'application/vnd.msword',
        'application/vnd.ms-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/octet-stream',
    ],
});

const isZip = buffer => buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && (
    (buffer[2] === 0x03 && buffer[3] === 0x04) ||
    (buffer[2] === 0x05 && buffer[3] === 0x06) ||
    (buffer[2] === 0x07 && buffer[3] === 0x08)
);

const isOle2 = buffer => buffer.length >= 8 &&
    buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 && buffer[5] === 0xb1 && buffer[6] === 0x1a && buffer[7] === 0xe1;

const isPdf = buffer => buffer.length >= 4 && buffer.subarray(0, 4).toString() === '%PDF';

const MAGIC = {
    '.pdf': isPdf,
    '.pptx': isZip,
    '.docx': isZip,
    '.ppt': buffer => isOle2(buffer) || isZip(buffer),
    '.doc': buffer => isOle2(buffer) || isZip(buffer),
};

export function createValidationError(message) {
    const err = new Error(message);
    err.status = 400;
    err.statusCode = 400;
    return err;
}

export function isMimeAllowedForExt(ext, mimeType) {
    const allowed = UPLOAD_TYPES[ext];
    if (!allowed) return false;
    const normalized = String(mimeType || '').trim().toLowerCase();
    if (!normalized || normalized === 'application/octet-stream' || normalized === 'application/download' || normalized === 'binary/octet-stream') {
        return true;
    }
    return allowed.includes(normalized);
}

export function validateBase64Upload(fileBase64, fileName, declaredMime) {
    if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 2048) {
        throw createValidationError('ملف base64 غير صالح أو أكبر من الحد المسموح');
    }
    const dataUrlMatch = fileBase64.match(/^data:([^;,\s]+);base64,(.*)$/s);
    const mime = dataUrlMatch?.[1] || declaredMime || '';
    const rawInput = dataUrlMatch?.[2] || fileBase64;
    const raw = rawInput.replace(/[\r\n\s]/g, '').replace(/-/g, '+').replace(/_/g, '/');

    if (!raw) throw createValidationError('ملف base64 تالف');

    const ext = path.extname(String(fileName || '')).toLowerCase();
    if (!UPLOAD_TYPES[ext]) throw createValidationError(`امتداد الملف (${ext || 'بدون امتداد'}) غير مسموح`);
    if (mime && !isMimeAllowedForExt(ext, mime)) throw createValidationError('نوع الملف لا يطابق امتداده');

    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw createValidationError('حجم الملف غير مسموح');
    if (MAGIC[ext] && !MAGIC[ext](buffer)) throw createValidationError('محتوى الملف لا يطابق نوعه (تأكد من اختيار ملف صحيح)');
    return { buffer, mime: UPLOAD_TYPES[ext]?.[0] || mime || 'application/octet-stream', ext };
}

export function safeStoredName(fileName, ext) {
    const original = path.basename(String(fileName || 'report'));
    const base = path.basename(original, path.extname(original))
        .normalize('NFKC').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_').slice(0, 80) || 'report';
    return `${Date.now()}-${crypto.randomUUID()}-${base}${ext}`;
}

const safeDriveNamePart = (value, fallback) => String(value || fallback)
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 80) || fallback;

export function safeDriveFileName(competitionName, originalName, storedName) {
    const stored = path.basename(String(storedName || originalName || 'report.txt'));
    const original = path.basename(String(originalName || stored));
    const ext = path.extname(stored).toLowerCase() || path.extname(original).toLowerCase() || '.txt';
    const originalBase = path.basename(original, path.extname(original));
    const uniqueBase = path.basename(stored, path.extname(stored));
    const readableBase = originalBase === uniqueBase ? 'report' : originalBase;
    return `${safeDriveNamePart(competitionName, 'مسابقة')} - ${safeDriveNamePart(readableBase, 'report')} - ${safeDriveNamePart(uniqueBase, 'report')}${ext}`;
}

export function safeDriveTeamName(team) {
    return String(team?.label || team?.username || team?.id || 'فريق').replace(/[/\\?%*:|"<>]/g, '_');
}

export function reportDriveFolderPath(team) {
    return `الفرق_الكشفية/${safeDriveTeamName(team)}/التقارير_المرفوعة`;
}

export function safeDriveReportFileName(competitionName, reportId, storedName) {
    const stored = path.basename(String(storedName || 'report.txt'));
    const ext = path.extname(stored).toLowerCase() || '.txt';
    return `${safeDriveNamePart(competitionName, 'مسابقة')} - report-${safeDriveNamePart(reportId, 'unknown')}${ext}`;
}

export function getReportDriveLocations({ team, competitionName, report }) {
    const storedName = path.basename(String(report?.fileUrl || report?.fileName || 'report.txt'));
    const originalName = path.basename(String(report?.fileName || storedName));
    const folderPath = reportDriveFolderPath(team);
    const legacyTeamName = `Team_${String(team?.username || 'team')}_${String(team?.label || team?.username || 'فريق').replace(/[/\\?%*:|"<>]/g, '_')}`;
    const locations = [
        { fileName: safeDriveReportFileName(competitionName, report?.id, storedName), folderPath },
        { fileName: safeDriveFileName(competitionName, originalName, storedName), folderPath },
        { fileName: `${String(report?.title || 'تقرير').replace(/[/\\?%*:|"<>]/g, '_')}_${storedName}`, folderPath },
        { fileName: storedName, folderPath: `03_TEAMS_DATA/${legacyTeamName}/reports` },
    ];
    return [...new Map(locations.map(location => [`${location.folderPath}/${location.fileName}`, location])).values()];
}

export async function validateFileUpload(filePath, fileName, mimeType) {
    const ext = path.extname(String(fileName || '')).toLowerCase();
    if (!UPLOAD_TYPES[ext]) throw createValidationError(`امتداد الملف (${ext || 'بدون امتداد'}) غير مسموح`);
    if (mimeType && !isMimeAllowedForExt(ext, mimeType)) throw createValidationError('نوع الملف لا يطابق امتداده');
    const stats = await fs.stat(filePath);
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_UPLOAD_BYTES) throw createValidationError('الملف فارغ أو أكبر من الحد المسموح');
    const handle = await fs.open(filePath, 'r');
    try {
        const header = Buffer.alloc(16);
        await handle.read(header, 0, header.length, 0);
        if (MAGIC[ext] && !MAGIC[ext](header)) throw createValidationError('محتوى الملف لا يطابق نوعه (تأكد من اختيار ملف صحيح)');
    } finally {
        await handle.close();
    }
    return { mime: mimeType || UPLOAD_TYPES[ext]?.[0] || 'application/octet-stream', ext, size: stats.size };
}

export function validateBufferUpload(buffer, fileName, mimeType) {
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw createValidationError('الملف فارغ أو أكبر من الحد المسموح');
    const ext = path.extname(String(fileName || '')).toLowerCase();
    if (!UPLOAD_TYPES[ext]) throw createValidationError(`امتداد الملف (${ext || 'بدون امتداد'}) غير مسموح`);
    if (mimeType && !isMimeAllowedForExt(ext, mimeType)) throw createValidationError('نوع الملف لا يطابق امتداده');
    if (MAGIC[ext] && !MAGIC[ext](buffer)) throw createValidationError('محتوى الملف لا يطابق نوعه (تأكد من اختيار ملف صحيح)');
    return { buffer, mime: mimeType || UPLOAD_TYPES[ext]?.[0] || 'application/octet-stream', ext };
}

export function isSafeUploadName(name) {
    return typeof name === 'string' && path.basename(name) === name && !name.includes('..') && /^[a-zA-Z0-9._\-\u0600-\u06FF]+$/.test(name);
}
