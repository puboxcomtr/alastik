/**
 * Log güvenliği — ödeme isteklerinde kart ve kimlik bilgileri log'a DÜZ METİN YAZILAMAZ.
 *
 * Bu yardımcı, loglanacak nesnenin maskelenmiş bir kopyasını üretir:
 *   - Kart numarası yalnız son 4 hanesiyle görünür (PAN asla tam yazılmaz)
 *   - CVC, şifre, API anahtarı ve üye işyeri kimlik bilgileri hiç yazılmaz
 * Ödeme servislerinde JSON.stringify(request) yerine JSON.stringify(redact(request)) kullanılır.
 */

// Log'a hiçbir koşulda yazılmayacak alanlar (küçük harfe çevrilmiş adlarla karşılaştırılır)
const FULLY_MASKED_KEYS = new Set([
    'cvc', 'cvcnumber', 'cvv', 'cvv2', 'securitycode', 'guvenlikkodu',
    'password', 'sifre', 'pwd', 'secret', 'apikey', 'api_key',
    'authinfo', 'authorization', 'token', 'accesstoken'
]);

// Yalnız son 4 hanesi yazılacak kart numarası alanları
const CARD_NUMBER_KEYS = new Set([
    'cardnumber', 'pan', 'cardno', 'kartno', 'creditcardnumber', 'card_number'
]);

const MAX_DEPTH = 8;

/** Kart numarasını son 4 hane dışında maskeler */
const maskCardNumber = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length >= 4 ? `**** **** **** ${digits.slice(-4)}` : '****';
};

/** Hassas alanları maskelenmiş derin kopya döner; nesne değilse değeri aynen verir */
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
