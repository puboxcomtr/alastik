
const FULLY_MASKED_KEYS = new Set([
    'cvc', 'cvcnumber', 'cvv', 'cvv2', 'securitycode', 'guvenlikkodu',
    'password', 'sifre', 'pwd', 'secret', 'apikey', 'api_key',
    'authinfo', 'authorization', 'token', 'accesstoken'
]);

const CARD_NUMBER_KEYS = new Set([
    'cardnumber', 'pan', 'cardno', 'kartno', 'creditcardnumber', 'card_number'
]);

const MAX_DEPTH = 8;

const maskCardNumber = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length >= 4 ? `**** **** **** ${digits.slice(-4)}` : '****';
};

const redact = (value, depth = 0) => {
    if (value === null || typeof value !== 'object' || depth > MAX_DEPTH) return value;
    if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

    const output = {};
    for (const [key, inner] of Object.entries(value)) {
        const normalized = key.toLowerCase();
        if (FULLY_MASKED_KEYS.has(normalized)) output[key] = '***';
        else if (CARD_NUMBER_KEYS.has(normalized)) output[key] = maskCardNumber(inner);
        else output[key] = redact(inner, depth + 1);
    }
    return output;
};

module.exports = { redact, maskCardNumber };
