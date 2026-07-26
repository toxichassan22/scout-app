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
    const password = boundedString(value, name, { min: 12, max: 256, trim: false });
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw Object.assign(new Error('كلمة السر يجب أن تحتوي على حروف كبيرة وصغيرة ورقم ورمز'), { status: 400 });
    }
    return password;
}

export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
