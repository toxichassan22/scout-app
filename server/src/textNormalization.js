const ARABIC_INDIC_ZERO = '٠'.charCodeAt(0);
const EASTERN_ARABIC_ZERO = '۰'.charCodeAt(0);

export function normalizeArabicText(value) {
    if (value === null || value === undefined) return '';

    return String(value)
        .trim()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - ARABIC_INDIC_ZERO))
        .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - EASTERN_ARABIC_ZERO))
        .replace(/\s+/g, ' ')
        .toLowerCase();
}
