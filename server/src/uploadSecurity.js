import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 8 * 1024 * 1024;
export const UPLOAD_TYPES = Object.freeze({
    '.pdf': ['application/pdf'],
    '.txt': ['text/plain'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
    '.mp4': ['video/mp4'],
    '.zip': ['application/zip', 'application/x-zip-compressed'],
});

const MAGIC = {
    '.pdf': buffer => buffer.subarray(0, 5).toString() === '%PDF-',
    '.png': buffer => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    '.jpg': buffer => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    '.jpeg': buffer => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    '.zip': buffer => buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    '.mp4': buffer => buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp',
    '.txt': () => true,
};

export function validateBase64Upload(fileBase64, fileName, declaredMime) {
    if (typeof fileBase64 !== 'string' || fileBase64.length === 0 || fileBase64.length > Math.ceil(MAX_UPLOAD_BYTES * 4 / 3) + 2048) throw new Error('ملف base64 غير صالح أو أكبر من الحد المسموح');
    const dataUrl = fileBase64.match(/^data:([^;,\s]+);base64,([A-Za-z0-9+/\s]+)$/);
    const mime = dataUrl?.[1] || declaredMime || '';
    const raw = dataUrl?.[2] || fileBase64;
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(raw) || raw.length % 4 !== 0) throw new Error('ملف base64 تالف');

    const ext = path.extname(String(fileName || '')).toLowerCase();
    if (!UPLOAD_TYPES[ext]) throw new Error('امتداد الملف غير مسموح');
    if (!UPLOAD_TYPES[ext].includes(mime)) throw new Error('نوع الملف لا يطابق امتداده');
    const buffer = Buffer.from(raw, 'base64');
    if (!buffer.length || buffer.length > MAX_UPLOAD_BYTES) throw new Error('حجم الملف غير مسموح');
    if (!MAGIC[ext](buffer)) throw new Error('محتوى الملف لا يطابق نوعه');
    return { buffer, mime, ext };
}

export function safeStoredName(fileName, ext) {
    const original = path.basename(String(fileName || 'report'));
    const base = path.basename(original, path.extname(original))
        .normalize('NFKC').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_').slice(0, 80) || 'report';
    return `${Date.now()}-${crypto.randomUUID()}-${base}${ext}`;
}

export function isSafeUploadName(name) {
    return typeof name === 'string' && path.basename(name) === name && !name.includes('..') && /^[a-zA-Z0-9._\-\u0600-\u06FF]+$/.test(name);
}
