export function boundedString(value, name, { min = 0, max = 1000, trim = true } = {}) {
    if (typeof value !== 'string') throw Object.assign(new Error(`${name} مطلوب`), { status: 400 });
    const result = trim ? value.trim() : value;
    if (result.length < min || result.length > max) throw Object.assign(new Error(`${name} يجب أن يكون بين ${min} و${max} حرفاً`), { status: 400 });
    return result;
}

export function finiteNumber(value, name, { min = -Number.MAX_VALUE, max = Number.MAX_VALUE, integer = false } = {}) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
        throw Object.assign(new Error(`${name} غير صالح`), { status: 400 });
    }
    return number;
}

export function enumValue(value, name, allowed) {
    if (!allowed.includes(value)) throw Object.assign(new Error(`${name} غير صالح`), { status: 400 });
    return value;
}

export function strongPassword(value, name = 'password') {
    return boundedString(value, name, { min: 6, max: 256, trim: false });
}

export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
